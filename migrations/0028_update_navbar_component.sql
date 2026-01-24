-- Migration: 0028_update_navbar_component
-- Description: Update Default Navigation Bar components to use comprehensive navbar config
-- This gives the navbar component full builder editing capabilities
-- Rollback: Revert to simple config from 0027_layouts_and_components.sql

-- Update all navbar components to use the comprehensive navbar configuration
UPDATE components
SET config = json_object(
  -- Logo configuration
  'logo', json_object('text', 'Store', 'url', '/', 'image', '', 'imageHeight', 40),
  'logoPosition', 'left',
  -- Navigation links
  'links', json_array(
    json_object('text', 'Home', 'url', '/'),
    json_object('text', 'Products', 'url', '/products'),
    json_object('text', 'About', 'url', '/about'),
    json_object('text', 'Contact', 'url', '/contact')
  ),
  'linksPosition', 'center',
  -- Action buttons
  'showSearch', 0,
  'showCart', 1,
  'showAuth', 1,
  'showThemeToggle', 1,
  'showAccountMenu', 1,
  'actionsPosition', 'right',
  -- Account menu items
  'accountMenuItems', json_array(
    json_object('text', 'Profile', 'url', '/profile', 'icon', '👤'),
    json_object('text', 'Settings', 'url', '/settings', 'icon', '⚙️', 'dividerBefore', 1)
  ),
  -- Styling
  'navbarBackground', '#ffffff',
  'navbarTextColor', '#000000',
  'navbarHoverColor', 'var(--color-primary)',
  'navbarBorderColor', '#e5e7eb',
  'navbarShadow', 0,
  'sticky', 1,
  'navbarHeight', 0,
  'navbarPadding', json_object(
    'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
    'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
    'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
  ),
  -- Dropdown styling
  'dropdownBackground', '#ffffff',
  'dropdownTextColor', '#000000',
  'dropdownHoverBackground', '#f3f4f6',
  -- Mobile
  'mobileBreakpoint', 768
),
updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar'
AND name = 'Default Navigation Bar';
