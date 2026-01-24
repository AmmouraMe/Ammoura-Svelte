-- Migration: 0045_remove_navbar_flex_children
-- Description: Replace flex children with a single Container primitive for Navigation Bar
-- The NavBar.svelte component renders its own layout from config.
-- A Container primitive is added as the default child for editing in the builder.
-- Rollback: Re-run migration 0043_fix_navbar_default_children.sql

-- Delete all existing child widgets from Navigation Bar components
DELETE FROM component_widgets 
WHERE component_id IN (
  SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1
);

-- Add a single Container primitive as the default child
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  'widget-container-' || hex(randomblob(4)) as id,
  c.id as component_id,
  'container' as type,
  0 as position,
  json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
      'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
      'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
    ),
    'containerMargin', json_object(
      'desktop', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
      'tablet', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'containerBackground', 'transparent',
    'containerBorderRadius', 0,
    'containerMaxWidth', '1400px',
    'children', json_array()
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;
