-- Migration: 0048_navbar_sticky_false
-- Description: Set sticky to false by default for Navigation Bar components
-- The navbar should not be sticky by default - users can enable it if they want
-- Rollback: UPDATE components SET config = json_set(config, '$.sticky', 1) WHERE type = 'navbar' AND is_global = 1;

-- Update all global navbar components to set sticky to false
UPDATE components
SET 
  config = json_set(config, '$.sticky', 0),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar' 
  AND is_global = 1;
