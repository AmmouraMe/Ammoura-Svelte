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

-- Update the revisions table CHECK constraint to include CMS entity types
-- SQLite does not support ALTER TABLE to modify CHECK constraints,
-- so we recreate the table with the updated constraint
CREATE TABLE IF NOT EXISTS revisions_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'product', 'category', 'theme', 'site', 'component', 'layout', 'content_type', 'content_entry')),
  entity_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  data TEXT NOT NULL,
  message TEXT,
  hash TEXT,
  parent_id TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES revisions_new(id) ON DELETE SET NULL
);

-- Copy data from old revisions table
INSERT OR IGNORE INTO revisions_new SELECT * FROM revisions;

-- Drop old table and rename new one
DROP TABLE IF EXISTS revisions;
ALTER TABLE revisions_new RENAME TO revisions;

-- Recreate indexes for revisions table
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(site_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_revisions_hash ON revisions(hash);
CREATE INDEX IF NOT EXISTS idx_revisions_parent ON revisions(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revisions_entity_number ON revisions(site_id, entity_type, entity_id, revision_number);

-- Add CMS permissions
INSERT OR IGNORE INTO permissions (id, name, description, category, created_at) VALUES
  ('perm-content-types-read', 'content_types:read', 'View content types', 'content', strftime('%s', 'now')),
  ('perm-content-types-write', 'content_types:write', 'Create and edit content types', 'content', strftime('%s', 'now')),
  ('perm-content-types-delete', 'content_types:delete', 'Delete content types', 'content', strftime('%s', 'now')),
  ('perm-content-read', 'content:read', 'View content entries', 'content', strftime('%s', 'now')),
  ('perm-content-write', 'content:write', 'Create and edit content entries', 'content', strftime('%s', 'now')),
  ('perm-content-publish', 'content:publish', 'Publish content entries', 'content', strftime('%s', 'now')),
  ('perm-content-delete', 'content:delete', 'Delete content entries', 'content', strftime('%s', 'now'));
