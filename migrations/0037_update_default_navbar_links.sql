-- Migration: 0037_update_default_navbar_links
-- Description: Update Default Navigation Bar component to use the frontend design links
-- This changes the default navbar links from Home/Products/About/Contact to See Example/Features/Pricing
-- Rollback: Revert to previous config from 0028_update_navbar_component.sql

-- Update all navbar components to use the new link structure matching the frontend
UPDATE components
SET config = json_object(
  -- Logo configuration - using site title dynamically
  'logo', json_object('text', 'Hermes eCommerce', 'url', '/', 'image', '', 'imageHeight', 40),
  'logoPosition', 'left',
  -- Navigation links - matching the current frontend design
  'links', json_array(
    json_object('text', 'See Example', 'url', '#products'),
    json_object('text', 'Features', 'url', '#features'),
    json_object('text', 'Pricing', 'url', '#pricing')
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
  -- Styling - using CSS variables for theme compatibility
  'navbarBackground', 'var(--bg-primary)',
  'navbarTextColor', 'var(--text-primary)',
  'navbarHoverColor', 'var(--color-primary)',
  'navbarBorderColor', 'var(--border-primary)',
  'navbarShadow', 0,
  'sticky', 1,
  'navbarHeight', 0,
  -- Dropdown styling
  'dropdownBackground', 'var(--bg-secondary)',
  'dropdownTextColor', 'var(--text-primary)',
  'dropdownHoverBackground', 'var(--bg-tertiary)',
  -- Mobile
  'mobileBreakpoint', 768
),
updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar'
AND name = 'Default Navigation Bar';
