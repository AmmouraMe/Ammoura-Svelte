import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getGeneralSettings, getLanguageSettings } from '$lib/server/db/site-settings';
import {
  getEntityTranslations,
  upsertEntityTranslations
} from '$lib/server/i18n/content-translations';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { getLocaleInfo } from '$lib/i18n';

const SETTING_FIELDS = [
  { field: 'general_store_name', key: 'storeName', label: 'Store name' },
  { field: 'general_tagline', key: 'tagline', label: 'Tagline' },
  { field: 'general_description', key: 'description', label: 'Description' }
] as const;

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

  const [general, existing] = await Promise.all([
    getGeneralSettings(db, siteId),
    getEntityTranslations(db, siteId, params.locale, 'site_setting', 'general')
  ]);

  return {
    locale: params.locale,
    localeName: getLocaleInfo(params.locale)?.name ?? params.locale,
    rows: SETTING_FIELDS.map(({ field, key, label }) => ({
      field,
      label,
      source: general[key] || '',
      value: existing.get(field) ?? ''
    })).filter((row) => row.source.trim() !== '')
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
      const formData = await request.formData();
      const entries: Record<string, string | null> = {};
      for (const { field } of SETTING_FIELDS) {
        const value = formData.get(`t:${field}`);
        if (value === null) continue;
        const text = value.toString();
        entries[field] = text.trim() === '' ? null : text;
      }

      await upsertEntityTranslations(
        db,
        siteId,
        params.locale,
        'site_setting',
        'general',
        entries,
        userId
      );

      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated translations',
        description: `${params.locale}: store details`,
        entity_type: 'translation',
        entity_id: 'general',
        severity: 'info'
      });

      return { success: true, message: 'Translations saved' };
    } catch (err) {
      console.error('Failed to save settings translations:', err);
      return fail(500, { error: 'Failed to save translations' });
    }
  }
};
