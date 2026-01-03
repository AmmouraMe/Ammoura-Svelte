-- Migration: 0060_add_missing_background_color
-- Description: Add missing "backgroundColor": "transparent" to root level of built-in components
-- The componentDefaults.ts has this property but migration 0059 was missing it.
-- This ensures database state matches what resetBuiltInComponent produces.
-- Rollback: None needed - this adds a missing default value

-- This migration uses SQLite JSON functions to add the backgroundColor property
-- to the root level of each component's config without replacing the entire config.

-- Update all built-in components that should have backgroundColor: 'transparent'
-- Using type matching since names may vary but types are consistent

-- Update Navigation Bar component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar' AND is_global = 1;

-- Update Footer component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'footer' AND is_global = 1;

-- Update Hero component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'hero' AND is_global = 1;

-- Update Container component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'container' AND is_global = 1;

-- Update Features component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'features' AND is_global = 1;

-- Update Text component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'text' AND is_global = 1;

-- Update Heading component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'heading' AND is_global = 1;

-- Update Button component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'button' AND is_global = 1;

-- Update Image component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'image' AND is_global = 1;

-- Update Icon component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'icon' AND is_global = 1;

-- Update Spacer component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'spacer' AND is_global = 1;

-- Update Divider component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'divider' AND is_global = 1;

-- Update Columns component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'columns' AND is_global = 1;

-- Update Single Product component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'single_product' AND is_global = 1;

-- Update Product List component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'product_list' AND is_global = 1;

-- Update CTA component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'cta' AND is_global = 1;

-- Update Pricing component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'pricing' AND is_global = 1;

-- Update Dropdown component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'dropdown' AND is_global = 1;

-- Update Theme Toggle component
UPDATE components
SET
  config = json_set(config, '$.backgroundColor', 'transparent'),
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'theme_toggle' AND is_global = 1;
