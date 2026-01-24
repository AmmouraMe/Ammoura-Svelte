-- Migration: 0040_fix_navigation_bar_component
-- Description: Fix Navigation Bar component type and config after accidental modification
-- The Navigation Bar component should use type 'navbar' to render with NavBar.svelte
-- Rollback: N/A (this is a fix migration)

-- Update the Navigation Bar component to have the correct type and configuration
UPDATE components
SET 
  type = 'navbar',
  config = json_object(
    -- Container properties (new - for Container architecture)
    'containerPadding', json_object(
      'desktop', json_object('top', 16, 'right', 24, 'bottom', 16, 'left', 24),
      'tablet', json_object('top', 12, 'right', 20, 'bottom', 12, 'left', 20),
      'mobile', json_object('top', 12, 'right', 16, 'bottom', 12, 'left', 16)
    ),
    'containerMaxWidth', '100%',
    'containerBackground', 'var(--color-bg-primary)',
    'containerBorderRadius', 0,
    
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
    'navbarBackground', 'var(--color-bg-primary)',
    'navbarTextColor', 'var(--color-text-primary)',
    'navbarHoverColor', 'var(--color-primary)',
    'navbarBorderColor', 'var(--color-border-primary)',
    'navbarShadow', 0,
    'sticky', 1,
    'navbarHeight', 0,
    
    -- Dropdown styling
    'dropdownBackground', 'var(--color-bg-secondary)',
    'dropdownTextColor', 'var(--color-text-primary)',
    'dropdownHoverBackground', 'var(--color-bg-tertiary)',
    
    -- Mobile
    'mobileBreakpoint', 768
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' 
  AND is_global = 1;

-- Clean up any component_widgets entries for the Navigation Bar 
-- since the navbar type uses its config directly, not widget composition
DELETE FROM component_widgets 
WHERE component_id IN (
  SELECT id FROM components 
  WHERE name = 'Navigation Bar' AND is_global = 1
);
