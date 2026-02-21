-- Migration: 0082_fix_revisions_schema
-- Description: Fix revisions table schema to match application code expectations
-- Migration 0081 renamed columns and removed is_current, breaking compatibility
-- with the revision service. This restores the expected schema.
-- Rollback: See instructions at bottom

-- Step 1: Drop the broken table (no data to preserve)
DROP TABLE IF EXISTS revisions;

-- Step 2: Recreate with correct column names matching the application code
CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'product', 'category', 'theme', 'site', 'component', 'layout', 'content_type', 'content_entry')),
  entity_id TEXT NOT NULL,
  revision_hash TEXT NOT NULL UNIQUE,
  parent_revision_id TEXT,
  data TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  is_current INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_revision_id) REFERENCES revisions(id) ON DELETE SET NULL
);

-- Step 3: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_revisions_site_entity ON revisions(site_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_hash ON revisions(revision_hash);
CREATE INDEX IF NOT EXISTS idx_revisions_parent ON revisions(parent_revision_id);
CREATE INDEX IF NOT EXISTS idx_revisions_current ON revisions(entity_type, entity_id, is_current);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions(entity_type, entity_id, created_at DESC);

-- ROLLBACK INSTRUCTIONS:
-- DROP TABLE IF EXISTS revisions;
-- Then re-run migration 0081 to restore the 0081 schema
