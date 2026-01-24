-- Migration: 0052_remove_parent_id_fk_constraint
-- Description: Remove the foreign key constraint on parent_id in component_widgets table
-- The parent_id FK causes issues when bulk inserting/updating children because we delete
-- all rows first, then insert new ones. Even with topological ordering, the FK constraint
-- fails because it expects parent rows to exist at insert time.
-- The component_id FK (ON DELETE CASCADE) is the important one for data integrity.
-- Parent-child relationships are managed by application logic.
-- Rollback: This migration recreates the table structure, data is preserved.

-- Step 1: Create new table without parent_id FK constraint
CREATE TABLE IF NOT EXISTS component_widgets_new (
  id TEXT PRIMARY KEY,
  component_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  config TEXT NOT NULL DEFAULT '{}',
  parent_id TEXT, -- No longer has FK constraint, just stores parent reference
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);

-- Step 2: Copy data from old table to new table
INSERT INTO component_widgets_new (id, component_id, type, position, config, parent_id, created_at, updated_at)
SELECT id, component_id, type, position, config, parent_id, created_at, updated_at
FROM component_widgets;

-- Step 3: Drop the old table
DROP TABLE IF EXISTS component_widgets;

-- Step 4: Rename new table to original name
ALTER TABLE component_widgets_new RENAME TO component_widgets;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_component_widgets_component ON component_widgets(component_id);
CREATE INDEX IF NOT EXISTS idx_component_widgets_position ON component_widgets(position);
CREATE INDEX IF NOT EXISTS idx_component_widgets_parent ON component_widgets(parent_id);
