-- Migration: 0088_customization_media_fields
-- Description: Add image, audio, and video field types to product customization fields
--              with media quality requirements (min dimensions, duration, bitrate, etc.)
-- Rollback: See below for reversal steps

-- Expand the field_type CHECK constraint to include media types
-- SQLite doesn't support ALTER TABLE to modify constraints, so we recreate the table

-- Step 1: Create new table with expanded field_type constraint and media_requirements column
CREATE TABLE IF NOT EXISTS product_customization_fields_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'color', 'number', 'image', 'audio', 'video')),
  options TEXT,
  placeholder TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  max_length INTEGER,
  min_value REAL,
  max_value REAL,
  default_value TEXT,
  price_modifier REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  media_requirements TEXT, -- JSON object with quality requirements for media fields
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Step 2: Copy existing data
INSERT INTO product_customization_fields_new (
  id, site_id, product_id, name, field_type, options, placeholder,
  required, max_length, min_value, max_value, default_value,
  price_modifier, sort_order, media_requirements, created_at, updated_at
)
SELECT
  id, site_id, product_id, name, field_type, options, placeholder,
  required, max_length, min_value, max_value, default_value,
  price_modifier, sort_order, NULL, created_at, updated_at
FROM product_customization_fields;

-- Step 3: Drop old table and rename new one
DROP TABLE IF EXISTS product_customization_fields;
ALTER TABLE product_customization_fields_new RENAME TO product_customization_fields;

-- Step 4: Recreate index
CREATE INDEX IF NOT EXISTS idx_customization_fields_product ON product_customization_fields(site_id, product_id);
