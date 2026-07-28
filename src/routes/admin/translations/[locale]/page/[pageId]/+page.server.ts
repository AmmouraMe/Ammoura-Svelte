import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getPageById } from '$lib/server/db/pages';
import { getPublishedRevision, getMostRecentDraftRevision } from '$lib/server/db/revisions';
import { resolveComponentRefs } from '$lib/server/db/components';
import { getLanguageSettings } from '$lib/server/db/site-settings';
import {
  getEntityTranslations,
  upsertEntityTranslations
} from '$lib/server/i18n/content-translations';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { extractTranslatableFields } from '$lib/i18n/translatable';
import { getLocaleInfo } from '$lib/i18n';

async function loadTranslatableFields(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<{
  page: { id: string; title: string; slug: string };
  fields: ReturnType<typeof extractTranslatableFields>;
}> {
  const page = await getPageById(db, siteId, pageId);
  if (!page) {
    throw error(404, 'Page not found');
  }

  // Translate what actually renders: the published revision (fall back to the
  // newest draft so unpublished pages can be prepared ahead of publishing).
  let revision = await getPublishedRevision(db, siteId, page.id);
  if (!revision) {
    revision = await getMostRecentDraftRevision(db, siteId, page.id);
  }
  const rawComponents = revision?.components || [];
  const components = await resolveComponentRefs(db, siteId, rawComponents);

  return {
    page: { id: page.id, title: page.title, slug: page.slug },
    fields: extractTranslatableFields(components)
  };
}

async function validateLocale(db: D1Database, siteId: string, locale: string): Promise<void> {
  const settings = await getLanguageSettings(db, siteId);
  if (locale === settings.defaultLocale || !settings.enabledLocales.includes(locale)) {
    throw redirect(303, '/admin/translations');
  }
}

export const load: PageServerLoad = async ({ platform, locals, params }) => {
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';
  await validateLocale(db, siteId, params.locale);

  const { page, fields } = await loadTranslatableFields(db, siteId, params.pageId);
  const existing = await getEntityTranslations(
    db,
    siteId,
    params.locale,
    'page_widget',
    params.pageId
  );

  return {
    page,
    locale: params.locale,
    localeName: getLocaleInfo(params.locale)?.name ?? params.locale,
    rows: fields.map((f) => ({
      field: f.field,
      label: f.label,
      source: f.source,
      value: existing.get(f.field) ?? ''
    }))
  };
};

export const actions: Actions = {
  default: async ({ request, platform, locals, params }) => {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const userId = locals.currentUser?.id;

    if (!userId) {
      return fail(401, { error: 'Unauthorized' });
    }

    await validateLocale(db, siteId, params.locale);

    try {
      const { page, fields } = await loadTranslatableFields(db, siteId, params.pageId);
      const validFields = new Set(fields.map((f) => f.field));

      const formData = await request.formData();
      const entries: Record<string, string | null> = {};
      let translated = 0;
      for (const [name, value] of formData.entries()) {
        if (!name.startsWith('t:')) continue;
        const field = name.slice(2);
        if (!validFields.has(field)) continue; // ignore stale/unknown paths
        const text = value.toString();
        entries[field] = text.trim() === '' ? null : text;
        if (text.trim() !== '') translated++;
      }

      // Prune rows whose field no longer exists on the page (orphan GC)
      const existing = await getEntityTranslations(
        db,
        siteId,
        params.locale,
        'page_widget',
        params.pageId
      );
      for (const field of existing.keys()) {
        if (!validFields.has(field) && !(field in entries)) {
          entries[field] = null;
        }
      }

      await upsertEntityTranslations(
        db,
        siteId,
        params.locale,
        'page_widget',
        params.pageId,
        entries,
        userId
      );

      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated translations',
        description: `${params.locale}: page "${page.title}" (${translated} fields)`,
        entity_type: 'translation',
        entity_id: params.pageId,
        severity: 'info'
      });

      return { success: true, message: 'Translations saved' };
    } catch (err) {
      console.error('Failed to save page translations:', err);
      return fail(500, { error: 'Failed to save translations' });
    }
  }
};
