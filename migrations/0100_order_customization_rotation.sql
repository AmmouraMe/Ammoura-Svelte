-- Migration 0100: persist design rotation on ordered items.
--
-- The customizer now lets shoppers rotate their artwork. Without this column
-- the placement recorded on the order would silently differ from what the
-- customer approved on screen — and the print file is generated from the
-- order, not from the cart.
--
-- Rollback: SQLite cannot drop a column in older versions; leaving it is
-- harmless since it defaults to 0 (no rotation).

ALTER TABLE order_item_customizations ADD COLUMN rotation REAL NOT NULL DEFAULT 0;
