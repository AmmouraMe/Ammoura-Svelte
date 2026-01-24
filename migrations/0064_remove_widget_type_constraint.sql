-- Remove the CHECK constraint on page_widgets.type to allow dynamic widget types
-- This is necessary because widget types are now dynamic (container, product_grid, icon, etc.)
-- and the old CHECK constraint only allowed a limited set of legacy types.

-- SQLite doesn't support ALTER TABLE to drop CHECK constraints directly
-- So we need to recreate the table without the constraint

-- 1. Create a new table without the CHECK constraint
CREATE TABLE IF NOT EXISTS page_widgets_new (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  type TEXT NOT NULL, -- No CHECK constraint - widget types are dynamic
  config TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- 2. Copy existing data from old table
INSERT INTO page_widgets_new SELECT * FROM page_widgets;

-- 3. Drop the old table
DROP TABLE page_widgets;

-- 4. Rename new table to original name
ALTER TABLE page_widgets_new RENAME TO page_widgets;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_page_widgets_page_id ON page_widgets(page_id);
CREATE INDEX IF NOT EXISTS idx_page_widgets_position ON page_widgets(page_id, position);
