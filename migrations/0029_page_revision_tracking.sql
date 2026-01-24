-- Migration: 0029_page_revision_tracking
-- Description: Add revision tracking columns to pages table for draft/publish workflow
-- Rollback: ALTER TABLE pages DROP COLUMN published_revision_id; ALTER TABLE pages DROP COLUMN draft_revision_id;

-- Add columns to track published and draft revisions
ALTER TABLE pages ADD COLUMN published_revision_id TEXT;
ALTER TABLE pages ADD COLUMN draft_revision_id TEXT;

-- Add foreign key constraints (Note: SQLite doesn't enforce FK on ALTER, but we document them)
-- FOREIGN KEY (published_revision_id) REFERENCES page_revisions(id) ON DELETE SET NULL
-- FOREIGN KEY (draft_revision_id) REFERENCES page_revisions(id) ON DELETE SET NULL

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_published_revision ON pages(published_revision_id);
CREATE INDEX IF NOT EXISTS idx_pages_draft_revision ON pages(draft_revision_id);

-- Initialize existing pages with their published revisions if they have one
UPDATE pages 
SET published_revision_id = (
  SELECT id FROM page_revisions 
  WHERE page_revisions.page_id = pages.id 
  AND page_revisions.is_published = 1
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM page_revisions 
  WHERE page_revisions.page_id = pages.id 
  AND page_revisions.is_published = 1
);

-- Initialize existing pages with their latest draft revision if they have one
UPDATE pages 
SET draft_revision_id = (
  SELECT id FROM page_revisions 
  WHERE page_revisions.page_id = pages.id 
  AND page_revisions.status = 'draft'
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM page_revisions 
  WHERE page_revisions.page_id = pages.id 
  AND page_revisions.status = 'draft'
);
