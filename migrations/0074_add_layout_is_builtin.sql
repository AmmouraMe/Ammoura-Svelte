-- Migration: 0074_add_layout_is_builtin
-- Description: Add is_builtin column to layouts table to distinguish system layouts from user-created ones
-- The Default Layout created in 0027 should be marked as built-in
-- Rollback: ALTER TABLE layouts DROP COLUMN is_builtin;

-- Add is_builtin column to layouts table
ALTER TABLE layouts ADD COLUMN is_builtin INTEGER DEFAULT 0;

-- Mark the Default Layout as built-in for all sites
-- The Default Layout was created in 0027_layouts_and_components.sql with slug 'default'
UPDATE layouts SET is_builtin = 1 WHERE slug = 'default';

-- Create index for filtering by is_builtin
CREATE INDEX IF NOT EXISTS idx_layouts_builtin ON layouts(is_builtin);
