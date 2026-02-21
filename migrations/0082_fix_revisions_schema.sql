-- Migration: 0082_fix_revisions_schema
-- Description: Expand revisions CHECK constraint to include CMS entity types
-- (content_type, content_entry) while preserving existing revision data.
-- Since SQLite cannot ALTER CHECK constraints, we recreate the table.
-- Rollback: DROP TABLE IF EXISTS revisions; then re-run migration 0067

-- Step 1: Drop existing indexes (required before dropping the table)
DROP INDEX IF EXISTS idx_revisions_site_entity;
DROP INDEX IF EXISTS idx_revisions_entity;
DROP INDEX IF EXISTS idx_revisions_hash;
DROP INDEX IF EXISTS idx_revisions_parent;
DROP INDEX IF EXISTS idx_revisions_current;
DROP INDEX IF EXISTS idx_revisions_created_at;

-- Step 2: Create new table with expanded CHECK constraint
-- Omit self-referencing FK to avoid constraint issues during bulk INSERT
CREATE TABLE IF NOT EXISTS revisions_new (
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
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Step 3: Copy existing revision data with explicit column mapping
INSERT OR IGNORE INTO revisions_new (id, site_id, entity_type, entity_id, revision_hash, parent_revision_id, data, user_id, created_at, is_current, message)
SELECT id, site_id, entity_type, entity_id, revision_hash, parent_revision_id, data, user_id, created_at, is_current, message
FROM revisions;

-- Step 4: Drop old table and rename new one
DROP TABLE IF EXISTS revisions;
ALTER TABLE revisions_new RENAME TO revisions;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_revisions_site_entity ON revisions(site_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_hash ON revisions(revision_hash);
CREATE INDEX IF NOT EXISTS idx_revisions_parent ON revisions(parent_revision_id);
CREATE INDEX IF NOT EXISTS idx_revisions_current ON revisions(entity_type, entity_id, is_current);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions(entity_type, entity_id, created_at DESC);
