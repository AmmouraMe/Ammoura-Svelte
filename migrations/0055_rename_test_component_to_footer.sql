-- Migration: 0055_rename_test_component_to_footer
-- Description: Rename "Test Component" to "Footer" for footer-type global components
-- Rollback: UPDATE components SET name = 'Test Component' WHERE name = 'Footer' AND type = 'footer' AND is_global = 1;

-- Rename "Test Component" to "Footer" if it's a global footer component
UPDATE components 
SET name = 'Footer' 
WHERE name = 'Test Component' 
  AND type = 'footer' 
  AND is_global = 1;
