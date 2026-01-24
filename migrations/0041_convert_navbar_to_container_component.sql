-- Migration: 0041_convert_navbar_to_container_component
-- Description: Convert Navigation Bar component from type 'navbar' to type 'container'
-- This allows the Navigation Bar to be edited as a composition of widgets in the builder
-- The actual navbar rendering is handled by the layout which uses componentId reference
-- Rollback: UPDATE components SET type = 'navbar' WHERE id = 1;

-- Update Navigation Bar component to be a container type
-- This makes it editable in the builder as a composition of widgets
UPDATE components
SET 
  type = 'container',
  config = json_object(
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
    'containerBackground', 'var(--color-bg-primary)',
    'containerBorderRadius', 0,
    'containerMaxWidth', '100%',
    'containerGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 8),
    'containerJustifyContent', 'space-between',
    'containerAlignItems', 'center',
    'containerWrap', 'nowrap'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1;

-- Add a Container widget as the default child of the Navigation Bar component
-- Generate a UUID for the container widget
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
  c.id as component_id,
  'container' as type,
  0 as position,
  json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'containerMargin', json_object(
      'desktop', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'tablet', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'containerBackground', 'transparent',
    'containerBorderRadius', 0,
    'containerMaxWidth', '100%',
    'containerGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 8),
    'containerJustifyContent', 'flex-start',
    'containerAlignItems', 'center',
    'containerWrap', 'wrap'
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;
