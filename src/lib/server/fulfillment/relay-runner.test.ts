import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FulfillmentRelay } from '$lib/server/db/fulfillment-relays';

const mockEnsureFulfillmentRelay = vi.fn();
const mockMarkRelaySucceeded = vi.fn();
const mockMarkRelayRetrying = vi.fn();
const mockMarkRelayDeadLettered = vi.fn();
vi.mock('$lib/server/db/fulfillment-relays', () => ({
  ensureFulfillmentRelay: (...args: unknown[]) => mockEnsureFulfillmentRelay(...args),
  markRelaySucceeded: (...args: unknown[]) => mockMarkRelaySucceeded(...args),
  markRelayRetrying: (...args: unknown[]) => mockMarkRelayRetrying(...args),
  markRelayDeadLettered: (...args: unknown[]) => mockMarkRelayDeadLettered(...args)
}));

const mockGetAdminUsers = vi.fn();
vi.mock('$lib/server/db/users', () => ({
  getAdminUsers: (...args: unknown[]) => mockGetAdminUsers(...args)
}));

const mockCreateNotification = vi.fn();
vi.mock('$lib/server/db/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args)
}));

const mockLogActivity = vi.fn();
vi.mock('$lib/server/activity-logger', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args)
}));

import { RelayFailure } from './relay-errors';
import {
  computeBackoffSeconds,
  runRelayAttempt,
  RELAY_BASE_DELAY_SECONDS,
  RELAY_MAX_ATTEMPTS,
  RELAY_MAX_DELAY_SECONDS
} from './relay-runner';

const db = {} as unknown as D1Database;

function relay(overrides: Partial<FulfillmentRelay> = {}): FulfillmentRelay {
  return {
    id: 'relay-1',
    site_id: 'site-1',
    order_id: 'order-1',
    provider_type: 'printful',
    status: 'pending',
    attempts: 0,
    max_attempts: RELAY_MAX_ATTEMPTS,
    next_attempt_at: null,
    last_attempt_at: null,
    failure_kind: null,
    last_error: null,
    last_response: null,
    external_order_id: null,
    created_at: 1000,
    updated_at: 1000,
    ...overrides
  };
}

function options(overrides: Record<string, unknown> = {}) {
  return {
    siteId: 'site-1',
    orderId: 'order-1',
    providerType: 'printful',
    providerLabel: 'Printful',
    execute: vi.fn().mockResolvedValue({ externalOrderId: '555' }),
    now: 10_000,
    // No jitter, so the expected delay is exact.
    random: () => 0.5,
    ...overrides
  };
}

describe('computeBackoffSeconds', () => {
  it('waits the base delay after the first failure', () => {
    expect(computeBackoffSeconds(1, () => 0.5)).toBe(RELAY_BASE_DELAY_SECONDS);
  });

  it('doubles with each further failure', () => {
    expect(computeBackoffSeconds(2, () => 0.5)).toBe(RELAY_BASE_DELAY_SECONDS * 2);
    expect(computeBackoffSeconds(3, () => 0.5)).toBe(RELAY_BASE_DELAY_SECONDS * 4);
  });

  it('never exceeds the ceiling', () => {
    expect(computeBackoffSeconds(40, () => 0.5)).toBe(RELAY_MAX_DELAY_SECONDS);
  });

  it('applies jitter in both directions', () => {
    const low = computeBackoffSeconds(3, () => 0);
    const high = computeBackoffSeconds(3, () => 0.999);
    expect(low).toBeLessThan(RELAY_BASE_DELAY_SECONDS * 4);
    expect(high).toBeGreaterThan(RELAY_BASE_DELAY_SECONDS * 4);
  });

  it('never returns a delay below one second', () => {
    expect(computeBackoffSeconds(0, () => 0)).toBeGreaterThanOrEqual(1);
  });
});

