-- Migration: 0050_add_theme_toggle_component
-- Description: Add Theme Toggle as a built-in component (not primitive)
-- Theme Toggle allows users to switch between light and dark modes
-- Rollback: DELETE FROM components WHERE type = 'theme_toggle' AND is_global = 1;

-- Insert Theme Toggle as a built-in (global) component
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Theme Toggle',
  'Light/dark mode toggle button for theme switching',
  'theme_toggle',
  json_object(
    'size', 'medium',
    'toggleVariant', 'icon',
    'alignment', 'left'
  ),
  1,
  0
WHERE NOT EXISTS (SELECT 1 FROM components WHERE type = 'theme_toggle' AND is_global = 1);
