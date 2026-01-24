-- Migration: 0062_add_builtin_pages
-- Description: Add is_builtin column to pages table and create default Home page
-- Built-in pages are system pages that come with every site automatically.
-- They cannot be deleted but can be customized.
-- Rollback: ALTER TABLE pages DROP COLUMN is_builtin;

-- Add is_builtin column to pages table
ALTER TABLE pages ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient querying of built-in pages
CREATE INDEX IF NOT EXISTS idx_pages_is_builtin ON pages(is_builtin);

-- Insert default Home page for existing default-site
-- This ensures the Home page exists for the development site
INSERT OR IGNORE INTO pages (id, site_id, title, slug, status, is_builtin, created_at, updated_at)
VALUES (
  'builtin-home-page',
  'default-site',
  'Home',
  '/',
  'draft',
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);
