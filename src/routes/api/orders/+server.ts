/**
 * Orders API endpoint
 * Handles order creation with payment processing
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { createOrder } from '$lib/server/db/orders';
import { saveOrderItemEquipmentValues } from '$lib/server/db/equipment';

// Test credit card number for development
const TEST_CARD_NUMBER = '5555555555555555';
const TEST_CARD_CVV = '456';
const TEST_CARD_EXPIRY_MONTH = '01';
const TEST_CARD_EXPIRY_YEAR = '23';

interface CreateOrderRequest {
  items: Array<{
    product_id?: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    equipment_values?: Array<{
      equipmentId: string;
      equipmentName: string;
      fieldId: string;
      fieldName: string;
      fieldType: string;
      value: string;
    }>;
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
  billing_address: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  payment_method: {
    type: 'credit-card' | 'debit-card' | 'paypal';
    cardNumber: string;
    cardHolderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  shipping_details?: {
    groups: Array<{
      id: string;
      shippingOptionId: string;
      shippingOptionName: string;
      shippingCost: number;
      products: Array<{
        id: string;
        name: string;
        quantity: number;
      }>;
    }>;
  };
}

/**
 * Validate payment method
 * For testing, accepts the test card 5555 5555 5555 5555 01/23 456
 */
function validatePayment(payment: CreateOrderRequest['payment_method']): {
  valid: boolean;
  error?: string;
} {
  // Remove spaces and dashes from card number
  const cleanCardNumber = payment.cardNumber.replace(/[\s-]/g, '');

  // Check if it's the test card
  if (cleanCardNumber === TEST_CARD_NUMBER) {
    // Validate test card details
    if (payment.expiryMonth !== TEST_CARD_EXPIRY_MONTH) {
      return { valid: false, error: 'Invalid expiry month for test card' };
    }
    if (payment.expiryYear !== TEST_CARD_EXPIRY_YEAR) {
      return { valid: false, error: 'Invalid expiry year for test card' };
    }
    if (payment.cvv !== TEST_CARD_CVV) {
      return { valid: false, error: 'Invalid CVV for test card' };
    }
    return { valid: true };
  }

  // For non-test cards, perform basic validation
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
    return { valid: false, error: 'Invalid card number length' };
  }

  if (!/^\d+$/.test(cleanCardNumber)) {
    return { valid: false, error: 'Card number must contain only digits' };
  }

  // Validate expiry date
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  const expiryYear = parseInt(payment.expiryYear);
  const expiryMonth = parseInt(payment.expiryMonth);

  if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
    return { valid: false, error: 'Card has expired' };
  }

  // Validate CVV
  if (!/^\d{3,4}$/.test(payment.cvv)) {
    return { valid: false, error: 'Invalid CVV' };
  }

  return { valid: true };
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST({ request, platform, locals }: RequestEvent): Promise<Response> {
  try {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const userId = locals.currentUser?.id;

    const data = (await request.json()) as CreateOrderRequest;

    // Validate required fields
    if (!data.items || data.items.length === 0) {
      return json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    if (!data.shipping_address || !data.billing_address || !data.payment_method) {
      return json({ success: false, error: 'Missing required order information' }, { status: 400 });
    }

    // Validate payment
    const paymentValidation = validatePayment(data.payment_method);
    if (!paymentValidation.valid) {
      return json(
        { success: false, error: paymentValidation.error || 'Payment validation failed' },
        { status: 400 }
      );
    }

    // Create order in database
    const order = await createOrder(db, siteId, {
      user_id: userId,
      items: data.items,
      subtotal: data.subtotal,
      shipping_cost: data.shipping_cost,
      tax: data.tax,
      total: data.total,
      shipping_address: data.shipping_address,
      billing_address: data.billing_address,
      payment_method: {
        type: data.payment_method.type,
        // Store only last 4 digits for security
        cardNumber: `****${data.payment_method.cardNumber.slice(-4)}`,
        cardHolderName: data.payment_method.cardHolderName,
        expiryMonth: data.payment_method.expiryMonth,
        expiryYear: data.payment_method.expiryYear
        // Never store CVV
      },
      shipping_details: data.shipping_details
    });

    // Save equipment values for order items that have them
    if (order.id) {
      for (const item of data.items) {
        if (item.equipment_values && item.equipment_values.length > 0 && item.product_id) {
          // Find the matching order item by product_id
          const orderItems = await db
            .prepare('SELECT id FROM order_items WHERE order_id = ? AND product_id = ?')
            .bind(order.id, item.product_id)
            .all<{ id: string }>();

          const orderItemId = orderItems.results?.[0]?.id;
          if (orderItemId) {
            await saveOrderItemEquipmentValues(
              db,
              orderItemId,
              item.equipment_values.map((ev) => ({
                equipmentId: ev.equipmentId,
                equipmentFieldId: ev.fieldId,
                fieldName: ev.fieldName,
                value: ev.value
              }))
            );
          }
        }
      }
    }

    return json({
      success: true,
      orderId: order.id,
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
