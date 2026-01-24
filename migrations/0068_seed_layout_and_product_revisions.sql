-- Migration: 0068_seed_layout_and_product_revisions
-- Description: Create initial published revisions for layouts and products
-- This establishes the default state that can be restored via the reset functionality
-- Rollback: 
--   DELETE FROM revisions WHERE entity_type = 'layout';
--   DELETE FROM revisions WHERE entity_type = 'product';

-- ============================================================================
-- LAYOUT REVISIONS
-- ============================================================================
-- Create initial revision for each layout, capturing its current widgets configuration
-- The revision data structure matches LayoutRevisionData interface:
--   { name, description, slug, is_default, widgets: LayoutWidgetData[] }

INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-layout-' || lower(hex(randomblob(8))),
  l.site_id,
  'layout',
  CAST(l.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', l.name,
    'description', COALESCE(l.description, ''),
    'slug', l.slug,
    'is_default', l.is_default,
    'widgets', COALESCE(
      (SELECT json_group_array(
        json_object(
          'id', lw.id,
          'type', lw.type,
          'position', lw.position,
          'config', json(lw.config)
        )
      ) FROM layout_widgets lw WHERE lw.layout_id = l.id ORDER BY lw.position),
      '[]'
    )
  ),
  1,
  'Initial layout configuration',
  strftime('%s', 'now')
FROM layouts l
WHERE NOT EXISTS (
  SELECT 1 FROM revisions r 
  WHERE r.entity_type = 'layout' AND r.entity_id = CAST(l.id AS TEXT)
);

-- ============================================================================
-- PRODUCT REVISIONS
-- ============================================================================
-- Create initial revision for each product, capturing its current state
-- The revision data structure matches ProductRevisionData interface:
--   { name, description, price, image, category, stock, type, tags, fulfillmentOptions, shippingOptions }

INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-product-' || lower(hex(randomblob(8))),
  p.site_id,
  'product',
  p.id,
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', p.name,
    'description', COALESCE(p.description, ''),
    'price', p.price,
    'image', COALESCE(p.image, ''),
    'category', COALESCE(p.category, ''),
    'stock', COALESCE(p.stock, 0),
    'type', COALESCE(p.type, 'physical'),
    'tags', COALESCE(json(p.tags), '[]'),
    'fulfillmentOptions', COALESCE(
      (SELECT json_group_array(
        json_object(
          'id', pfo.id,
          'provider_id', pfo.provider_id,
          'cost', pfo.cost,
          'sort_order', pfo.sort_order
        )
      ) FROM product_fulfillment_options pfo WHERE pfo.product_id = p.id ORDER BY pfo.sort_order),
      '[]'
    ),
    'shippingOptions', COALESCE(
      (SELECT json_group_array(
        json_object(
          'id', pso.id,
          'shipping_option_id', pso.shipping_option_id,
          'is_default', pso.is_default,
          'price_override', pso.price_override,
          'threshold_override', pso.threshold_override
        )
      ) FROM product_shipping_options pso WHERE pso.product_id = p.id),
      '[]'
    )
  ),
  1,
  'Initial product configuration',
  strftime('%s', 'now')
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM revisions r 
  WHERE r.entity_type = 'product' AND r.entity_id = p.id
);

-- ============================================================================
-- FIX COMPONENT REVISIONS - Extract children to top level
-- ============================================================================
-- Update existing component revisions to have children at the top level of data
-- instead of nested inside config.children
-- This ensures consistency with how the code expects to read revision data

UPDATE revisions
SET data = json_set(
  data,
  '$.children',
  json_extract(data, '$.config.children')
)
WHERE entity_type = 'component'
  AND json_extract(data, '$.config.children') IS NOT NULL
  AND json_extract(data, '$.children') IS NULL;

-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration:
-- DELETE FROM revisions WHERE entity_type = 'layout';
-- DELETE FROM revisions WHERE entity_type = 'product';
-- UPDATE revisions SET data = json_remove(data, '$.children') WHERE entity_type = 'component';
