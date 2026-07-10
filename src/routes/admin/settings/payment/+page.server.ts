import { error, fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getPaymentSettings, updatePaymentSettings } from '$lib/server/db/site-settings';
import { createActivityLog } from '$lib/server/db/activity-logs';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';
  const encryptionKey = platform?.env?.ENCRYPTION_KEY;

  const settings = await getPaymentSettings(db, siteId, encryptionKey);

  return {
    settings
  };
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const userId = locals.currentUser?.id;
    const encryptionKey = platform?.env?.ENCRYPTION_KEY;

    if (!userId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!encryptionKey) {
      throw error(500, 'Encryption key not configured');
    }

    try {
      const formData = await request.formData();

      const stripeEnabled = formData.get('stripeEnabled') === 'on';
      const stripeModeValue = formData.get('stripeMode')?.toString() || 'test';
      const stripeMode =
        stripeModeValue === 'test' || stripeModeValue === 'live' ? stripeModeValue : 'test';
      const stripePublicKey = formData.get('stripePublicKey')?.toString() || '';
      const stripeSecretKey = formData.get('stripeSecretKey')?.toString() || '';
      const stripeWebhookSecret = formData.get('stripeWebhookSecret')?.toString() || '';

      const paypalEnabled = formData.get('paypalEnabled') === 'on';
      const paypalModeValue = formData.get('paypalMode')?.toString() || 'sandbox';
      const paypalMode =
        paypalModeValue === 'sandbox' || paypalModeValue === 'live' ? paypalModeValue : 'sandbox';
      const paypalClientId = formData.get('paypalClientId')?.toString() || '';
      const paypalClientSecret = formData.get('paypalClientSecret')?.toString() || '';

      const testModeEnabled = formData.get('testModeEnabled') === 'on';

      // Validation
      if (stripeEnabled && (!stripePublicKey || !stripeSecretKey)) {
        return fail(400, { error: 'Stripe keys are required when Stripe is enabled' });
      }

      if (paypalEnabled && (!paypalClientId || !paypalClientSecret)) {
        return fail(400, { error: 'PayPal credentials are required when PayPal is enabled' });
      }

      await updatePaymentSettings(
        db,
        siteId,
        {
          stripeEnabled,
          stripeMode,
          stripePublicKey,
          stripeSecretKey,
          stripeWebhookSecret,
          paypalEnabled,
          paypalMode,
          paypalClientId,
          paypalClientSecret,
          testModeEnabled
        },
        encryptionKey
      );

      await createActivityLog(db, siteId, {
        user_id: userId,
        action: 'Updated payment settings',
        description: `Stripe ${stripeEnabled ? 'enabled' : 'disabled'}, PayPal ${paypalEnabled ? 'enabled' : 'disabled'}`,
        entity_type: 'settings',
        entity_id: 'payment',
        severity: 'info'
      });

      return { success: true, message: 'Payment settings updated successfully!' };
    } catch (error) {
      console.error('Failed to update payment settings:', error);
      return fail(500, { error: 'Failed to update payment settings' });
    }
  }
};
