-- Migration: 0104_fulfillment_relays
-- Description: A paid order whose relay to a fulfillment provider fails is
--   money taken with nothing shipped. Until now the relay was a single
--   best-effort call whose failure went to console.error and nowhere else.
--   This table is the durable record of that hand-off: one row per
--   (site, order, provider), carrying the attempt count, the next time it
--   may be retried, the last error and the raw provider response, so a
--   failed relay is retried with backoff and — when it cannot succeed —
--   lands in a visible dead-letter state instead of a lost log line.
--
--   Cloudflare Queues would be the natural transport, but
--   @sveltejs/adapter-cloudflare emits a fetch-only _worker.js, so neither a
--   queue consumer nor a Cron Trigger scheduled() handler has anywhere to
--   attach. A D1 table swept by an authenticated endpoint needs no new
--   binding and behaves the same locally, in preview and in production.
--   See docs/FULFILLMENT_RELAY.md.
--
-- Rollback: DROP TABLE IF EXISTS fulfillment_relays;

CREATE TABLE IF NOT EXISTS fulfillment_relays (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  -- Matches fulfillment_providers.provider_type; the machinery is generic
  -- even though Printful is the only provider that relays orders today.
  provider_type TEXT NOT NULL DEFAULT 'printful',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'dead_lettered')),
  -- Number of attempts made so far, including the first one.
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  -- Unix seconds. NULL once the relay is settled (succeeded or dead-lettered).
  next_attempt_at INTEGER,
  last_attempt_at INTEGER,
  -- Why the last attempt failed: 'transient' retries, 'permanent' does not.
  failure_kind TEXT CHECK (failure_kind IN ('transient', 'permanent')),
  last_error TEXT,
  -- Raw provider response body from the last failure, for the admin screen.
  last_response TEXT,
  -- The provider's own order id once the order exists on their side. Set on
  -- success and used to keep retries idempotent.
  external_order_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (site_id, order_id, provider_type),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- The sweep query: pending relays whose backoff has elapsed, across all sites.
CREATE INDEX IF NOT EXISTS idx_fulfillment_relays_due
  ON fulfillment_relays(status, next_attempt_at);

-- The admin screen: everything unshipped for one site, newest first.
CREATE INDEX IF NOT EXISTS idx_fulfillment_relays_site_status
  ON fulfillment_relays(site_id, status, created_at DESC);
