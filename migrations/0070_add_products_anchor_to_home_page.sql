-- Migration: 0070_add_products_anchor_to_home_page
-- Description: Add anchorName="products" to the home-products container so the #products link works
-- This fixes the navigation bar's "Products" button linking to /#products
-- Rollback: Update the same revision and remove the anchorName property from home-products config

-- Update the builtin home page revision to add anchorName to the products section
UPDATE page_revisions
SET widgets_snapshot = REPLACE(
  widgets_snapshot,
  '"id":"home-products","type":"container","position":2,"config":{',
  '"id":"home-products","type":"container","position":2,"config":{"anchorName":"products",'
)
WHERE page_id = 'builtin-home-page'
  AND widgets_snapshot LIKE '%"id":"home-products"%'
  AND widgets_snapshot NOT LIKE '%"anchorName":"products"%';
