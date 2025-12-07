-- Migration: 0053_add_component_revisions
-- Description: Add 'component' as an entity type in the revisions table for tracking component changes
-- Rollback: See instructions below

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly.
-- We need to recreate the table with the updated constraint.
-- However, since we're adding a new valid value that won't break existing data,
-- we can use a pragmatic approach: remove the constraint and add it back.

-- Step 1: Create a new table with the updated CHECK constraint
CREATE TABLE IF NOT EXISTS revisions_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'product', 'category', 'theme', 'site', 'component')),
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

-- Step 2: Copy existing data from the old table
INSERT INTO revisions_new (id, site_id, entity_type, entity_id, revision_hash, parent_revision_id, data, user_id, created_at, is_current, message)
SELECT id, site_id, entity_type, entity_id, revision_hash, parent_revision_id, data, user_id, created_at, is_current, message
FROM revisions;

-- Step 3: Drop the old table
DROP TABLE IF EXISTS revisions;

-- Step 4: Rename the new table to the original name
ALTER TABLE revisions_new RENAME TO revisions;

-- Step 5: Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_revisions_site_entity ON revisions(site_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_hash ON revisions(revision_hash);
CREATE INDEX IF NOT EXISTS idx_revisions_parent ON revisions(parent_revision_id);
CREATE INDEX IF NOT EXISTS idx_revisions_current ON revisions(entity_type, entity_id, is_current);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions(entity_type, entity_id, created_at DESC);

-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration, you would need to recreate the table without 'component'
-- This should only be done if no component revisions have been created yet.
-- ALTER TABLE revisions RENAME TO revisions_old;
-- CREATE TABLE revisions (...with original CHECK constraint...);
-- INSERT INTO revisions SELECT * FROM revisions_old WHERE entity_type != 'component';
-- DROP TABLE revisions_old;
