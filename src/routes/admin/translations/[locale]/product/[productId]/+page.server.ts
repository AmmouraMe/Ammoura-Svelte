import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getProductById } from '$lib/server/db/products';
import { getLanguageSettings } from '$lib/server/db/site-settings';
import {
  getEntityTranslations,
  upsertEntityTranslations
} from '$lib/server/i18n/content-translations';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { getLocaleInfo } from '$lib/i18n';

const PRODUCT_FIELDS = [
  { field: 'name', label: 'Product name' },
  { field: 'description', label: 'Description' }
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

  const product = await getProductById(db, siteId, params.productId);
  if (!product) {
    throw error(404, 'Product not found');
  }

  const existing = await getEntityTranslations(
    db,
    siteId,
    params.locale,
    'product',
    params.productId
  );

  return {
    product: { id: product.id, name: product.name },
    locale: params.locale,
    localeName: getLocaleInfo(params.locale)?.name ?? params.locale,
    rows: PRODUCT_FIELDS.map(({ field, label }) => ({
      field,
      label,
      source: (product[field] as string) || '',
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
      const product = await getProductById(db, siteId, params.productId);
      if (!product) {
        return fail(404, { error: 'Product not found' });
      }

      const formData = await request.formData();
      const entries: Record<string, string | null> = {};
      for (const { field } of PRODUCT_FIELDS) {
        const value = formData.get(`t:${field}`);
        if (value === null) continue;
        const text = value.toString();
        entries[field] = text.trim() === '' ? null : text;
      }

      await upsertEntityTranslations(
        db,
        siteId,
        params.locale,
        'product',
        params.productId,
        entries,
        userId
      );

      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated translations',
        description: `${params.locale}: product "${product.name}"`,
        entity_type: 'translation',
        entity_id: params.productId,
        severity: 'info'
      });

      return { success: true, message: 'Translations saved' };
    } catch (err) {
      console.error('Failed to save product translations:', err);
      return fail(500, { error: 'Failed to save translations' });
    }
  }
};
