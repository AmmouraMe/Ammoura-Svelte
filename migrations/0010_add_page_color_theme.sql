-- Add color_theme column to pages table
-- This allows pages to have their own color theme independent of the site theme
-- NULL value means the page will use the site's current theme (light/dark based on user preference)

-- Note: This migration is idempotent - it won't fail if columns already exist
-- We add columns via the page_revisions migration (0007) now, so this is a no-op
-- Keeping this file for migration history consistency

-- Check columns exist (this SELECT will work regardless of column presence)
SELECT 'color_theme migration complete - columns already exist or added by schema' as status;
