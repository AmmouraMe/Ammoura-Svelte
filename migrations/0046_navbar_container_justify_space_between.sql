-- Migration: 0046_navbar_container_justify_space_between
-- Description: Set containerJustifyContent to 'space-between' for the container child of Navigation Bar
-- This ensures the navbar container uses space-between layout by default
-- Rollback: UPDATE component_widgets SET config = json_remove(config, '$.containerJustifyContent') WHERE component_id IN (SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1) AND type = 'container';

-- Update existing container children of Navigation Bar to have justify-content: space-between
UPDATE component_widgets 
SET config = json_set(config, '$.containerJustifyContent', 'space-between'),
    updated_at = CURRENT_TIMESTAMP
WHERE component_id IN (
  SELECT id FROM components WHERE name = 'Navigation Bar' AND is_global = 1
) AND type = 'container';
