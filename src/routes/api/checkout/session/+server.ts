/**
 * POST /api/checkout/session
 * Creates an order (unpaid) from the cart, then a Stripe Checkout Session
 * for it, and returns the Stripe-hosted URL to redirect the customer to.
 * The order is marked paid by POST /api/webhooks/stripe once Stripe
 * confirms the payment — never here, since the customer hasn't paid yet.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { createOrder, setOrderStripeSession } from '$lib/server/db/orders';
import {
  saveEquipmentValuesForOrderItems,
  type OrderItemEquipmentValueSubmission
} from '$lib/server/db/equipment';
import { getPaymentSettings } from '$lib/server/db/site-settings';
import { getStripeClient } from '$lib/server/integrations/stripe/client';
import type Stripe from 'stripe';

interface CheckoutSessionRequest {
  items: Array<{
    product_id?: string;
    variant_id?: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    equipment_values?: OrderItemEquipmentValueSubmission[];
  }>;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  shipping_address: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billing_address: Record<string, unknown>;
  shipping_details?: {
    groups: Array<{
      id: string;
      shippingOptionId: string;
      shippingOptionName: string;
      shippingCost: number;
      products: Array<{ id: string; name: string; quantity: number }>;
    }>;
  };
}

export const POST: RequestHandler = async ({ request, platform, locals, url }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const encryptionKey = platform.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;
  const userId = locals.currentUser?.id;

  const data = (await request.json()) as CheckoutSessionRequest;

  if (!data.items?.length) {
    throw error(400, 'Order must contain at least one item');
  }
  if (!data.shipping_address || !data.billing_address) {
    throw error(400, 'Missing required order information');
  }

  const paymentSettings = await getPaymentSettings(db, siteId, encryptionKey);
  if (!paymentSettings.stripeEnabled || !paymentSettings.stripeSecretKey) {
    throw error(400, 'Stripe is not configured for this store');
  }

  const order = await createOrder(db, siteId, {
    user_id: userId,
    items: data.items,
    subtotal: data.subtotal,
    shipping_cost: data.shipping_cost,
    tax: data.tax,
    total: data.total,
    shipping_address: data.shipping_address,
    billing_address: data.billing_address,
    payment_method: { type: 'stripe' },
    shipping_details: data.shipping_details
  });

  await saveEquipmentValuesForOrderItems(db, order.id, data.items);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));

  if (data.shipping_cost > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(data.shipping_cost * 100)
      },
      quantity: 1
    });
  }
  if (data.tax > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tax' },
        unit_amount: Math.round(data.tax * 100)
      },
      quantity: 1
    });
  }

  const stripe = getStripeClient(paymentSettings.stripeSecretKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: data.shipping_address.email || undefined,
      success_url: `${url.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/checkout?canceled=1`,
      metadata: { orderId: order.id, siteId }
    });
  } catch (err) {
    console.error('Failed to create Stripe Checkout Session:', err);
    throw error(502, 'Failed to start checkout with Stripe');
  }

  if (!session.url) {
    throw error(502, 'Stripe did not return a checkout URL');
  }

  await setOrderStripeSession(db, siteId, order.id, session.id);

  return json({ success: true, url: session.url, orderId: order.id });
};
