-- Migration 0102: a customer's design is more than one uploaded picture.
--
-- Until now an order carried exactly one image per print area, described by an
-- offset, a scale and a rotation. The design studio now places a *stack* of
-- elements — pictures and lines of text — each measured in inches on the
-- product, which is what a print file has to be generated from.
--
--   elements         JSON array of the placed elements, bottom of the stack
--                    first. The authoritative description of the design.
--   design_id        Stable across revisions of one design, so a store can see
--                    that two orders are the same artwork adjusted, not two
--                    unrelated jobs.
--   design_revision  Which revision this order carries. First send is 1.
--
-- The existing columns are kept and still written: they describe the FIRST
-- image element in the old terms, so the admin order view, exports and anything
-- else reading them keep working for single-picture designs, which is most of
-- them. Rows written before this migration have elements NULL and are read back
-- through the same legacy bridge the storefront uses.
--
-- Rollback: leaving these in place is harmless — `elements` and `design_id`
-- default to NULL and the reader falls back to the legacy columns, exactly as
-- it does for rows written before this migration.

ALTER TABLE order_item_customizations ADD COLUMN elements TEXT;
ALTER TABLE order_item_customizations ADD COLUMN design_id TEXT;
ALTER TABLE order_item_customizations ADD COLUMN design_revision INTEGER NOT NULL DEFAULT 1;
