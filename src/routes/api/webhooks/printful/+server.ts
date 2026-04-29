/**
 * Printful webhook handler
 * Receives order status updates from Printful
 * POST /api/webhooks/printful
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { updatePrintfulOrderStatus } from '$lib/server/integrations/printful/db';
import { logActivity } from '$lib/server/activity-logger';
import type { PrintfulWebhookEvent } from '$lib/server/integrations/printful/types';

/**
 * POST /api/webhooks/printful
 * Receive webhook events from Printful
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    // Parse webhook payload
    const body = (await request.json()) as PrintfulWebhookEvent;

    if (!body.type || !body.data?.order) {
      throw error(400, 'Invalid webhook payload');
    }

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

    await logActivity(db, {
      siteId,
      userId: 'system',
      action: `Printful ${type}`,
      description: eventDescription,
      entityType: 'order',
      entityId: printfulOrder.external_id,
      entityName: `Order ${printfulOrder.external_id}`
    });

    return json(
      {
        success: true,
        message: 'Webhook processed',
        orderId: printfulOrder.id,
        status: printfulOrder.status
      },
      { status: 200 }
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Printful webhook error:', err);
    // Return 200 to prevent Printful from retrying
    return json(
      {
        success: false,
        message: 'Webhook received but could not be processed'
      },
      { status: 200 }
    );
  }
};
