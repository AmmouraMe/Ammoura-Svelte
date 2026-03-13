-- Migration: 0084_product_customization_zones
-- Description: Add product customization zones for customer upload previews
-- Rollback: DROP TABLE IF EXISTS product_customization_zones;

CREATE TABLE IF NOT EXISTS product_customization_zones (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  media_id TEXT,
  name TEXT NOT NULL,
  x_percent REAL NOT NULL DEFAULT 10,
  y_percent REAL NOT NULL DEFAULT 10,
  width_percent REAL NOT NULL DEFAULT 30,
  height_percent REAL NOT NULL DEFAULT 30,
  max_file_size INTEGER DEFAULT 10485760,
  allowed_types TEXT DEFAULT '["image/png","image/jpeg","image/webp","image/svg+xml"]',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customization_zones_product
  ON product_customization_zones(site_id, product_id);
