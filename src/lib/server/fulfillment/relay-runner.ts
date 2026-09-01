/**
 * The retry machinery behind every order hand-off to a fulfillment provider.
 *
 * One paid order, one relay row, one attempt at a time. A transient failure is
 * rescheduled with exponential backoff; a permanent one, or a transient one
 * that has run out of attempts, is dead-lettered — a visible state with the
 * error and the raw provider response attached, and an alert to the people who
 * own the store. Nothing here is Printful-specific: an adapter supplies the
 * `execute` callback and throws `RelayFailure` to say what went wrong.
 *
 * See docs/FULFILLMENT_RELAY.md.
 */

import {
  ensureFulfillmentRelay,
  markRelayDeadLettered,
  markRelayRetrying,
  markRelaySucceeded,
  type FailureKind,
  type FulfillmentRelay
} from '$lib/server/db/fulfillment-relays';
import { getAdminUsers } from '$lib/server/db/users';
import { createNotification } from '$lib/server/db/notifications';
import { logActivity } from '$lib/server/activity-logger';
import { getCurrentTimestamp } from '$lib/server/db/connection';
import { toRelayFailure } from './relay-errors';

/** How many times a relay is attempted before it is dead-lettered. */
export const RELAY_MAX_ATTEMPTS = 8;

/** Delay after the first failure; doubles from there. */
export const RELAY_BASE_DELAY_SECONDS = 120;

/** Ceiling on the backoff, so a long outage still gets hourly attempts. */
export const RELAY_MAX_DELAY_SECONDS = 6 * 60 * 60;

/**
 * Spread of random jitter applied to each delay, as a fraction. Orders paid in
 * the same burst fail together; without jitter they would also retry together
 * and re-create the thundering herd that rate-limited them.
 */
export const RELAY_JITTER_RATIO = 0.2;

/** Attempts granted to a dead-lettered relay that an operator retries by hand. */
export const RELAY_MANUAL_RETRY_ATTEMPTS = 3;

/**
 * Seconds to wait after `attempt` consecutive failures. Exponential, capped,
 * and jittered. `attempt` is 1-based: 1 is the delay after the first failure.
 */
export function computeBackoffSeconds(attempt: number, random: () => number = Math.random): number {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(RELAY_BASE_DELAY_SECONDS * 2 ** exponent, RELAY_MAX_DELAY_SECONDS);
  // random() in [0,1) maps to a multiplier in [1 - ratio, 1 + ratio).
  const jitter = 1 + (random() * 2 - 1) * RELAY_JITTER_RATIO;
  return Math.max(1, Math.round(base * jitter));
}

/** What a successful attempt hands back to the runner. */
export interface RelayExecution {
  /** The provider's own id for the order that now exists on their side. */
  externalOrderId: string;
  /** Optional detail for the activity log, e.g. "Printful order 555". */
  detail?: string;
}

export interface RunRelayOptions {
  siteId: string;
  orderId: string;
  /** Matches fulfillment_providers.provider_type, e.g. 'printful'. */
  providerType: string;
  /** Human name for logs and alerts, e.g. 'Printful'. */
  providerLabel: string;
  /** Place the order with the provider. Throw RelayFailure to fail. */
  execute: (relay: FulfillmentRelay) => Promise<RelayExecution>;
  now?: number;
  random?: () => number;
}

export type RunRelayResult =
  | { outcome: 'succeeded'; externalOrderId: string; attempts: number }
  | { outcome: 'retrying'; nextAttemptAt: number; error: string; attempts: number }
  | { outcome: 'dead_lettered'; failureKind: FailureKind; error: string; attempts: number }
  | { outcome: 'skipped'; reason: 'already_succeeded' };

/**
 * Run one attempt at relaying an order, recording the outcome.
 *
 * Never throws. A relay failure must not be able to take down the Stripe
 * webhook that called it — the payment already happened, and a webhook that
 * 500s gets retried into a mess.
 */
