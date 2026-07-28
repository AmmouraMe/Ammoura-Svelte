import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getLanguageSettings, updateLanguageSettings } from '$lib/server/db/site-settings';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { SUPPORTED_LOCALES, isSupportedLocale } from '$lib/i18n';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  try {
    const settings = await getLanguageSettings(db, siteId);
    return {
      settings,
      availableLocales: SUPPORTED_LOCALES.map((l) => ({ ...l }))
    };
  } catch (error) {
    console.error('Failed to load language settings:', error);
    throw error;
  }
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const userId = locals.currentUser?.id;

    if (!userId) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      const formData = await request.formData();

      const defaultLocale = formData.get('defaultLocale')?.toString() || 'en';
      if (!isSupportedLocale(defaultLocale)) {
        return fail(400, { error: 'Unsupported default language' });
      }

      const enabledLocales = SUPPORTED_LOCALES.map((l) => l.code).filter(
        (code) => formData.get(`enabled_${code}`) === 'on'
      );

      await updateLanguageSettings(db, siteId, { defaultLocale, enabledLocales });

      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated language settings',
        description: `Default ${defaultLocale}; enabled: ${enabledLocales.join(', ') || defaultLocale}`,
        entity_type: 'settings',
        entity_id: 'languages',
        severity: 'info'
      });

      return { success: true, message: 'Language settings saved' };
    } catch (error) {
      console.error('Failed to update language settings:', error);
      return fail(500, { error: 'Failed to save language settings' });
    }
  }
};
