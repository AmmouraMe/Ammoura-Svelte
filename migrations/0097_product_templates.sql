-- Migration 0097: curated product templates + print-area geometry.
--
-- Templates are the source of truth for a print-on-demand product's printable
-- geometry. Each template (t-shirt, all-over hoodie, mug, poster, ...) carries
-- one or more print areas whose physical size + required DPI are sized from
-- Printful's published specs. An owner starts a product from a template and
-- gets sane, producible print areas instead of hand-typed percentages.
--
-- Templates are GLOBAL (curated by us, shared across all sites), so no site_id.
-- Values are provider-agnostic; the Printful catalog-ingestion phase (P3) will
-- refine these against Printful's real product templates and add the
-- placement mapping needed for auto-fulfillment.
--
-- Rollback:
--   ALTER TABLE product_customization_zones DROP COLUMN print_area_id;  -- (D1: rebuild)
--   ALTER TABLE products DROP COLUMN fulfillment_mode;
--   ALTER TABLE products DROP COLUMN template_id;
--   DROP TABLE IF EXISTS template_print_areas;
--   DROP TABLE IF EXISTS product_templates;

CREATE TABLE IF NOT EXISTS product_templates (
  id TEXT PRIMARY KEY,
  -- Stable machine key (e.g. 'tshirt-unisex'); used by seeds and lookups.
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  -- Coarse product family: tee | hoodie | mug | poster | ...
  product_type TEXT NOT NULL,
  -- Base mockup image the customer/owner positions artwork over.
  base_image TEXT NOT NULL,
  -- Suggested retail price when seeding a product from this template.
  default_price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | hidden
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_product_templates_status
  ON product_templates(status, sort_order);

CREATE TABLE IF NOT EXISTS template_print_areas (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  key TEXT NOT NULL,   -- e.g. 'front', 'back', 'all_over', 'wrap'
  name TEXT NOT NULL,  -- human label, e.g. 'Front Print'
  -- Placement identity, provider-agnostic: front | back | sleeve | all_over | wrap
  placement TEXT NOT NULL,
  -- Physical print dimensions + required print resolution.
  phys_width REAL NOT NULL,
  phys_height REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'in', -- in | mm
  required_dpi INTEGER NOT NULL DEFAULT 150,
  -- Printable rectangle as % of the base image (where art may sit).
  x_percent REAL NOT NULL,
  y_percent REAL NOT NULL,
  width_percent REAL NOT NULL,
  height_percent REAL NOT NULL,
  allowed_types TEXT NOT NULL DEFAULT '["image/png","image/jpeg","image/webp","image/svg+xml"]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (template_id) REFERENCES product_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_print_areas_template
  ON template_print_areas(template_id, sort_order);

-- Link a product to the template it was authored from, and how it's fulfilled.
ALTER TABLE products ADD COLUMN template_id TEXT;
-- manual = owner prints from a print-ready export; printful = auto-fulfilled.
ALTER TABLE products ADD COLUMN fulfillment_mode TEXT NOT NULL DEFAULT 'manual';

-- Link a customer-facing customization zone back to the template print area it
-- was materialized from, so its DPI / physical size / placement are known.
-- Null for legacy free-percentage zones authored before templates existed.
ALTER TABLE product_customization_zones ADD COLUMN print_area_id TEXT;
