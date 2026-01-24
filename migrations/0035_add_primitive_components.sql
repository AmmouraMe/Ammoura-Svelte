-- Migration: 0035_add_primitive_components
-- Description: Add is_primitive flag to components table for base building blocks
-- Primitives are the most root building blocks: Container, Button, Text, Image, etc.
-- They cannot be composed of other components and serve as the foundation for all other components.
-- Rollback: ALTER TABLE components DROP COLUMN is_primitive; UPDATE components SET is_primitive = 0;

-- Add is_primitive column to components table
ALTER TABLE components ADD COLUMN is_primitive INTEGER DEFAULT 0;

-- Create index for primitive components
CREATE INDEX IF NOT EXISTS idx_components_primitive ON components(is_primitive);

-- Mark basic building blocks as primitives
-- These are the fundamental elements that cannot be broken down further

-- Container - base structural element
UPDATE components SET is_primitive = 1 WHERE type = 'container' AND is_global = 1;

-- Flex - flexible layout primitive
UPDATE components SET is_primitive = 1 WHERE type = 'flex' AND is_global = 1;

-- Text - basic text content
UPDATE components SET is_primitive = 1 WHERE type = 'text' AND is_global = 1;

-- Heading - title/heading text
UPDATE components SET is_primitive = 1 WHERE type = 'heading' AND is_global = 1;

-- Button - interactive button element
UPDATE components SET is_primitive = 1 WHERE type = 'button' AND is_global = 1;

-- Image - basic image display
UPDATE components SET is_primitive = 1 WHERE type = 'image' AND is_global = 1;

-- Spacer - spacing element
UPDATE components SET is_primitive = 1 WHERE type = 'spacer' AND is_global = 1;

-- Divider - horizontal line separator
UPDATE components SET is_primitive = 1 WHERE type = 'divider' AND is_global = 1;

-- Insert primitive components if they don't exist

-- Text Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Text',
  'Basic text content block for paragraphs and formatted text',
  'text',
  json_object(
    'content', 'Enter your text content here.',
    'textAlign', json_object('desktop', 'left', 'tablet', 'left', 'mobile', 'left'),
    'fontSize', json_object('desktop', 16, 'tablet', 15, 'mobile', 14),
    'fontWeight', 'normal',
    'lineHeight', 1.6,
    'textColor', 'theme:text'
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Text' AND is_primitive = 1);

-- Heading Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Heading',
  'Title and heading text for sections and content',
  'heading',
  json_object(
    'text', 'Heading Text',
    'level', 'h2',
    'textAlign', json_object('desktop', 'left', 'tablet', 'left', 'mobile', 'left'),
    'fontSize', json_object('desktop', 32, 'tablet', 28, 'mobile', 24),
    'fontWeight', 'bold',
    'textColor', 'theme:text'
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Heading' AND is_primitive = 1);

-- Button Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Button',
  'Interactive button for calls-to-action and links',
  'button',
  json_object(
    'text', 'Click Me',
    'url', '#',
    'style', 'primary',
    'size', json_object('desktop', 'medium', 'tablet', 'medium', 'mobile', 'medium'),
    'fullWidth', json_object('desktop', false, 'tablet', false, 'mobile', true),
    'backgroundColor', 'theme:primary',
    'textColor', '#ffffff',
    'borderRadius', 6,
    'openInNewTab', false
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Button' AND is_primitive = 1);

-- Image Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Image',
  'Display images with responsive sizing and alt text',
  'image',
  json_object(
    'src', '',
    'alt', 'Image description',
    'width', json_object('desktop', '100%', 'tablet', '100%', 'mobile', '100%'),
    'height', 'auto',
    'objectFit', 'cover',
    'borderRadius', 0,
    'link', ''
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Image' AND is_primitive = 1);

-- Container Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Container',
  'Structural container with flexible layout for arranging child elements',
  'container',
  json_object(
    'containerDisplay', json_object('desktop', 'flex', 'tablet', 'flex', 'mobile', 'flex'),
    'containerFlexDirection', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'column'),
    'containerJustifyContent', 'flex-start',
    'containerAlignItems', 'stretch',
    'containerWrap', 'wrap',
    'containerGap', json_object('desktop', 16, 'tablet', 12, 'mobile', 8),
    'containerPadding', json_object(
      'desktop', json_object('top', 20, 'right', 20, 'bottom', 20, 'left', 20),
      'tablet', json_object('top', 16, 'right', 16, 'bottom', 16, 'left', 16),
      'mobile', json_object('top', 12, 'right', 12, 'bottom', 12, 'left', 12)
    ),
    'containerMargin', json_object(
      'desktop', json_object('top', 0, 'right', 'auto', 'bottom', 0, 'left', 'auto')
    ),
    'containerBackground', 'transparent',
    'containerBorderRadius', 0,
    'containerMaxWidth', '100%',
    'containerGridCols', json_object('desktop', 3, 'tablet', 2, 'mobile', 1),
    'containerGridAutoFlow', json_object('desktop', 'row', 'tablet', 'row', 'mobile', 'row'),
    'children', json_array()
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Container' AND is_primitive = 1);

-- Flex Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Flex Box',
  'Flexible layout container for arranging child elements',
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
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Flex Box' AND is_primitive = 1);

-- Spacer Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Spacer',
  'Vertical spacing between elements',
  'spacer',
  json_object(
    'space', json_object('desktop', 40, 'tablet', 30, 'mobile', 20)
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Spacer' AND is_primitive = 1);

-- Divider Primitive
INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
SELECT 
  (SELECT id FROM sites LIMIT 1),
  'Divider',
  'Horizontal line separator',
  'divider',
  json_object(
    'thickness', 1,
    'color', 'theme:border',
    'style', 'solid',
    'width', '100%',
    'margin', json_object('desktop', 20, 'tablet', 16, 'mobile', 12)
  ),
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM components WHERE name = 'Divider' AND is_primitive = 1);