export async function runRelayAttempt(
  db: D1Database,
  options: RunRelayOptions
): Promise<RunRelayResult> {
  const { siteId, orderId, providerType, providerLabel, execute } = options;
  const now = options.now ?? getCurrentTimestamp();
  const random = options.random ?? Math.random;

  const relay = await ensureFulfillmentRelay(db, siteId, orderId, providerType, RELAY_MAX_ATTEMPTS);

  // A second webhook delivery, or a sweep racing a manual retry, must not
  // place the order twice.
  if (relay.status === 'succeeded') {
    return { outcome: 'skipped', reason: 'already_succeeded' };
  }

  const attempts = relay.attempts + 1;

  try {
    const result = await execute(relay);
    await markRelaySucceeded(db, siteId, relay.id, result.externalOrderId);
    await safeLog(db, {
      siteId,
      action: `${providerLabel} order placed`,
      description:
        result.detail ??
        `Order ${orderId} relayed to ${providerLabel} (${providerLabel} order ${result.externalOrderId})`,
      orderId,
      severity: 'info',
      metadata: { attempts, external_order_id: result.externalOrderId }
    });
    return { outcome: 'succeeded', externalOrderId: result.externalOrderId, attempts };
  } catch (error) {
    const failure = toRelayFailure(error);
    const exhausted = attempts >= relay.max_attempts;

    if (failure.kind === 'permanent' || exhausted) {
      await markRelayDeadLettered(
        db,
        siteId,
        relay.id,
        failure.kind,
        failure.message,
        failure.response
      );
      await safeLog(db, {
        siteId,
        action: `${providerLabel} relay dead-lettered`,
        description: `Order ${orderId} could not be sent to ${providerLabel} after ${attempts} attempt(s): ${failure.message}`,
        orderId,
        severity: 'critical',
        metadata: {
          attempts,
          failure_kind: failure.kind,
          error: failure.message
        }
      });
      await alertStoreOwners(db, siteId, orderId, providerLabel, failure.message);
      return {
        outcome: 'dead_lettered',
        failureKind: failure.kind,
        error: failure.message,
        attempts
      };
    }

    const nextAttemptAt = now + computeBackoffSeconds(attempts, random);
    await markRelayRetrying(db, siteId, relay.id, nextAttemptAt, failure.message, failure.response);
    await safeLog(db, {
      siteId,
      action: `${providerLabel} relay failed, will retry`,
      description: `Order ${orderId} attempt ${attempts} failed: ${failure.message}`,
      orderId,
      severity: 'warning',
      metadata: { attempts, next_attempt_at: nextAttemptAt, error: failure.message }
    });
    return { outcome: 'retrying', nextAttemptAt, error: failure.message, attempts };
  }
}

interface RelayLogParams {
  siteId: string;
  action: string;
  description: string;
  orderId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata: Record<string, unknown>;
}

/**
 * Activity logging is telemetry. It must never be the reason a relay outcome
 * goes unrecorded, so its own failure is swallowed.
 */
async function safeLog(db: D1Database, params: RelayLogParams): Promise<void> {
  try {
    await logActivity(db, {
      siteId: params.siteId,
      userId: 'system',
      action: params.action,
      description: params.description,
      entityType: 'order',
      entityId: params.orderId,
      entityName: `Order ${params.orderId}`,
      severity: params.severity,
      metadata: params.metadata
    });
  } catch (error) {
    console.error(`Failed to log relay activity for order ${params.orderId}:`, error);
  }
}

/**
 * Tell the people who run the store that an order they were paid for has not
 * reached the printer. A customer who paid should not be the one who finds out.
 */
async function alertStoreOwners(
  db: D1Database,
  siteId: string,
  orderId: string,
  providerLabel: string,
  reason: string
): Promise<void> {
  try {
    const admins = await getAdminUsers(db, siteId);
    await Promise.all(
      admins.map((admin) =>
        createNotification(db, siteId, {
          user_id: admin.id,
          type: 'fulfillment_failed',
          title: `Order ${orderId} was not sent to ${providerLabel}`,
          message: `The customer has paid, but ${providerLabel} never accepted the order: ${reason}. Fix the cause, then retry it from the fulfillment screen.`,
          priority: 'urgent',
          action_url: '/admin/orders/fulfillment',
          metadata: { order_id: orderId, provider: providerLabel, reason }
        })
      )
    );
  } catch (error) {
    console.error(`Failed to alert store owners about order ${orderId}:`, error);
  }
}
