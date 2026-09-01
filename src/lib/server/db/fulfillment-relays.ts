/**
 * Fulfillment relay records — the durable hand-off between a paid order and
 * the print provider that has to make it.
 *
 * One row per (site, order, provider). The row is created before the first
 * attempt and outlives it, so "which paid orders have not reached the
 * fulfillment provider" is a query rather than a guess. See
 * docs/FULFILLMENT_RELAY.md.
 */

import { execute, executeOne, generateId, getCurrentTimestamp } from './connection';

export type RelayStatus = 'pending' | 'succeeded' | 'dead_lettered';

/** Whether a failure is worth trying again. */
export type FailureKind = 'transient' | 'permanent';

export interface FulfillmentRelay {
  id: string;
  site_id: string;
  order_id: string;
  provider_type: string;
  status: RelayStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: number | null;
  last_attempt_at: number | null;
  failure_kind: FailureKind | null;
  last_error: string | null;
  last_response: string | null;
  external_order_id: string | null;
  created_at: number;
  updated_at: number;
}

/** A due relay carries the site it belongs to; the sweep runs across sites. */
export type DueFulfillmentRelay = FulfillmentRelay;

const COLUMNS = `id, site_id, order_id, provider_type, status, attempts, max_attempts,
  next_attempt_at, last_attempt_at, failure_kind, last_error, last_response,
  external_order_id, created_at, updated_at`;

/**
 * Get the relay row for one order and provider, if it exists.
 */
export async function getFulfillmentRelay(
  db: D1Database,
  siteId: string,
  orderId: string,
  providerType: string
): Promise<FulfillmentRelay | null> {
  return executeOne<FulfillmentRelay>(
    db,
    `SELECT ${COLUMNS} FROM fulfillment_relays
     WHERE site_id = ? AND order_id = ? AND provider_type = ?`,
    [siteId, orderId, providerType]
  );
}

/**
 * Create the relay row for an order, or return the one already there.
 *
 * Called before the first attempt so that a crash between "order paid" and
 * "order relayed" still leaves a record the sweep can pick up.
 */
export async function ensureFulfillmentRelay(
  db: D1Database,
  siteId: string,
  orderId: string,
  providerType: string,
  maxAttempts: number
): Promise<FulfillmentRelay> {
  const existing = await getFulfillmentRelay(db, siteId, orderId, providerType);
  if (existing) return existing;

  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      `INSERT INTO fulfillment_relays
         (id, site_id, order_id, provider_type, status, attempts, max_attempts,
          next_attempt_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?, ?)
       ON CONFLICT (site_id, order_id, provider_type) DO NOTHING`
    )
    .bind(generateId(), siteId, orderId, providerType, maxAttempts, timestamp, timestamp, timestamp)
    .run();

  const created = await getFulfillmentRelay(db, siteId, orderId, providerType);
  if (!created) {
    throw new Error(`Failed to create fulfillment relay for order ${orderId}`);
  }
  return created;
}

/**
 * Record a successful relay. `externalOrderId` is the provider's own order id.
 */
export async function markRelaySucceeded(
  db: D1Database,
  siteId: string,
  relayId: string,
  externalOrderId: string
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      `UPDATE fulfillment_relays
       SET status = 'succeeded',
           attempts = attempts + 1,
           last_attempt_at = ?,
           next_attempt_at = NULL,
           failure_kind = NULL,
           last_error = NULL,
           last_response = NULL,
           external_order_id = ?,
           updated_at = ?
       WHERE id = ? AND site_id = ?`
    )
    .bind(timestamp, externalOrderId, timestamp, relayId, siteId)
    .run();
}

/**
 * Record a failed attempt that will be tried again at `nextAttemptAt`.
 */
export async function markRelayRetrying(
  db: D1Database,
  siteId: string,
  relayId: string,
  nextAttemptAt: number,
  error: string,
  response: string | null
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      `UPDATE fulfillment_relays
       SET status = 'pending',
           attempts = attempts + 1,
           last_attempt_at = ?,
           next_attempt_at = ?,
           failure_kind = 'transient',
           last_error = ?,
           last_response = ?,
           updated_at = ?
       WHERE id = ? AND site_id = ?`
    )
    .bind(timestamp, nextAttemptAt, error, response, timestamp, relayId, siteId)
    .run();
}

