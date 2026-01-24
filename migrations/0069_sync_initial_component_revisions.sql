-- Migration: 0069_sync_initial_component_revisions
-- Description: Update initial component revisions to match the corrected componentDefaults.ts
-- This ensures the "Initial default configuration" revisions use transparent containerBackground
-- instead of the old "theme:secondary" value that was set before the sync migration.
-- Rollback: N/A - data migration that corrects historical data

-- The issue: 
-- Migration 0054 created initial revisions from components.config
-- Migration 0059 updated components.config to use componentDefaults.ts (with transparent backgrounds)
-- But the revisions created in 0054 still have the old values
-- 
-- This migration updates those initial revisions to match the current (corrected) component configs

-- Update initial revision for Navigation Bar component
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
    AND c.type = 'navbar'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'navbar'
  );

-- Update initial revision for Footer component
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
    AND c.type = 'footer'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'footer'
  );

-- Update initial revision for Hero component
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
    AND c.type = 'hero'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'hero'
  );

-- Update initial revision for Container component
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
    AND c.type = 'container'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'container'
  );

-- Update initial revision for Features component
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
    AND c.type = 'features'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'features'
  );

-- Update initial revision for Pricing component
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
    AND c.type = 'pricing'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'pricing'
  );

-- Update initial revision for Call to Action component
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
    AND c.type = 'cta'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'cta'
  );

-- Update initial revision for Product component
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
    AND c.type = 'product'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'product'
  );

-- Update initial revision for Product Grid component
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
    AND c.type = 'product_grid'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'product_grid'
  );

-- Update initial revision for Theme Toggle component
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
    AND c.type = 'theme_toggle'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_global = 1 AND type = 'theme_toggle'
  );

-- Also update primitive component initial revisions

-- Text primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'text'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'text'
  );

-- Heading primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'heading'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'heading'
  );

-- Button primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'button'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'button'
  );

-- Image primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'image'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'image'
  );

-- Spacer primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'spacer'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'spacer'
  );

-- Divider primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'divider'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'divider'
  );

-- Icon primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'icon'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'icon'
  );

-- Columns primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'columns'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'columns'
  );

-- Dropdown primitive
UPDATE revisions
SET data = (
  SELECT json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  )
  FROM components c
  WHERE c.is_primitive = 1 
    AND c.type = 'dropdown'
    AND CAST(c.id AS TEXT) = revisions.entity_id
)
WHERE entity_type = 'component'
  AND message = 'Initial default configuration'
  AND entity_id IN (
    SELECT CAST(id AS TEXT) FROM components WHERE is_primitive = 1 AND type = 'dropdown'
  );
