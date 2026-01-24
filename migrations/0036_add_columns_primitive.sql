-- Migration: 0036_add_columns_primitive
-- Description: Add Columns as a primitive component for multi-column layouts
-- Rollback: UPDATE components SET is_primitive = 0 WHERE type = 'columns';

-- Mark existing Columns components as primitives
UPDATE components SET is_primitive = 1 WHERE type = 'columns' AND is_global = 1;

-- Insert Columns primitive if it doesn't exist
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Columns',
  'Multi-column layout grid for arranging content side by side',
  'columns',
  json_object(
    'columnCount', json_object('desktop', 3, 'tablet', 2, 'mobile', 1),
    'columnGap', json_object('desktop', 20, 'tablet', 16, 'mobile', 12),
    'columns', json_array()
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Columns' AND is_primitive = 1);
