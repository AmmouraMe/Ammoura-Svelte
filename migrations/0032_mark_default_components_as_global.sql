-- Migration: 0032_mark_default_components_as_global
-- Description: Mark "Default Navigation Bar" and "Default Footer" as global/built-in components
-- These components should appear in the "Built-in Components" section for all sites
-- Rollback: UPDATE components SET is_global = 0 WHERE name IN ('Default Navigation Bar', 'Default Footer');

-- Mark default navbar as global (built-in)
UPDATE components
SET is_global = 1
WHERE name = 'Default Navigation Bar';

-- Mark default footer as global (built-in)
UPDATE components
SET is_global = 1
WHERE name = 'Default Footer';
