-- Migration: 0075_replace_hardcoded_colors_with_theme
-- Description: Replace all hardcoded hex colors and rgba values with theme variables
-- This ensures the component configurations use the theme system instead of static colors
-- Rollback: N/A - data migration
-- Note: Using unconditional REPLACE is safe - it only changes rows with matching text

-- Replace #ffffff with theme:text
UPDATE components SET config = REPLACE(config, '"#ffffff"', '"theme:text"');
UPDATE components SET config = REPLACE(config, '"#FFFFFF"', '"theme:text"');

-- Replace #a78bfa (purple accent) with theme:accent
UPDATE components SET config = REPLACE(config, '"#a78bfa"', '"theme:accent"');

-- Replace #94a3b8 (slate-400) with theme:textSecondary
UPDATE components SET config = REPLACE(config, '"#94a3b8"', '"theme:textSecondary"');

-- Replace #64748b (slate-500) with theme:textSecondary
UPDATE components SET config = REPLACE(config, '"#64748b"', '"theme:textSecondary"');

-- Replace #e2e8f0 (slate-200) with theme:text
UPDATE components SET config = REPLACE(config, '"#e2e8f0"', '"theme:text"');

-- Replace #334155 (slate-700 border color) with theme:border
UPDATE components SET config = REPLACE(config, '"#334155"', '"theme:border"');

-- Replace #8b5cf6 (violet-500) with theme:accent
UPDATE components SET config = REPLACE(config, '"#8b5cf6"', '"theme:accent"');

-- Replace #6366f1 (indigo-500) with theme:primary
UPDATE components SET config = REPLACE(config, '"#6366f1"', '"theme:primary"');

-- Replace rgba semi-transparent backgrounds with theme:surface
UPDATE components SET config = REPLACE(config, '"rgba(30, 41, 59, 0.9)"', '"theme:surface"');
UPDATE components SET config = REPLACE(config, '"rgba(30, 41, 59, 0.6)"', '"theme:surface"');
UPDATE components SET config = REPLACE(config, '"rgba(30, 41, 59, 0.4)"', '"theme:surface"');
UPDATE components SET config = REPLACE(config, '"rgba(15, 23, 42, 0.6)"', '"theme:surface"');

-- Replace rgba semi-transparent accent backgrounds with theme:surface
UPDATE components SET config = REPLACE(config, '"rgba(139, 92, 246, 0.15)"', '"theme:surface"');

-- Replace rgba semi-transparent borders with theme:border
UPDATE components SET config = REPLACE(config, '"rgba(148, 163, 184, 0.4)"', '"theme:border"');
UPDATE components SET config = REPLACE(config, '"rgba(71, 85, 105, 0.5)"', '"theme:border"');
UPDATE components SET config = REPLACE(config, '"rgba(71, 85, 105, 0.3)"', '"theme:border"');

-- Fix inline border properties with rgba - replace with theme variable
UPDATE components SET config = REPLACE(config, '"1px solid rgba(71, 85, 105, 0.3)"', '"1px solid theme:border"');

-- Replace linear-gradient background with theme:accent (simplify from gradient)
UPDATE components SET config = REPLACE(config, '"linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"', '"theme:accent"');

-- Also update the revisions table to sync the component revisions
-- Update initial revisions to match the updated component configs
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_global = 1 
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND entity_id IN (SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1);
