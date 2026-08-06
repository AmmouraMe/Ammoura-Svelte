/**
 * Printful webhook handler
 * Receives order status updates from Printful
 * POST /api/webhooks/printful
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getFulfillmentProvidersByType } from '$lib/server/db/fulfillment-providers';
import { updatePrintfulOrderStatus } from '$lib/server/integrations/printful/db';
import { logActivity } from '$lib/server/activity-logger';
import { timingSafeEqual } from '$lib/server/timing-safe';
import type { PrintfulWebhookEvent } from '$lib/server/integrations/printful/types';

/**
 * POST /api/webhooks/printful?token=...
 * Receive webhook events from Printful. Printful v1 has no HMAC signature to
 * verify, so authenticity is checked via a shared-secret token embedded in
 * the webhook URL the owner registers (generated at connect time).
 */
export const POST: RequestHandler = async ({ request, platform, locals, url }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const token = url.searchParams.get('token');
  const providers = await getFulfillmentProvidersByType(db, siteId, 'printful');
  const provider = providers[0];

  if (!provider?.webhook_token || !timingSafeEqual(token, provider.webhook_token)) {
    throw error(401, 'Invalid webhook token');
  }

  // A malformed payload will never become valid, so answer 4xx and let
  // Printful stop. Everything after this point is retryable.
  let body: PrintfulWebhookEvent;
  try {
    body = (await request.json()) as PrintfulWebhookEvent;
  } catch {
    throw error(400, 'Malformed webhook payload');
  }
  if (!body.type || !body.data?.order) {
    throw error(400, 'Invalid webhook payload');
  }

  try {
    const { type, data } = body;
    const printfulOrder = data.order;

    // Update order status in database
    await updatePrintfulOrderStatus(
      db,
      siteId,
      printfulOrder.external_id,
      printfulOrder.status,
      JSON.stringify(printfulOrder)
    );

    // Log the webhook event
    let eventDescription = '';
    switch (type) {
      case 'order_created':
        eventDescription = `Order ${printfulOrder.external_id} created with Printful (ID: ${printfulOrder.id})`;
        break;
      case 'order_updated':
        eventDescription = `Order ${printfulOrder.external_id} updated - Status: ${printfulOrder.status}, Tracking: ${printfulOrder.tracking_number || 'N/A'}`;
        break;
      case 'order_failed':
        eventDescription = `Order ${printfulOrder.external_id} failed with Printful`;
        break;
      case 'order_canceled':
        eventDescription = `Order ${printfulOrder.external_id} canceled with Printful`;
        break;
      default:
        eventDescription = `Printful webhook event: ${type}`;
    }

    // Telemetry — a logging failure must not discard a status update that
    // already landed, nor provoke a retry of one.
    try {
      await logActivity(db, {
        siteId,
        userId: 'system',
        action: `Printful ${type}`,
        description: eventDescription,
        entityType: 'order',
        entityId: printfulOrder.external_id,
        entityName: `Order ${printfulOrder.external_id}`
      });
    } catch (err) {
      console.error('Failed to log Printful webhook activity:', err);
    }

    return json({
      success: true,
      message: 'Webhook processed',
      orderId: printfulOrder.id,
      status: printfulOrder.status
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    // This used to answer 200 "could not be processed", which told Printful the
    // update was delivered. A transient D1 failure therefore dropped a status
    // or tracking number for good. 5xx so Printful redelivers.
    console.error('Printful webhook error:', err);
    throw error(500, 'Failed to process webhook');
  }
};
