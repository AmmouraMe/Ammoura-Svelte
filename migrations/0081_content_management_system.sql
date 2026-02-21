-- Migration: 0081_content_management_system
-- Description: Add Content Management System with custom content types and entries
-- Rollback: DROP TABLE IF EXISTS content_entry_tags; DROP TABLE IF EXISTS content_entries; DROP TABLE IF EXISTS content_types;

-- Content types: defines a type of content (e.g., Blog, FAQ, Team Members)
-- Each content type has a configurable field schema stored as JSON
CREATE TABLE IF NOT EXISTS content_types (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  base_path TEXT NOT NULL,
  icon TEXT,
  fields_schema TEXT NOT NULL DEFAULT '[]',
  listing_page_id TEXT,
  entry_template_page_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_page_id) REFERENCES pages(id) ON DELETE SET NULL,
  FOREIGN KEY (entry_template_page_id) REFERENCES pages(id) ON DELETE SET NULL
);

-- Unique constraints: slug and base_path must be unique per site
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_types_site_slug ON content_types(site_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_types_site_base_path ON content_types(site_id, base_path);
CREATE INDEX IF NOT EXISTS idx_content_types_site_status ON content_types(site_id, status);

-- Content entries: individual pieces of content belonging to a content type
CREATE TABLE IF NOT EXISTS content_entries (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  content_type_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  field_values TEXT NOT NULL DEFAULT '{}',
  page_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at INTEGER,
  author_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (content_type_id) REFERENCES content_types(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Unique constraint: slug must be unique within a content type
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_entries_type_slug ON content_entries(content_type_id, slug);
CREATE INDEX IF NOT EXISTS idx_content_entries_site_type_status ON content_entries(site_id, content_type_id, status);
CREATE INDEX IF NOT EXISTS idx_content_entries_published ON content_entries(site_id, content_type_id, status, published_at);
CREATE INDEX IF NOT EXISTS idx_content_entries_author ON content_entries(site_id, author_id);
CREATE INDEX IF NOT EXISTS idx_content_entries_sort ON content_entries(content_type_id, sort_order);

-- Content entry tags: taxonomy support for categorizing and tagging entries
CREATE TABLE IF NOT EXISTS content_entry_tags (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  content_type_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_category TEXT NOT NULL DEFAULT 'tag',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (content_type_id) REFERENCES content_types(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES content_entries(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_entry_tags_unique ON content_entry_tags(entry_id, tag_name, tag_category);
CREATE INDEX IF NOT EXISTS idx_content_entry_tags_type_category ON content_entry_tags(site_id, content_type_id, tag_category);
CREATE INDEX IF NOT EXISTS idx_content_entry_tags_name ON content_entry_tags(site_id, tag_name);

-- NOTE: Revisions table CHECK constraint update is handled by migration 0082
-- which drops and recreates the revisions table with the expanded entity_type
-- CHECK constraint (adding 'content_type' and 'content_entry').

-- Add CMS permissions
INSERT OR IGNORE INTO permissions (id, name, description, category, created_at) VALUES
  ('perm-content-types-read', 'content_types:read', 'View content types', 'content', strftime('%s', 'now')),
  ('perm-content-types-write', 'content_types:write', 'Create and edit content types', 'content', strftime('%s', 'now')),
  ('perm-content-types-delete', 'content_types:delete', 'Delete content types', 'content', strftime('%s', 'now')),
  ('perm-content-read', 'content:read', 'View content entries', 'content', strftime('%s', 'now')),
  ('perm-content-write', 'content:write', 'Create and edit content entries', 'content', strftime('%s', 'now')),
  ('perm-content-publish', 'content:publish', 'Publish content entries', 'content', strftime('%s', 'now')),
  ('perm-content-delete', 'content:delete', 'Delete content entries', 'content', strftime('%s', 'now'));
