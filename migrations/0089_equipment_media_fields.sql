-- Migration: 0089_equipment_media_fields
-- Description: Add image, audio, and video field types to equipment_fields,
--   plus a media_requirements column to store quality constraints (JSON).
-- Rollback:
--   DROP TABLE IF EXISTS equipment_fields;
--   (then re-run 0087_equipment.sql to recreate the original table)

-- SQLite requires table recreation to modify CHECK constraints.

-- Step 1: Rename existing table
ALTER TABLE equipment_fields RENAME TO equipment_fields_old;

-- Step 2: Create new table with expanded CHECK and media_requirements column
CREATE TABLE equipment_fields (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'color', 'number', 'date', 'image', 'audio', 'video')),
  options TEXT,
  placeholder TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  max_length INTEGER,
  min_value REAL,
  max_value REAL,
  default_value TEXT,
  media_requirements TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Step 3: Copy existing data (media_requirements defaults to NULL)
INSERT INTO equipment_fields (id, site_id, equipment_id, name, field_type, options, placeholder, required, max_length, min_value, max_value, default_value, media_requirements, sort_order, created_at, updated_at)
SELECT id, site_id, equipment_id, name, field_type, options, placeholder, required, max_length, min_value, max_value, default_value, NULL, sort_order, created_at, updated_at
FROM equipment_fields_old;

-- Step 4: Drop old table
DROP TABLE equipment_fields_old;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_equipment_fields_equipment ON equipment_fields(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_fields_site ON equipment_fields(site_id);
