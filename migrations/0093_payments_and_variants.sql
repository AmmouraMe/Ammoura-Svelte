-- Migration: 0093_payments_and_variants
-- Description: Real payments (Stripe) + real Printful order fulfillment need
--   two things the schema doesn't have yet: product variants (size/color,
--   with an optional link to a Printful sync variant for ordering) and a
--   paid/unpaid distinction on orders separate from the existing fulfillment
--   `status` column. Also adds a shared-secret column so the Printful webhook
--   can verify requests (Printful v1 has no HMAC signature to check against).
-- Rollback: DROP TABLE IF EXISTS product_variants;
--           ALTER TABLE orders DROP COLUMN payment_status;
--           ALTER TABLE orders DROP COLUMN stripe_session_id;
--           ALTER TABLE orders DROP COLUMN stripe_payment_intent_id;
--           ALTER TABLE order_items DROP COLUMN variant_id;
--           ALTER TABLE fulfillment_providers DROP COLUMN webhook_token;

-- Generic (not Printful-specific) product variants — size/color/etc, each
-- optionally mapped to a Printful sync variant for real order placement.
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  label TEXT NOT NULL, -- e.g. "Medium / Black"
  size TEXT,
  color TEXT,
  sku TEXT,
  price REAL NOT NULL,
  stock_quantity INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  printful_sync_variant_id INTEGER, -- used to place real Printful orders
  printful_variant_id INTEGER, -- catalog id, display only
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(site_id, product_id);

-- Payment status is distinct from the existing fulfillment `status` column
-- (pending|processing|shipped|delivered|cancelled) — an order can be
-- 'processing' fulfillment-wise while still unpaid didn't previously exist.
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed'));
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session
  ON orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE order_items ADD COLUMN variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL;

-- Shared secret the owner embeds in the webhook URL they register with
-- Printful, checked on inbound webhook requests.
ALTER TABLE fulfillment_providers ADD COLUMN webhook_token TEXT;
