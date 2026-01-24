-- Migration: 0034_rename_builtin_components
-- Description: Rename built-in components to remove 'Default' prefix for cleaner display
-- Rollback: UPDATE components SET name = 'Default ' || name WHERE is_global = 1;

-- Rename existing built-in components to remove 'Default' prefix
UPDATE components SET name = 'Navigation Bar' WHERE name = 'Default Navigation Bar' AND is_global = 1;
UPDATE components SET name = 'Footer' WHERE name = 'Default Footer' AND is_global = 1;
UPDATE components SET name = 'Container' WHERE name = 'Default Container' AND is_global = 1;
UPDATE components SET name = 'Flex Box' WHERE name = 'Default Flex Box' AND is_global = 1;
UPDATE components SET name = 'Hero Section' WHERE name = 'Default Hero Section' AND is_global = 1;
UPDATE components SET name = 'Columns' WHERE name = 'Default Columns' AND is_global = 1;
UPDATE components SET name = 'Spacer' WHERE name = 'Default Spacer' AND is_global = 1;
UPDATE components SET name = 'Divider' WHERE name = 'Default Divider' AND is_global = 1;
UPDATE components SET name = 'Heading' WHERE name = 'Default Heading' AND is_global = 1;
UPDATE components SET name = 'Text' WHERE name = 'Default Text' AND is_global = 1;
UPDATE components SET name = 'Button' WHERE name = 'Default Button' AND is_global = 1;
UPDATE components SET name = 'Image' WHERE name = 'Default Image' AND is_global = 1;
UPDATE components SET name = 'Product' WHERE name = 'Default Product' AND is_global = 1;
UPDATE components SET name = 'Product Grid' WHERE name = 'Default Product Grid' AND is_global = 1;
UPDATE components SET name = 'Features' WHERE name = 'Default Features' AND is_global = 1;
UPDATE components SET name = 'Call to Action' WHERE name = 'Default Call to Action' AND is_global = 1;
UPDATE components SET name = 'Pricing' WHERE name = 'Default Pricing' AND is_global = 1;

-- Also update the NOT EXISTS checks in the previous migration to use new names
-- (This won't affect existing data, just future inserts)
