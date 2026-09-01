import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ensureFulfillmentRelay,
  getDueRelays,
  getFulfillmentRelay,
  getRecentSucceededRelays,
  getUnsettledRelays,
  getUntrackedPaidOrders,
  markRelayDeadLettered,
  markRelayRetrying,
  markRelaySucceeded,
  reopenRelay,
  type FulfillmentRelay
} from './fulfillment-relays';

interface RecordedCall {
  sql: string;
  params: unknown[];
}

/**
 * A D1 double that records every statement and returns queued results, so a
 * test can assert both the SQL shape (tenant scoping, in particular) and the
 * values bound to it.
 */
function createMockDb() {
  const calls: RecordedCall[] = [];
  const firstResults: unknown[] = [];
  const allResults: unknown[][] = [];
  const runResults: D1Result[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          const record: RecordedCall = { sql, params };
          return {
            async first() {
              calls.push(record);
              return firstResults.length > 0 ? firstResults.shift() : null;
            },
            async all() {
              calls.push(record);
              return { results: allResults.length > 0 ? allResults.shift() : [] };
            },
            async run() {
              calls.push(record);
              return runResults.length > 0 ? runResults.shift() : { meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  return {
    db: db as unknown as D1Database,
    calls,
    queueFirst: (value: unknown) => firstResults.push(value),
    queueAll: (value: unknown[]) => allResults.push(value),
    queueRun: (value: D1Result) => runResults.push(value)
  };
}

const relayRow: FulfillmentRelay = {
  id: 'relay-1',
  site_id: 'site-1',
  order_id: 'order-1',
  provider_type: 'printful',
  status: 'pending',
  attempts: 0,
  max_attempts: 8,
  next_attempt_at: null,
  last_attempt_at: null,
  failure_kind: null,
  last_error: null,
  last_response: null,
  external_order_id: null,
  created_at: 1000,
  updated_at: 1000
};

describe('fulfillment-relays', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFulfillmentRelay', () => {
    it('scopes the lookup by site, order and provider', async () => {
      const { db, calls, queueFirst } = createMockDb();
      queueFirst(relayRow);

      const result = await getFulfillmentRelay(db, 'site-1', 'order-1', 'printful');

      expect(result).toEqual(relayRow);
      expect(calls[0].sql).toContain('site_id = ?');
      expect(calls[0].params).toEqual(['site-1', 'order-1', 'printful']);
    });

    it('returns null when there is no relay', async () => {
      const { db } = createMockDb();
      expect(await getFulfillmentRelay(db, 'site-1', 'order-1', 'printful')).toBeNull();
    });
  });

  describe('ensureFulfillmentRelay', () => {
    it('returns the existing relay without inserting', async () => {
      const { db, calls, queueFirst } = createMockDb();
      queueFirst(relayRow);

      const result = await ensureFulfillmentRelay(db, 'site-1', 'order-1', 'printful', 8);

      expect(result).toEqual(relayRow);
      expect(calls).toHaveLength(1);
      expect(calls[0].sql).toContain('SELECT');
    });

    it('inserts and returns the new relay when none exists', async () => {
      const { db, calls, queueFirst } = createMockDb();
      queueFirst(null); // initial lookup
      queueFirst(relayRow); // read back after insert

      const result = await ensureFulfillmentRelay(db, 'site-1', 'order-1', 'printful', 8);

      expect(result).toEqual(relayRow);
      expect(calls[1].sql).toContain('INSERT INTO fulfillment_relays');
      expect(calls[1].params).toContain(8);
    });

    it('throws if the row cannot be read back', async () => {
      const { db } = createMockDb();

      await expect(ensureFulfillmentRelay(db, 'site-1', 'order-1', 'printful', 8)).rejects.toThrow(
        /Failed to create fulfillment relay/
      );
    });
  });

  describe('outcome writers', () => {
    it('markRelaySucceeded clears the failure fields and records the provider id', async () => {
      const { db, calls } = createMockDb();

      await markRelaySucceeded(db, 'site-1', 'relay-1', '555');

      expect(calls[0].sql).toContain("status = 'succeeded'");
      expect(calls[0].sql).toContain('next_attempt_at = NULL');
      expect(calls[0].params).toContain('555');
      expect(calls[0].params).toContain('relay-1');
      expect(calls[0].params).toContain('site-1');
    });

    it('markRelayRetrying schedules the next attempt and keeps the error', async () => {
      const { db, calls } = createMockDb();

      await markRelayRetrying(db, 'site-1', 'relay-1', 4242, 'HTTP 503', '{"code":503}');

      expect(calls[0].sql).toContain("status = 'pending'");
      expect(calls[0].sql).toContain("failure_kind = 'transient'");
      expect(calls[0].params).toContain(4242);
      expect(calls[0].params).toContain('HTTP 503');
      expect(calls[0].params).toContain('{"code":503}');
    });

    it('markRelayDeadLettered stops any further automatic attempt', async () => {
      const { db, calls } = createMockDb();

      await markRelayDeadLettered(db, 'site-1', 'relay-1', 'permanent', 'Bad variant', null);

      expect(calls[0].sql).toContain("status = 'dead_lettered'");
      expect(calls[0].sql).toContain('next_attempt_at = NULL');
      expect(calls[0].params).toContain('permanent');
    });
  });

  describe('reopenRelay', () => {
    it('reports success when a dead-lettered relay was reopened', async () => {
      const { db, calls, queueRun } = createMockDb();
      queueRun({ meta: { changes: 1 } } as unknown as D1Result);

      const result = await reopenRelay(db, 'site-1', 'relay-1', 3);

      expect(result).toBe(true);
      expect(calls[0].sql).toContain("status = 'dead_lettered'");
      expect(calls[0].sql).toContain('max_attempts = attempts + ?');
      expect(calls[0].params).toContain(3);
    });

    it('reports failure when nothing was dead-lettered to reopen', async () => {
      const { db, queueRun } = createMockDb();
      queueRun({ meta: { changes: 0 } } as unknown as D1Result);

      expect(await reopenRelay(db, 'site-1', 'relay-1', 3)).toBe(false);
    });
  });

  describe('getDueRelays', () => {
    it('asks only for pending relays whose backoff has elapsed', async () => {
      const { db, calls, queueAll } = createMockDb();
      queueAll([relayRow]);

      const result = await getDueRelays(db, 5000, 25);

      expect(result).toEqual([relayRow]);
      expect(calls[0].sql).toContain("status = 'pending'");
      expect(calls[0].sql).toContain('next_attempt_at <= ?');
      expect(calls[0].params).toEqual([5000, 25]);
    });

    it('returns an empty list when D1 gives no results', async () => {
      const { db } = createMockDb();
      expect(await getDueRelays(db, 5000, 25)).toEqual([]);
    });
  });

  describe('site-scoped reads', () => {
    it('getUnsettledRelays asks for pending and dead-lettered rows for one site', async () => {
      const { db, calls, queueAll } = createMockDb();
      queueAll([relayRow]);

      await getUnsettledRelays(db, 'site-1');

      expect(calls[0].sql).toContain("status IN ('pending', 'dead_lettered')");
      expect(calls[0].params).toEqual(['site-1']);
    });

    it('getRecentSucceededRelays limits the list', async () => {
      const { db, calls, queueAll } = createMockDb();
      queueAll([]);

      await getRecentSucceededRelays(db, 'site-1', 10);

      expect(calls[0].sql).toContain("status = 'succeeded'");
      expect(calls[0].params).toEqual(['site-1', 10]);
    });

    it('getUntrackedPaidOrders finds paid Printful orders with no relay row', async () => {
      const { db, calls, queueAll } = createMockDb();
      queueAll([{ id: 'order-9', total: 42, created_at: 10 }]);

      const result = await getUntrackedPaidOrders(db, 'site-1');

      expect(result).toEqual([{ id: 'order-9', total: 42, created_at: 10 }]);
      expect(calls[0].sql).toContain("o.payment_status = 'paid'");
      expect(calls[0].sql).toContain('pv.printful_sync_variant_id IS NOT NULL');
      expect(calls[0].sql).toContain('fr.id IS NULL');
      expect(calls[0].params).toEqual(['site-1']);
    });
  });
});
