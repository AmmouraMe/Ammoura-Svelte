/**
 * Printful order relay — the moment a paid Ammoura order actually becomes a
 * real order placed with Printful.
 *
 * Called once per order, right after the Stripe webhook marks it paid.
 * Only order items whose selected variant is mapped to a Printful sync
 * variant (via product_variants.printful_sync_variant_id) are relayed;
 * orders with no Printful-fulfilled items are a no-op.
 */

import { getOrderById, getOrderItems, type DBOrder } from '$lib/server/db/orders';
import { getProductVariantById } from '$lib/server/db/product-variants';
import { getFulfillmentProvidersByType } from '$lib/server/db/fulfillment-providers';
import { storePrintfulOrder } from './db';
import { PrintfulService } from './service';
import type { PrintfulOrderRequest, PrintfulRecipient } from './types';
import { logActivity } from '$lib/server/activity-logger';

/** Countries offered by ShippingAddressForm.svelte, mapped to ISO-3166-1 alpha-2. */
const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US',
  Canada: 'CA',
  'United Kingdom': 'GB',
  Australia: 'AU',
  Germany: 'DE',
  France: 'FR'
};

function toCountryCode(country: string): string | null {
  if (/^[A-Z]{2}$/.test(country)) return country;
  return COUNTRY_TO_ISO2[country] || null;
}

interface StoredShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
}

function buildRecipient(order: DBOrder): PrintfulRecipient | null {
  const addr = JSON.parse(order.shipping_address) as StoredShippingAddress;
  const countryCode = toCountryCode(addr.country);
  if (!countryCode) return null;

  return {
    name: `${addr.firstName} ${addr.lastName}`.trim(),
    address1: addr.address,
    city: addr.city,
    state_code: addr.state,
    country_code: countryCode,
    zip: addr.zipCode,
    phone: addr.phone,
    email: addr.email
  };
}

/**
 * Relay a paid order to Printful. Safe to call even if the order has no
 * Printful-fulfilled items (no-op) or Printful isn't connected (no-op).
 * Never throws — failures are logged so the paid order isn't lost, but a
 * relay failure must not block the Stripe webhook from returning 200.
 */
export async function relayPaidOrderToPrintful(
  db: D1Database,
  siteId: string,
  orderId: string,
  encryptionKey: string
): Promise<void> {
  try {
    const order = await getOrderById(db, siteId, orderId);
    if (!order) return;

    const orderItems = await getOrderItems(db, orderId);

    const printfulItems: PrintfulOrderRequest['items'] = [];
    for (const item of orderItems) {
      if (!item.variant_id) continue;
      const variant = await getProductVariantById(db, siteId, item.variant_id);
      if (!variant?.printful_sync_variant_id) continue;
      printfulItems.push({
        sync_variant_id: variant.printful_sync_variant_id,
        quantity: item.quantity
      });
    }

    if (printfulItems.length === 0) return;

    const providers = await getFulfillmentProvidersByType(db, siteId, 'printful');
    const provider = providers[0];
    if (!provider) {
      console.error(`Order ${orderId} has Printful items but no Printful provider is connected`);
      return;
    }

    const recipient = buildRecipient(order);
    if (!recipient) {
      console.error(`Order ${orderId}: unrecognized shipping country, cannot relay to Printful`);
      return;
    }

    const service = await PrintfulService.fromProvider(provider, encryptionKey);
    const printfulOrder = await service.createOrderWithPrintful({
      external_id: order.id,
      shipping: 'standard',
      items: printfulItems,
      recipient
    });

    await storePrintfulOrder(db, siteId, order.id, printfulOrder.id, JSON.stringify(printfulOrder));

    await logActivity(db, {
      siteId,
      userId: 'system',
      action: 'Printful order placed',
      description: `Order ${order.id} relayed to Printful (Printful order ${printfulOrder.id})`,
      entityType: 'order',
      entityId: order.id,
      entityName: `Order ${order.id}`
    });
  } catch (err) {
    console.error(`Failed to relay order ${orderId} to Printful:`, err);
  }
}
