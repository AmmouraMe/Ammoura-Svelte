-- Migration: 0027_layouts_and_components
-- Description: Add layouts and components tables for Site management system
-- Layouts can have widgets and must have one yield component where page content goes
-- Components are reusable widgets that can be used across pages and layouts
-- Rollback: DROP TABLE IF EXISTS layouts; DROP TABLE IF EXISTS components; Remove layout_id from pages;

-- Create components table for reusable widgets
CREATE TABLE IF NOT EXISTS components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- Widget type: 'navbar', 'footer', 'hero', 'text', etc.
  config TEXT NOT NULL DEFAULT '{}', -- JSON configuration
  is_global INTEGER DEFAULT 0, -- 1 if available to all sites (system component)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_components_site ON components(site_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(type);
CREATE INDEX IF NOT EXISTS idx_components_global ON components(is_global);

-- Create layouts table
CREATE TABLE IF NOT EXISTS layouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL, -- URL-friendly identifier
  is_default INTEGER DEFAULT 0, -- 1 if this is the default layout
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_layouts_site ON layouts(site_id);
CREATE INDEX IF NOT EXISTS idx_layouts_slug ON layouts(slug);
CREATE INDEX IF NOT EXISTS idx_layouts_default ON layouts(is_default);

-- Create layout_widgets table (similar to page_widgets but for layouts)
CREATE TABLE IF NOT EXISTS layout_widgets (
  id TEXT PRIMARY KEY, -- UUID
  layout_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}', -- JSON configuration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_layout_widgets_layout ON layout_widgets(layout_id);
CREATE INDEX IF NOT EXISTS idx_layout_widgets_position ON layout_widgets(position);

-- Add layout_id to pages table
ALTER TABLE pages ADD COLUMN layout_id INTEGER REFERENCES layouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pages_layout ON pages(layout_id);

-- Insert default navbar component for each site (marked as global/built-in)
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  id,
  'Default Navigation Bar',
  'Main site navigation with logo and menu links',
  'navbar',
  json_object(
    'logo', json_object('text', 'Store', 'url', '/'),
    'links', json_array(
      json_object('text', 'Home', 'url', '/'),
      json_object('text', 'Products', 'url', '/products'),
      json_object('text', 'About', 'url', '/about'),
      json_object('text', 'Contact', 'url', '/contact')
    ),
    'style', json_object('background', '#ffffff', 'text', '#000000')
  ),
  1
FROM sites;

-- Insert default footer component for each site (marked as global/built-in)
INSERT INTO components (site_id, name, description, type, config, is_global)
SELECT 
  id,
  'Default Footer',
  'Site footer with copyright and links',
  'footer',
  json_object(
    'copyright', '© 2025 Store Name. All rights reserved.',
    'links', json_array(
      json_object('text', 'Privacy Policy', 'url', '/privacy'),
      json_object('text', 'Terms of Service', 'url', '/terms')
    )
  ),
  1
FROM sites;

-- Insert default layout for each site
INSERT INTO layouts (site_id, name, description, slug, is_default)
SELECT 
  id,
  'Default Layout',
  'Basic layout with header, content area, and footer',
  'default',
  1
FROM sites;

-- Add navbar widget to default layout for each site
INSERT INTO layout_widgets (id, layout_id, type, position, config)
SELECT 
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  l.id,
  'navbar',
  0,
  json_object('componentId', c.id)
FROM layouts l
INNER JOIN sites s ON l.site_id = s.id
INNER JOIN components c ON c.site_id = s.id AND c.type = 'navbar'
WHERE l.slug = 'default';

-- Add yield widget to default layout (this is where page content goes)
INSERT INTO layout_widgets (id, layout_id, type, position, config)
SELECT 
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  id,
  'yield',
  1,
  '{}'
FROM layouts
WHERE slug = 'default';

-- Add footer widget to default layout for each site
INSERT INTO layout_widgets (id, layout_id, type, position, config)
SELECT 
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  l.id,
  'footer',
  2,
  json_object('componentId', c.id)
FROM layouts l
INNER JOIN sites s ON l.site_id = s.id
INNER JOIN components c ON c.site_id = s.id AND c.type = 'footer'
WHERE l.slug = 'default';

-- Update existing pages to use the default layout
UPDATE pages
SET layout_id = (
  SELECT l.id 
  FROM layouts l 
  WHERE l.site_id = pages.site_id 
  AND l.is_default = 1 
  LIMIT 1
)
WHERE layout_id IS NULL;
