-- Migration: 0043_fix_navbar_default_children
-- Description: Fix Navigation Bar component to use flex layout structure (same as reset)
-- The Navigation Bar component should NOT have a navbar widget as a child.
-- Instead, it should have the flex layout structure with heading, links, and actions.
-- This aligns the default with what the reset button produces.
-- Rollback: Re-run migration 0042

-- Delete any existing child widgets for the Navigation Bar component
DELETE FROM component_widgets 
WHERE component_id IN (
  SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1
);

-- Create the default flex layout structure that matches getDefaultNavbarChildren()
-- Structure: Main Flex (space-between) > Left Flex (start) + Right Flex (end)
-- Left: Logo/Sitename (heading)
-- Right: Navigation links container + Actions container

-- Step 1: Create main container flex widget
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-main-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'flex' as type,
  0 as position,
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'flexJustifyContent', json_object('desktop', 'space-between', 'tablet', 'space-between', 'mobile', 'space-between'),
    'flexAlignItems', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexWrap', json_object('desktop', 'nowrap', 'tablet', 'nowrap', 'mobile', 'nowrap'),
    'flexGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 8),
    'flexPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
      'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
      'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
    ),
    'flexBackground', 'var(--color-bg-primary)',
    'flexWidth', json_object('desktop', '100%', 'tablet', '100%', 'mobile', '100%'),
    'flexMaxWidth', json_object('desktop', '1400px', 'tablet', '100%', 'mobile', '100%'),
    'flexMargin', json_object(
      'desktop', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'children', json_array()
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Step 2: Create left container flex widget (for logo)
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-left-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'flex' as type,
  0 as position,
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'flexJustifyContent', json_object('desktop', 'flex-start', 'tablet', 'flex-start', 'mobile', 'flex-start'),
    'flexAlignItems', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexWrap', json_object('desktop', 'nowrap', 'tablet', 'nowrap', 'mobile', 'nowrap'),
    'flexGap', json_object('desktop', 8, 'tablet', 8, 'mobile', 8),
    'flexPadding', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'flexBackground', 'transparent',
    'children', json_array()
  ) as config,
  (SELECT id FROM component_widgets WHERE component_id = c.id AND type = 'flex' AND parent_id IS NULL LIMIT 1) as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Step 3: Create logo heading widget
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-logo-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'heading' as type,
  0 as position,
  json_object(
    'heading', 'Store',
    'level', 1,
    'alignment', 'left',
    'color', 'var(--color-text-primary)',
    'fontSize', json_object('desktop', 24, 'tablet', 22, 'mobile', 20),
    'fontWeight', 'bold',
    'url', '/'
  ) as config,
  (SELECT id FROM component_widgets WHERE component_id = c.id AND type = 'flex' AND id LIKE 'widget-left-%' LIMIT 1) as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Step 4: Create right container flex widget (for links and actions)
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-right-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'flex' as type,
  1 as position,
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'flexJustifyContent', json_object('desktop', 'flex-end', 'tablet', 'flex-end', 'mobile', 'flex-end'),
    'flexAlignItems', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexWrap', json_object('desktop', 'nowrap', 'tablet', 'nowrap', 'mobile', 'nowrap'),
    'flexGap', json_object('desktop', 24, 'tablet', 16, 'mobile', 12),
    'flexPadding', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'flexBackground', 'transparent',
    'children', json_array()
  ) as config,
  (SELECT id FROM component_widgets WHERE component_id = c.id AND type = 'flex' AND parent_id IS NULL LIMIT 1) as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Step 5: Create links container flex widget
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-links-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'flex' as type,
  0 as position,
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'flexJustifyContent', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexAlignItems', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexWrap', json_object('desktop', 'nowrap', 'tablet', 'nowrap', 'mobile', 'wrap'),
    'flexGap', json_object('desktop', 24, 'tablet', 16, 'mobile', 12),
    'flexPadding', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'flexBackground', 'transparent',
    'navLinks', json_array(
      json_object('text', 'Home', 'url', '/'),
      json_object('text', 'Products', 'url', '/products'),
      json_object('text', 'About', 'url', '/about'),
      json_object('text', 'Contact', 'url', '/contact')
    )
  ) as config,
  (SELECT id FROM component_widgets WHERE component_id = c.id AND type = 'flex' AND id LIKE 'widget-right-%' LIMIT 1) as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Step 6: Create actions container flex widget
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-actions-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'flex' as type,
  1 as position,
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'flexJustifyContent', json_object('desktop', 'flex-end', 'tablet', 'flex-end', 'mobile', 'flex-end'),
    'flexAlignItems', json_object('desktop', 'center', 'tablet', 'center', 'mobile', 'center'),
    'flexWrap', json_object('desktop', 'nowrap', 'tablet', 'nowrap', 'mobile', 'nowrap'),
    'flexGap', json_object('desktop', 12, 'tablet', 8, 'mobile', 8),
    'flexPadding', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'flexBackground', 'transparent',
    'showCart', 1,
    'showAuth', 1,
    'showThemeToggle', 1
  ) as config,
  (SELECT id FROM component_widgets WHERE component_id = c.id AND type = 'flex' AND id LIKE 'widget-right-%' LIMIT 1) as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;

-- Update the children arrays in parent containers to reference their child IDs
-- Main container should have left and right as children
UPDATE component_widgets
SET config = json_set(
  config,
  '$.children',
  (
    SELECT json_group_array(cw2.id)
    FROM component_widgets cw2
    WHERE cw2.parent_id = component_widgets.id
    ORDER BY cw2.position
  )
)
WHERE type = 'flex' AND parent_id IS NULL
  AND component_id IN (SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1);

-- Left container should have logo as child
UPDATE component_widgets
SET config = json_set(
  config,
  '$.children',
  (
    SELECT json_group_array(cw2.id)
    FROM component_widgets cw2
    WHERE cw2.parent_id = component_widgets.id
    ORDER BY cw2.position
  )
)
WHERE id LIKE 'widget-left-%'
  AND component_id IN (SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1);

-- Right container should have links and actions as children
UPDATE component_widgets
SET config = json_set(
  config,
  '$.children',
  (
    SELECT json_group_array(cw2.id)
    FROM component_widgets cw2
    WHERE cw2.parent_id = component_widgets.id
    ORDER BY cw2.position
  )
)
WHERE id LIKE 'widget-right-%'
  AND component_id IN (SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1);
