-- Migration: 0087_equipment
-- Description: Add equipment tables for tracking equipment needed to fulfill product orders.
--   equipment: Defines reusable equipment entities per site.
--   equipment_fields: Defines required/optional fields per equipment.
--   product_equipment: Many-to-many linking products to equipment.
--   order_item_equipment_values: Stores customer-submitted values per order item.
-- Rollback:
--   DROP TABLE IF EXISTS order_item_equipment_values;
--   DROP TABLE IF EXISTS product_equipment;
--   DROP TABLE IF EXISTS equipment_fields;
--   DROP TABLE IF EXISTS equipment;

-- Equipment definitions per site
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_equipment_site ON equipment(site_id);
CREATE INDEX IF NOT EXISTS idx_equipment_active ON equipment(site_id, is_active);

-- Fields for each piece of equipment
CREATE TABLE IF NOT EXISTS equipment_fields (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'color', 'number', 'date')),
  options TEXT, -- JSON array for select fields
  placeholder TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  max_length INTEGER,
  min_value REAL,
  max_value REAL,
  default_value TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_equipment_fields_equipment ON equipment_fields(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_fields_site ON equipment_fields(site_id);

-- Many-to-many: products <-> equipment
CREATE TABLE IF NOT EXISTS product_equipment (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_equipment_unique ON product_equipment(site_id, product_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_product_equipment_product ON product_equipment(product_id);
CREATE INDEX IF NOT EXISTS idx_product_equipment_equipment ON product_equipment(equipment_id);

-- Customer-submitted equipment field values per order item
CREATE TABLE IF NOT EXISTS order_item_equipment_values (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  equipment_field_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
  FOREIGN KEY (equipment_field_id) REFERENCES equipment_fields(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_equipment_values_item ON order_item_equipment_values(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_equipment_values_equipment ON order_item_equipment_values(equipment_id);
