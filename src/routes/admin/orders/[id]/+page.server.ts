/**
 * Single order details page server load function
 */

import type { ServerLoadEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { getOrderById, getOrderItems } from '$lib/server/db/orders';

export async function load({ platform, locals, params }: ServerLoadEvent) {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const orderId = params.id;

  if (!orderId) {
    throw error(400, 'Order ID is required');
  }

  try {
    const dbOrder = await getOrderById(db, siteId, orderId);

    if (!dbOrder) {
      throw error(404, 'Order not found');
    }

    const items = await getOrderItems(db, dbOrder.id);

    const order = {
      id: dbOrder.id,
      status: dbOrder.status,
      payment_status: dbOrder.payment_status,
      subtotal: dbOrder.subtotal,
      shipping_cost: dbOrder.shipping_cost,
      tax: dbOrder.tax,
      total: dbOrder.total,
      created_at: new Date(dbOrder.created_at * 1000).toISOString(),
      updated_at: new Date(dbOrder.updated_at * 1000).toISOString(),
      shipping_address: JSON.parse(dbOrder.shipping_address),
      billing_address: JSON.parse(dbOrder.billing_address),
      payment_method: JSON.parse(dbOrder.payment_method),
      shipping_details: dbOrder.shipping_details ? JSON.parse(dbOrder.shipping_details) : null,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      }))
    };

    return {
      order
    };
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Failed to load order:', err);
    throw error(500, 'Failed to load order');
  }
}
