-- Migration 0099: support customer-uploaded design artwork.
--
-- Two concerns, both created by opening uploads to the public storefront:
--
-- 1. Provenance. Customer artwork must not be indistinguishable from the
--    owner's own media library assets. `source` separates them so the library
--    UI can filter, and so customer art is never offered as site content.
-- 2. Abuse. The design upload endpoint is unauthenticated by nature (shoppers
--    are not logged in), so it needs a rate limit. There is no KV binding on
--    this project, so the counter lives in D1.
--
-- Rollback:
--   DROP TABLE customer_upload_events;
--   (media_library.source is additive with a default; leaving it is harmless.)

ALTER TABLE media_library ADD COLUMN source TEXT NOT NULL DEFAULT 'library';

CREATE INDEX IF NOT EXISTS idx_media_library_source
  ON media_library(site_id, source);

-- One row per accepted upload. `ip_hash` is a salted digest, never a raw IP.
CREATE TABLE IF NOT EXISTS customer_upload_events (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_customer_upload_events_window
  ON customer_upload_events(site_id, ip_hash, created_at);
