import { getDB } from '$lib/server/db/connection';
import { getOrderByStripeSessionId } from '$lib/server/db/orders';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, platform, locals }) => {
  const sessionId = url.searchParams.get('session_id');
  if (!platform?.env?.DB || !sessionId) {
    return { order: null };
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  const order = await getOrderByStripeSessionId(db, siteId, sessionId);
  if (!order) {
    return { order: null };
  }

  const shippingAddress = JSON.parse(order.shipping_address) as { email?: string };

  return {
    order: {
      id: order.id,
      total: order.total,
      paymentStatus: order.payment_status,
      email: shippingAddress.email || ''
    }
  };
};
