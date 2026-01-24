-- Migration: 0058_add_icon_primitive
-- Description: Add Icon as a primitive component for displaying Lucide icons
-- Rollback: DELETE FROM components WHERE type = 'icon' AND is_primitive = 1;

-- Mark icon type as primitive if it exists
UPDATE components SET is_primitive = 1 WHERE type = 'icon' AND is_global = 1;

-- Icon Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Icon',
  'Display decorative Lucide icons with customizable size, color, and style',
  'icon',
  json_object(
    'iconName', 'Star',
    'iconSize', 24,
    'iconColor', 'theme:text',
    'strokeWidth', 2,
    'alignment', 'center'
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Icon' AND is_primitive = 1);