/**
 * Record a relay that has given up: a permanent failure, or a transient one
 * that exhausted its attempts. Nothing retries it except a human.
 */
export async function markRelayDeadLettered(
  db: D1Database,
  siteId: string,
  relayId: string,
  failureKind: FailureKind,
  error: string,
  response: string | null
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      `UPDATE fulfillment_relays
       SET status = 'dead_lettered',
           attempts = attempts + 1,
           last_attempt_at = ?,
           next_attempt_at = NULL,
           failure_kind = ?,
           last_error = ?,
           last_response = ?,
           updated_at = ?
       WHERE id = ? AND site_id = ?`
    )
    .bind(timestamp, failureKind, error, response, timestamp, relayId, siteId)
    .run();
}

/**
 * Put a dead-lettered relay back in the queue, due immediately. This is what
 * the admin "Retry now" button does once the operator has fixed the cause.
 */
export async function reopenRelay(
  db: D1Database,
  siteId: string,
  relayId: string,
  extraAttempts: number
): Promise<boolean> {
  const timestamp = getCurrentTimestamp();
  const result = await db
    .prepare(
      `UPDATE fulfillment_relays
       SET status = 'pending',
           next_attempt_at = ?,
           max_attempts = attempts + ?,
           updated_at = ?
       WHERE id = ? AND site_id = ? AND status = 'dead_lettered'`
    )
    .bind(timestamp, extraAttempts, timestamp, relayId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Relays whose backoff has elapsed, oldest first. Deliberately not scoped to
 * one site: the sweep runs for the whole platform. Every retry it starts is
 * scoped by the site_id on the row it came from.
 */
export async function getDueRelays(
  db: D1Database,
  now: number,
  limit: number
): Promise<DueFulfillmentRelay[]> {
  const result = await execute<DueFulfillmentRelay>(
    db,
    `SELECT ${COLUMNS} FROM fulfillment_relays
     WHERE status = 'pending'
       AND next_attempt_at IS NOT NULL
       AND next_attempt_at <= ?
     ORDER BY next_attempt_at ASC
     LIMIT ?`,
    [now, limit]
  );
  return result.results || [];
}

/**
 * Every relay for a site that is not yet settled successfully — what the
 * admin fulfillment screen shows.
 */
export async function getUnsettledRelays(
  db: D1Database,
  siteId: string
): Promise<FulfillmentRelay[]> {
  const result = await execute<FulfillmentRelay>(
    db,
    `SELECT ${COLUMNS} FROM fulfillment_relays
     WHERE site_id = ? AND status IN ('pending', 'dead_lettered')
     ORDER BY created_at DESC`,
    [siteId]
  );
  return result.results || [];
}

/**
 * Recently settled relays, so the screen can show that a retry worked rather
 * than the row simply vanishing.
 */
export async function getRecentSucceededRelays(
  db: D1Database,
  siteId: string,
  limit: number
): Promise<FulfillmentRelay[]> {
  const result = await execute<FulfillmentRelay>(
    db,
    `SELECT ${COLUMNS} FROM fulfillment_relays
     WHERE site_id = ? AND status = 'succeeded'
     ORDER BY updated_at DESC
     LIMIT ?`,
    [siteId, limit]
  );
  return result.results || [];
}

/** A paid order with provider-fulfilled items and no relay row at all. */
export interface UntrackedPaidOrder {
  id: string;
  total: number;
  created_at: number;
}

/**
 * Paid orders that have items mapped to a Printful sync variant but no relay
 * record — orders taken before this table existed, or written by a path that
 * bypassed the relay. Without this the admin screen would quietly under-report
 * exactly the orders it exists to catch.
 */
export async function getUntrackedPaidOrders(
  db: D1Database,
  siteId: string
): Promise<UntrackedPaidOrder[]> {
  const result = await execute<UntrackedPaidOrder>(
    db,
    `SELECT DISTINCT o.id, o.total, o.created_at
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN product_variants pv ON pv.id = oi.variant_id
     LEFT JOIN fulfillment_relays fr
       ON fr.order_id = o.id AND fr.site_id = o.site_id
     WHERE o.site_id = ?
       AND o.payment_status = 'paid'
       AND pv.printful_sync_variant_id IS NOT NULL
       AND fr.id IS NULL
     ORDER BY o.created_at DESC`,
    [siteId]
  );
  return result.results || [];
}
