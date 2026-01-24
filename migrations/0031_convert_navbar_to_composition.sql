-- Migration: 0031_convert_navbar_to_composition
-- Description: Convert "Default Navigation Bar" components from single navbar config to widget composition
-- This transforms navbar components from monolithic configs into compositions of root widgets
-- Rollback: Delete from component_widgets where component_id IN (SELECT id FROM components WHERE name = 'Default Navigation Bar');

-- Insert widget compositions for all "Default Navigation Bar" components
-- Structure: Container > Row (flexbox) > [Logo Image, Row (nav links), Row (actions)]

-- For each Default Navigation Bar component, create a composition of widgets
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  -- Root Container widget
  hex(randomblob(16)) as id,
  c.id as component_id,
  'container' as type,
  0 as position,
  json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24)
    ),
    'containerBackground', 'theme:surface',
    'containerMaxWidth', '100%',
    'containerFlexDirection', json_object('desktop', 'row'),
    'containerJustifyContent', 'space-between',
    'containerAlignItems', 'center',
    'containerGap', json_object('desktop', 24)
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar'
  AND NOT EXISTS (
    SELECT 1 FROM component_widgets cw WHERE cw.component_id = c.id
  );

-- Add logo image widget inside container
-- We'll reference the container by getting the widget we just created
-- For now, create as separate widgets with proper positioning
-- Note: This migration creates a flat structure - parent_id relationships can be added later

-- Logo Image widget (position 1)
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'image' as type,
  1 as position,
  json_object(
    'src', '',
    'alt', json_extract(c.config, '$.logo.text'),
    'imageHeight', '40px',
    'link', json_extract(c.config, '$.logo.url')
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar'
  AND json_extract(c.config, '$.logo.text') IS NOT NULL;

-- Navigation links as Text widgets
-- We'll create one text widget for each link in the original config
-- Position starts at 2, incrementing for each link
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'text' as type,
  2 as position,
  json_object(
    'text', 'Home',
    'link', '/',
    'fontSize', 16
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar';

INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'text' as type,
  3 as position,
  json_object(
    'text', 'Products',
    'link', '/products',
    'fontSize', 16
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar';

INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'text' as type,
  4 as position,
  json_object(
    'text', 'About',
    'link', '/about',
    'fontSize', 16
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar';

INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'text' as type,
  5 as position,
  json_object(
    'text', 'Contact',
    'link', '/contact',
    'fontSize', 16
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar';

-- Add action buttons (Login button)
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  hex(randomblob(16)) as id,
  c.id as component_id,
  'button' as type,
  6 as position,
  json_object(
    'label', 'Login',
    'url', '/login',
    'variant', 'outline',
    'size', 'medium'
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Default Navigation Bar';

-- Update component type to 'composite' to indicate it's now a widget composition
UPDATE components
SET type = 'composite'
WHERE name = 'Default Navigation Bar'
  AND EXISTS (SELECT 1 FROM component_widgets WHERE component_id = components.id);
