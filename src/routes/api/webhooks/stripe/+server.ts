/**
 * Stripe webhook handler
 * POST /api/webhooks/stripe
 *
 * Each site registers this URL (on its own domain) as its Stripe webhook
 * endpoint, using its own webhook signing secret — tenant resolution
 * (locals.siteId) works the same here as for any other request on that
 * domain. On checkout.session.completed, marks the matching order paid.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { getDB } from '$lib/server/db/connection';
import { getOrderByStripeSessionId, markOrderPaid } from '$lib/server/db/orders';
import { getPaymentSettings } from '$lib/server/db/site-settings';
import { getStripeClient } from '$lib/server/integrations/stripe/client';
import { relayPaidOrderToPrintful } from '$lib/server/integrations/printful/relay';
import { logActivity } from '$lib/server/activity-logger';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const encryptionKey = platform.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    throw error(400, 'Missing Stripe signature');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  const paymentSettings = await getPaymentSettings(db, siteId, encryptionKey);
  if (!paymentSettings.stripeSecretKey || !paymentSettings.stripeWebhookSecret) {
    throw error(400, 'Stripe is not configured for this store');
  }

  const rawBody = await request.text();
  const stripe = getStripeClient(paymentSettings.stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      paymentSettings.stripeWebhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    throw error(400, 'Invalid signature');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error('Stripe checkout.session.completed with no orderId in metadata');
        return json({ received: true });
      }

      const order = await getOrderByStripeSessionId(db, siteId, session.id);
      if (!order) {
        console.error(`No order found for Stripe session ${session.id}`);
        return json({ received: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);

      const justPaid = await markOrderPaid(db, siteId, order.id, paymentIntentId);

      if (justPaid) {
        await logActivity(db, {
          siteId,
          userId: 'system',
          action: 'Order paid via Stripe',
          description: `Order ${order.id} marked paid (session ${session.id})`,
          entityType: 'order',
          entityId: order.id,
          entityName: `Order ${order.id}`
        });

        await relayPaidOrderToPrintful(db, siteId, order.id, encryptionKey);
      }
    }

    return json({ received: true });
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
    throw error(500, 'Failed to process webhook');
  }
};
