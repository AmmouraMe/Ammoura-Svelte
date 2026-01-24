-- Migration: 0047_add_dropdown_primitive
-- Description: Add Dropdown as a primitive component for form selections
-- Rollback: DELETE FROM components WHERE type = 'dropdown' AND is_primitive = 1;

-- Dropdown Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Dropdown',
  'Select from a list of options for forms and filters',
  'dropdown',
  json_object(
    'label', 'Select Option',
    'placeholder', 'Choose...',
    'options', json_array(
      json_object('value', 'option1', 'label', 'Option 1'),
      json_object('value', 'option2', 'label', 'Option 2'),
      json_object('value', 'option3', 'label', 'Option 3')
    ),
    'required', false,
    'searchable', false,
    'size', 'medium',
    'defaultValue', ''
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Dropdown' AND is_primitive = 1);
