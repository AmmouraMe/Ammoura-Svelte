-- Migration: 0054_seed_component_revisions
-- Description: Create initial published revisions for all built-in and primitive components
-- This establishes the default state that can be restored via the reset functionality
-- Rollback: DELETE FROM revisions WHERE entity_type = 'component';

-- For each built-in component, we create an initial revision with its current config
-- The revision is marked as is_current = 1 (published) to serve as the restore point

-- Helper function approach won't work in SQLite, so we'll use INSERT statements
-- The revision data is a JSON snapshot of the component's name, description, type, and config

-- Navigation Bar component revision
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'navbar'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- Footer component revision  
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'footer'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- Container component revision
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'container'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- Hero component revision
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'hero'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- Columns component revision
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'columns'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- Spacer component revision
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type = 'spacer'
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- All other built-in component types (text, button, image, heading, divider, etc.)
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_global = 1 
  AND c.type NOT IN ('navbar', 'footer', 'container', 'hero', 'columns', 'spacer')
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- All primitive components
INSERT INTO revisions (id, site_id, entity_type, entity_id, revision_hash, data, is_current, message, created_at)
SELECT 
  'rev-' || lower(hex(randomblob(8))),
  c.site_id,
  'component',
  CAST(c.id AS TEXT),
  substr(lower(hex(randomblob(4))), 1, 7),
  json_object(
    'name', c.name,
    'description', c.description,
    'type', c.type,
    'config', json(c.config)
  ),
  1,
  'Initial default configuration',
  strftime('%s', 'now')
FROM components c
WHERE c.is_primitive = 1
  AND NOT EXISTS (
    SELECT 1 FROM revisions r 
    WHERE r.entity_type = 'component' AND r.entity_id = CAST(c.id AS TEXT)
  );

-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration:
-- DELETE FROM revisions WHERE entity_type = 'component';
