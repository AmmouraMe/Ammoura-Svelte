-- Migration 0096: order-side persistence for product customization.
--
-- Until now, a customer's uploaded artwork (customization zones) and
-- personalization field values were captured in the cart but DROPPED at
-- checkout — only equipment values reached the order. These two tables
-- carry the customer's design through to the order so the store owner (or
-- a fulfillment provider) can actually produce it.
--
--   order_item_customizations: one row per placed artwork zone on an order item.
--   order_item_field_values:   one row per personalization field value.
--
-- Rows are attached to a specific order_items.id at order-creation time, so
-- two lines of the same product with different designs stay distinct.
--
-- Rollback:
--   DROP TABLE IF EXISTS order_item_field_values;
--   DROP TABLE IF EXISTS order_item_customizations;

-- Artwork placed on a customization zone, per order item.
CREATE TABLE IF NOT EXISTS order_item_customizations (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  -- media_id points at a full-resolution R2-backed media_library entry once the
  -- customer-side upload path lands; image_url is the directly-renderable source
  -- (an /api/media/... URL in prod, a data: URL in local dev today).
  media_id TEXT,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  offset_x_percent REAL NOT NULL DEFAULT 0,
  offset_y_percent REAL NOT NULL DEFAULT 0,
  scale REAL NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_item_customizations_item
  ON order_item_customizations(order_item_id);

-- Personalization field values (text/select/color/number/media), per order item.
CREATE TABLE IF NOT EXISTS order_item_field_values (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  value TEXT NOT NULL,
  price_modifier REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_item_field_values_item
  ON order_item_field_values(order_item_id);
