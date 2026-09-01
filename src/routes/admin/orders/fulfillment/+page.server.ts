/**
 * Fulfillment relay screen
 * /admin/orders/fulfillment
 *
 * The one place that answers "which paid orders have not reached the
 * fulfillment provider" — relays still retrying, relays that gave up, and
 * paid orders that were never tracked at all. Also where an operator retries
 * a dead-lettered order by hand once they have fixed the cause.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import { canPerformAction } from '$lib/server/permissions';
import {
  getFulfillmentRelay,
  getRecentSucceededRelays,
  getUnsettledRelays,
  getUntrackedPaidOrders,
  reopenRelay,
  type FulfillmentRelay
} from '$lib/server/db/fulfillment-relays';
import { getOrderById } from '$lib/server/db/orders';
import { RELAY_MANUAL_RETRY_ATTEMPTS } from '$lib/server/fulfillment/relay-runner';
import {
  PRINTFUL_PROVIDER_TYPE,
  relayPaidOrderToPrintful
} from '$lib/server/integrations/printful/relay';

/** How many already-fulfilled relays to show, so a fixed order does not vanish. */
const RECENT_SUCCESS_LIMIT = 10;

export interface RelayView {
  id: string;
  orderId: string;
  providerType: string;
  status: FulfillmentRelay['status'];
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number | null;
  lastAttemptAt: number | null;
  failureKind: FulfillmentRelay['failure_kind'];
  lastError: string | null;
  lastResponse: string | null;
  externalOrderId: string | null;
  createdAt: number;
  orderTotal: number | null;
  customerEmail: string | null;
}

interface StoredShippingAddress {
  email?: string;
}

function customerEmailOf(shippingAddress: string): string | null {
  try {
    return (JSON.parse(shippingAddress) as StoredShippingAddress).email ?? null;
  } catch {
    return null;
  }
}

async function toRelayView(
  db: D1Database,
  siteId: string,
  relay: FulfillmentRelay
): Promise<RelayView> {
  const order = await getOrderById(db, siteId, relay.order_id);

  return {
    id: relay.id,
    orderId: relay.order_id,
    providerType: relay.provider_type,
    status: relay.status,
    attempts: relay.attempts,
    maxAttempts: relay.max_attempts,
    nextAttemptAt: relay.next_attempt_at,
    lastAttemptAt: relay.last_attempt_at,
    failureKind: relay.failure_kind,
    lastError: relay.last_error,
    lastResponse: relay.last_response,
    externalOrderId: relay.external_order_id,
    createdAt: relay.created_at,
    orderTotal: order?.total ?? null,
    customerEmail: order ? customerEmailOf(order.shipping_address) : null
  };
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const currentUser = locals.currentUser;
  if (!currentUser) {
    throw error(401, 'Not authenticated');
  }
  if (!canPerformAction(currentUser, 'orders:read')) {
    throw error(403, 'Insufficient permissions to view fulfillment');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  const [unsettled, succeeded, untracked] = await Promise.all([
    getUnsettledRelays(db, siteId),
    getRecentSucceededRelays(db, siteId, RECENT_SUCCESS_LIMIT),
    getUntrackedPaidOrders(db, siteId)
  ]);

  return {
    relays: await Promise.all(unsettled.map((relay) => toRelayView(db, siteId, relay))),
    recentlyFulfilled: await Promise.all(succeeded.map((relay) => toRelayView(db, siteId, relay))),
    untrackedOrders: untracked.map((order) => ({
      id: order.id,
      total: order.total,
      createdAt: order.created_at
    }))
  };
};

/**
 * Guard shared by both actions. Retrying places a real order with a real
 * provider, so it needs write permission, not just the admin panel.
 */
function requireOrderWriter(locals: App.Locals): void {
  const currentUser = locals.currentUser;
  if (!currentUser) {
    throw error(401, 'Not authenticated');
  }
  if (!canPerformAction(currentUser, 'orders:write')) {
    throw error(403, 'Insufficient permissions to retry fulfillment');
  }
}

function describeOutcome(
  orderId: string,
  outcome: Awaited<ReturnType<typeof relayPaidOrderToPrintful>>
): { success: boolean; message: string } {
  if (!outcome) {
    return {
      success: false,
      message: `Order ${orderId} has nothing to relay — no line on it is mapped to a Printful sync variant.`
    };
  }

  switch (outcome.outcome) {
    case 'succeeded':
      return {
        success: true,
        message: `Order ${orderId} is now with Printful (Printful order ${outcome.externalOrderId}).`
      };
    case 'skipped':
      return { success: true, message: `Order ${orderId} had already reached Printful.` };
    case 'retrying':
      return {
        success: false,
        message: `Printful did not accept order ${orderId}: ${outcome.error}. It will be tried again automatically.`
      };
    case 'dead_lettered':
      return {
        success: false,
        message: `Order ${orderId} failed again: ${outcome.error}`
      };
  }
}

export const actions: Actions = {
  /**
   * Retry one relay now. A dead-lettered relay is reopened with a fresh
   * budget of attempts first, so a fixed cause gets a real chance rather than
   * one shot.
   */
  retry: async ({ request, platform, locals }) => {
    requireOrderWriter(locals);

    const encryptionKey = platform?.env?.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return fail(500, { success: false, message: 'Encryption key is not configured.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const formData = await request.formData();
    const relayId = String(formData.get('relayId') ?? '');
    const orderId = String(formData.get('orderId') ?? '');

    if (!relayId || !orderId) {
      return fail(400, { success: false, message: 'Missing relay.' });
    }

    // Tenant scoping: the relay must belong to this site before we touch it.
    const relay = await getFulfillmentRelay(db, siteId, orderId, PRINTFUL_PROVIDER_TYPE);
    if (!relay || relay.id !== relayId) {
      return fail(404, { success: false, message: 'That relay no longer exists.' });
    }

    if (relay.status === 'dead_lettered') {
      await reopenRelay(db, siteId, relay.id, RELAY_MANUAL_RETRY_ATTEMPTS);
    }

    const outcome = await relayPaidOrderToPrintful(db, siteId, orderId, encryptionKey);
    const described = describeOutcome(orderId, outcome);
    return described.success ? described : fail(422, described);
  },

  /**
   * Relay a paid order that has no relay record — taken before this table
   * existed, or written by a path that bypassed the relay.
   */
  relayOrder: async ({ request, platform, locals }) => {
    requireOrderWriter(locals);

    const encryptionKey = platform?.env?.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return fail(500, { success: false, message: 'Encryption key is not configured.' });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;
    const formData = await request.formData();
    const orderId = String(formData.get('orderId') ?? '');

    if (!orderId) {
      return fail(400, { success: false, message: 'Missing order.' });
    }

    const order = await getOrderById(db, siteId, orderId);
    if (!order) {
      return fail(404, { success: false, message: 'That order no longer exists.' });
    }

    const outcome = await relayPaidOrderToPrintful(db, siteId, orderId, encryptionKey);
    const described = describeOutcome(orderId, outcome);
    return described.success ? described : fail(422, described);
  }
};
