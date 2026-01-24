-- Migration: 0030_component_widgets
-- Description: Add component_widgets table to support component composition
-- Components can now be built from root widgets (Container, Button, Text, etc.)
-- instead of being monolithic single-config entities
-- Rollback: DROP TABLE IF EXISTS component_widgets;

-- Create component_widgets table (similar to page_widgets and layout_widgets)
CREATE TABLE IF NOT EXISTS component_widgets (
  id TEXT PRIMARY KEY, -- UUID
  component_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}', -- JSON configuration
  parent_id TEXT, -- Parent widget ID for nested widgets (e.g., widgets inside container)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES component_widgets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_component_widgets_component ON component_widgets(component_id);
CREATE INDEX IF NOT EXISTS idx_component_widgets_position ON component_widgets(position);
CREATE INDEX IF NOT EXISTS idx_component_widgets_parent ON component_widgets(parent_id);
