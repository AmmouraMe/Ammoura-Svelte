-- Migration: 0033_add_all_builtin_components
-- Description: Add built-in component templates for all widget types from the builder palette
-- These serve as starting templates that users can use in the builder or copy to create custom components
-- Rollback: DELETE FROM components WHERE is_global = 1 AND name LIKE 'Default %' AND name NOT IN ('Default Navigation Bar', 'Default Footer');

-- Layout Components

-- Container component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Container',
  'Container with padding and background options',
  'container',
  json_object(
    'containerPadding', json_object(
      'desktop', json_object('top', 40, 'right', 40, 'bottom', 40, 'left', 40),
      'tablet', json_object('top', 30, 'right', 30, 'bottom', 30, 'left', 30),
      'mobile', json_object('top', 20, 'right', 20, 'bottom', 20, 'left', 20)
    ),
    'containerMargin', json_object(
      'desktop', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
      'tablet', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto'),
      'mobile', json_object('top', 0, 'right', 0, 'bottom', 0, 'left', 0)
    ),
    'containerBackground', 'transparent',
    'containerBorderRadius', 0,
    'containerMaxWidth', '1200px',
    'children', json_array()
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Container' AND is_global = 1);

-- Flex Box component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Flex Box',
  'Flexible layout container for complex arrangements',
  'flex',
  json_object(
    'flexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'column'),
    'flexWrap', json_object('desktop', 'wrap', 'tablet', 'wrap', 'mobile', 'nowrap'),
    'flexJustifyContent', json_object('desktop', 'flex-start', 'tablet', 'flex-start', 'mobile', 'flex-start'),
    'flexAlignItems', json_object('desktop', 'stretch', 'tablet', 'stretch', 'mobile', 'stretch'),
    'flexGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 8),
    'flexBackground', 'transparent',
    'children', json_array()
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Flex Box' AND is_global = 1);

-- Hero component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Hero Section',
  'Large banner section with title, subtitle, and call-to-action',
  'hero',
  json_object(
    'title', 'Welcome to Our Site',
    'subtitle', 'Discover amazing products and services',
    'ctaText', 'Get Started',
    'ctaLink', '#',
    'backgroundColor', 'transparent',
    'contentAlign', 'center',
    'heroHeight', json_object('desktop', '500px', 'tablet', '400px', 'mobile', '300px'),
    'titleColor', 'theme:text',
    'subtitleColor', 'theme:textSecondary'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Hero Section' AND is_global = 1);

-- Columns component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Columns',
  'Multi-column layout for content organization',
  'columns',
  json_object(
    'columnCount', json_object('desktop', 3, 'tablet', 2, 'mobile', 1),
    'columnGap', json_object('desktop', 20, 'tablet', 16, 'mobile', 12),
    'columns', json_array()
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Columns' AND is_global = 1);

-- Spacer component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Spacer',
  'Vertical spacing between elements',
  'spacer',
  json_object(
    'space', json_object('desktop', 40, 'tablet', 30, 'mobile', 20)
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Spacer' AND is_global = 1);

-- Divider component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Divider',
  'Horizontal divider line',
  'divider',
  json_object(
    'thickness', 1,
    'color', 'theme:border',
    'dividerWidth', '100%',
    'dividerSpacing', json_object('desktop', 32, 'tablet', 24, 'mobile', 16)
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Divider' AND is_global = 1);

-- Content Components

-- Heading component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Heading',
  'Text heading with customizable level and styling',
  'heading',
  json_object(
    'heading', 'Heading',
    'level', 2,
    'alignment', 'left',
    'color', 'var(--color-text-primary)'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Heading' AND is_global = 1);

-- Text component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Text',
  'Paragraph text block',
  'text',
  json_object(
    'text', 'Enter your text here',
    'alignment', 'left',
    'fontSize', json_object('desktop', 16, 'tablet', 16, 'mobile', 14),
    'color', 'var(--color-text-primary)'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Text' AND is_global = 1);

-- Button component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Button',
  'Call-to-action button with customizable styling',
  'button',
  json_object(
    'label', 'Click Me',
    'url', '#',
    'variant', 'primary',
    'openInNewTab', 0,
    'fullWidth', json_object('desktop', 0, 'tablet', 0, 'mobile', 0),
    'buttonAlign', 'left'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Button' AND is_global = 1);

-- Media Components

-- Image component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Image',
  'Single image with responsive sizing',
  'image',
  json_object(
    'src', '',
    'alt', 'Image',
    'imageWidth', '100%',
    'borderRadius', 0,
    'objectFit', 'cover'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Image' AND is_global = 1);

-- Commerce Components

-- Single Product component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Product',
  'Single product display card',
  'single_product',
  json_object(
    'productId', '',
    'layout', 'card',
    'showPrice', 1,
    'showDescription', 1
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Product' AND is_global = 1);

-- Product List component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Product Grid',
  'Grid of products with filtering options',
  'product_list',
  json_object(
    'category', '',
    'limit', 12,
    'sortBy', 'created_at',
    'productListColumns', json_object('desktop', 3, 'tablet', 2, 'mobile', 1),
    'productGap', json_object('desktop', 24, 'tablet', 20, 'mobile', 16)
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Product Grid' AND is_global = 1);

-- Additional Marketing Components

-- Features component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Features',
  'Feature showcase section with icons and descriptions',
  'features',
  json_object(
    'title', 'Features',
    'subtitle', '',
    'containerBackground', 'transparent',
    'features', json_array(
      json_object('icon', '🎯', 'title', 'Feature One', 'description', 'Describe what makes this feature great'),
      json_object('icon', '✨', 'title', 'Feature Two', 'description', 'Explain the benefits of this feature'),
      json_object('icon', '🚀', 'title', 'Feature Three', 'description', 'Tell users why they need this')
    ),
    'featuresColumns', json_object('desktop', 3, 'tablet', 2, 'mobile', 1),
    'featuresGap', json_object('desktop', 32, 'tablet', 24, 'mobile', 16)
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Features' AND is_global = 1);

-- CTA (Call to Action) component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Call to Action',
  'Attention-grabbing call-to-action section',
  'cta',
  json_object(
    'heading', 'Ready to Get Started?',
    'subheading', 'Join thousands of satisfied customers',
    'buttonText', 'Get Started',
    'buttonUrl', '#',
    'backgroundColor', 'transparent',
    'textColor', 'var(--color-text-primary)'
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Call to Action' AND is_global = 1);

-- Pricing component
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Default Pricing',
  'Pricing table for displaying product/service tiers',
  'pricing',
  json_object(
    'title', 'Pricing',
    'subtitle', 'Choose the plan that fits your needs',
    'plans', json_array()
  ),
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Default Pricing' AND is_global = 1);