describe('runRelayAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureFulfillmentRelay.mockResolvedValue(relay());
    mockGetAdminUsers.mockResolvedValue([]);
  });

  it('records success and does not schedule another attempt', async () => {
    const opts = options();

    const result = await runRelayAttempt(db, opts);

    expect(result).toEqual({ outcome: 'succeeded', externalOrderId: '555', attempts: 1 });
    expect(mockMarkRelaySucceeded).toHaveBeenCalledWith(db, 'site-1', 'relay-1', '555');
    expect(mockMarkRelayRetrying).not.toHaveBeenCalled();
    expect(mockMarkRelayDeadLettered).not.toHaveBeenCalled();
  });

  it('does not run the provider call again once a relay has succeeded', async () => {
    mockEnsureFulfillmentRelay.mockResolvedValue(relay({ status: 'succeeded' }));
    const opts = options();

    const result = await runRelayAttempt(db, opts);

    expect(result).toEqual({ outcome: 'skipped', reason: 'already_succeeded' });
    expect(opts.execute).not.toHaveBeenCalled();
  });

  it('schedules a backoff after a transient failure', async () => {
    const opts = options({
      execute: vi.fn().mockRejectedValue(RelayFailure.transient('HTTP 503', '{"code":503}'))
    });

    const result = await runRelayAttempt(db, opts);

    expect(result).toEqual({
      outcome: 'retrying',
      nextAttemptAt: 10_000 + RELAY_BASE_DELAY_SECONDS,
      error: 'HTTP 503',
      attempts: 1
    });
    expect(mockMarkRelayRetrying).toHaveBeenCalledWith(
      db,
      'site-1',
      'relay-1',
      10_000 + RELAY_BASE_DELAY_SECONDS,
      'HTTP 503',
      '{"code":503}'
    );
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('dead-letters a permanent failure on the first attempt', async () => {
    const opts = options({
      execute: vi.fn().mockRejectedValue(RelayFailure.permanent('Variant unavailable'))
    });

    const result = await runRelayAttempt(db, opts);

    expect(result).toMatchObject({ outcome: 'dead_lettered', failureKind: 'permanent' });
    expect(mockMarkRelayDeadLettered).toHaveBeenCalledWith(
      db,
      'site-1',
      'relay-1',
      'permanent',
      'Variant unavailable',
      null
    );
    expect(mockMarkRelayRetrying).not.toHaveBeenCalled();
  });

  it('dead-letters a transient failure once the attempts are used up', async () => {
    mockEnsureFulfillmentRelay.mockResolvedValue(relay({ attempts: 7, max_attempts: 8 }));
    const opts = options({
      execute: vi.fn().mockRejectedValue(RelayFailure.transient('HTTP 503'))
    });

    const result = await runRelayAttempt(db, opts);

    expect(result).toMatchObject({
      outcome: 'dead_lettered',
      failureKind: 'transient',
      attempts: 8
    });
    expect(mockMarkRelayDeadLettered).toHaveBeenCalled();
  });

  it('treats an unexpected error as transient rather than giving up', async () => {
    const opts = options({ execute: vi.fn().mockRejectedValue(new Error('boom')) });

    const result = await runRelayAttempt(db, opts);

    expect(result).toMatchObject({ outcome: 'retrying', error: 'boom' });
  });

  it('alerts every store admin when a relay dead-letters', async () => {
    mockGetAdminUsers.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
    const opts = options({
      execute: vi.fn().mockRejectedValue(RelayFailure.permanent('No provider'))
    });

    await runRelayAttempt(db, opts);

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      db,
      'site-1',
      expect.objectContaining({
        user_id: 'admin-1',
        type: 'fulfillment_failed',
        priority: 'urgent',
        action_url: '/admin/orders/fulfillment'
      })
    );
  });

  it('records every attempt in the activity log', async () => {
    await runRelayAttempt(db, options());

    expect(mockLogActivity).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        siteId: 'site-1',
        entityType: 'order',
        entityId: 'order-1',
        severity: 'info'
      })
    );
  });

  it('still reports the outcome when logging and alerting fail', async () => {
    mockLogActivity.mockRejectedValue(new Error('logging is down'));
    mockGetAdminUsers.mockRejectedValue(new Error('users table is down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const opts = options({
      execute: vi.fn().mockRejectedValue(RelayFailure.permanent('No provider'))
    });

    const result = await runRelayAttempt(db, opts);

    expect(result).toMatchObject({ outcome: 'dead_lettered' });
    expect(mockMarkRelayDeadLettered).toHaveBeenCalled();
  });
});
