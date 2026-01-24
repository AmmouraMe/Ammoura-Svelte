-- Page Revisions table for storing complete history of page changes
-- Each save creates a new revision with a snapshot of the entire page state
CREATE TABLE IF NOT EXISTS page_revisions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  widgets_snapshot TEXT NOT NULL,
  color_theme TEXT DEFAULT NULL, -- Page color theme at time of revision
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  is_published INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  UNIQUE(page_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_page_revisions_page_id ON page_revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_revisions_created_at ON page_revisions(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_revisions_published ON page_revisions(page_id, is_published);
