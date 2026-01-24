import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getGeneralSettings,
  updateGeneralSettings,
  getAddressSettings,
  updateAddressSettings
} from '$lib/server/db/site-settings';
import { createActivityLog } from '$lib/server/db/activity-logs';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  try {
    const [general, address] = await Promise.all([
      getGeneralSettings(db, siteId),
      getAddressSettings(db, siteId)
    ]);

    return {
      settings: {
        general,
        address
      }
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    throw error;
  }
};

export const actions: Actions = {
  updateGeneral: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const userId = locals.currentUser?.id;

    if (!userId) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      const formData = await request.formData();
      const generalSettings = {
        storeName: formData.get('storeName')?.toString() || '',
        tagline: formData.get('tagline')?.toString() || '',
        description: formData.get('description')?.toString() || '',
        storeEmail: formData.get('storeEmail')?.toString() || '',
        supportEmail: formData.get('supportEmail')?.toString() || '',
        contactPhone: formData.get('contactPhone')?.toString() || '',
        currency: formData.get('currency')?.toString() || 'USD',
        timezone: formData.get('timezone')?.toString() || 'UTC',
        dateFormat: formData.get('dateFormat')?.toString() || 'MM/DD/YYYY',
        timeFormat: formData.get('timeFormat')?.toString() || '12h',
        weightUnit: formData.get('weightUnit')?.toString() || 'lb',
        dimensionUnit: formData.get('dimensionUnit')?.toString() || 'in'
      };

      const addressSettings = {
        street: formData.get('street')?.toString() || '',
        city: formData.get('city')?.toString() || '',
        state: formData.get('state')?.toString() || '',
        postcode: formData.get('postcode')?.toString() || '',
        country: formData.get('country')?.toString() || '',
        geolocationEnabled: formData.get('geolocationEnabled') === 'on'
      };

      await updateGeneralSettings(db, siteId, generalSettings);
      await updateAddressSettings(db, siteId, addressSettings);

      // Log activity
      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated general settings',
        description: `Changed site title to "${generalSettings.storeName}" and updated address`,
        entity_type: 'settings',
        entity_id: 'general',
        severity: 'info'
      });

      return { success: true, message: 'General settings updated successfully' };
    } catch (error) {
      console.error('Failed to update general settings:', error);
      return fail(500, { error: 'Failed to update settings' });
    }
  },

  updateAddress: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const userId = locals.currentUser?.id;

    if (!userId) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      const formData = await request.formData();
      const settings = {
        street: formData.get('street')?.toString() || '',
        city: formData.get('city')?.toString() || '',
        state: formData.get('state')?.toString() || '',
        postcode: formData.get('postcode')?.toString() || '',
        country: formData.get('country')?.toString() || 'US',
        geolocationEnabled: formData.get('geolocationEnabled') === 'true'
      };

      await updateAddressSettings(db, siteId, settings);

      // Log activity
      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated address settings',
        description: `Changed store address to "${settings.street}, ${settings.city}"`,
        entity_type: 'settings',
        entity_id: 'address',
        severity: 'info'
      });

      return { success: true, message: 'Address settings updated successfully' };
    } catch (error) {
      console.error('Failed to update address settings:', error);
      return fail(500, { error: 'Failed to update settings' });
    }
  }
};
