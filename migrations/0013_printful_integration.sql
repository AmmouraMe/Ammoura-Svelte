-- Migration: 0013_printful_integration
-- Description: Add tables for Printful product and order syncing
-- Rollback: DROP TABLE IF EXISTS printful_products; DROP TABLE IF EXISTS printful_orders;

-- Store Printful product sync data
CREATE TABLE IF NOT EXISTS printful_products (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  printful_product_id INTEGER NOT NULL,
  printful_data TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (site_id, printful_product_id),
  UNIQUE (site_id, product_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_printful_products_site ON printful_products(site_id);
CREATE INDEX IF NOT EXISTS idx_printful_products_product ON printful_products(product_id);
CREATE INDEX IF NOT EXISTS idx_printful_products_printful_id ON printful_products(printful_product_id);

-- Store Printful order data
CREATE TABLE IF NOT EXISTS printful_orders (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  printful_order_id INTEGER NOT NULL,
  printful_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  synced_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (site_id, order_id),
  UNIQUE (site_id, printful_order_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_printful_orders_site ON printful_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_printful_orders_order ON printful_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_printful_orders_status ON printful_orders(status);
CREATE INDEX IF NOT EXISTS idx_printful_orders_created ON printful_orders(created_at);
