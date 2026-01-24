-- Migration: 0042_fix_navbar_component_with_navbar_child
-- Description: Restore Navigation Bar to type 'navbar' and add a navbar child widget
-- This allows editing the navbar in the builder (via the child widget)
-- while maintaining correct rendering on the public site (via NavBar.svelte)
-- When saved, the navbar widget's config syncs to the component's config
-- Rollback: DELETE FROM component_widgets WHERE component_id = 1; UPDATE components SET type = 'container' WHERE id = 1;

-- Update the Navigation Bar component back to type 'navbar' with full navbar config
UPDATE components
SET 
  type = 'navbar',
  config = json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
      'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
      'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
    ),
    'containerMaxWidth', '100%',
    'containerBackground', 'var(--color-bg-primary)',
    'containerBorderRadius', 0,
    'logo', json_object('text', 'Hermes eCommerce', 'url', '/', 'image', '', 'imageHeight', 40),
    'logoPosition', 'left',
    'links', json_array(
      json_object('text', 'See Example', 'url', '#products'),
      json_object('text', 'Features', 'url', '#features'),
      json_object('text', 'Pricing', 'url', '#pricing')
    ),
    'linksPosition', 'center',
    'showSearch', 0,
    'showCart', 1,
    'showAuth', 1,
    'showThemeToggle', 1,
    'showAccountMenu', 1,
    'actionsPosition', 'right',
    'accountMenuItems', json_array(
      json_object('text', 'Profile', 'url', '/profile', 'icon', '👤'),
      json_object('text', 'Settings', 'url', '/settings', 'icon', '⚙️', 'dividerBefore', 1)
    ),
    'navbarBackground', 'var(--color-bg-primary)',
    'navbarTextColor', 'var(--color-text-primary)',
    'navbarHoverColor', 'var(--color-primary)',
    'navbarBorderColor', 'var(--color-border-primary)',
    'navbarShadow', 0,
    'sticky', 1,
    'navbarHeight', 0,
    'dropdownBackground', 'var(--color-bg-secondary)',
    'dropdownTextColor', 'var(--color-text-primary)',
    'dropdownHoverBackground', 'var(--color-bg-tertiary)',
    'mobileBreakpoint', 768
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1;

-- Delete any existing child widgets (cleanup from migration 0041)
DELETE FROM component_widgets WHERE component_id = 1;

-- Add a navbar widget as the child of the Navigation Bar component
-- This is what gets edited in the builder
INSERT INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
  c.id as component_id,
  'navbar' as type,
  0 as position,
  json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
      'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
      'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
    ),
    'containerMaxWidth', '100%',
    'containerBackground', 'var(--color-bg-primary)',
    'containerBorderRadius', 0,
    'logo', json_object('text', 'Hermes eCommerce', 'url', '/', 'image', '', 'imageHeight', 40),
    'logoPosition', 'left',
    'links', json_array(
      json_object('text', 'See Example', 'url', '#products'),
      json_object('text', 'Features', 'url', '#features'),
      json_object('text', 'Pricing', 'url', '#pricing')
    ),
    'linksPosition', 'center',
    'showSearch', 0,
    'showCart', 1,
    'showAuth', 1,
    'showThemeToggle', 1,
    'showAccountMenu', 1,
    'actionsPosition', 'right',
    'accountMenuItems', json_array(
      json_object('text', 'Profile', 'url', '/profile', 'icon', '👤'),
      json_object('text', 'Settings', 'url', '/settings', 'icon', '⚙️', 'dividerBefore', 1)
    ),
    'navbarBackground', 'var(--color-bg-primary)',
    'navbarTextColor', 'var(--color-text-primary)',
    'navbarHoverColor', 'var(--color-primary)',
    'navbarBorderColor', 'var(--color-border-primary)',
    'navbarShadow', 0,
    'sticky', 1,
    'navbarHeight', 0,
    'dropdownBackground', 'var(--color-bg-secondary)',
    'dropdownTextColor', 'var(--color-text-primary)',
    'dropdownHoverBackground', 'var(--color-bg-tertiary)',
    'mobileBreakpoint', 768
  ) as config,
  NULL as parent_id,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as updated_at
FROM components c
WHERE c.name = 'Navigation Bar' AND c.is_global = 1;
