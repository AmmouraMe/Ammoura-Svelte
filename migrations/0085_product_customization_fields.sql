-- Migration: 0085_product_customization_fields
-- Description: Add product customization fields for customer-editable products
-- These are admin-defined input fields (text, select, color, etc.) that customers fill in when ordering
-- Rollback: DROP TABLE IF EXISTS product_customization_fields;

CREATE TABLE IF NOT EXISTS product_customization_fields (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'color', 'number')),
  options TEXT, -- JSON array for select fields (e.g., ["Arial", "Times New Roman"])
  placeholder TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  max_length INTEGER,
  min_value REAL,
  max_value REAL,
  default_value TEXT,
  price_modifier REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customization_fields_product ON product_customization_fields(site_id, product_id);
