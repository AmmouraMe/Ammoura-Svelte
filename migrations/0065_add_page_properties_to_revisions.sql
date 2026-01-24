-- Migration: 0065_add_page_properties_to_revisions
-- Description: Add page_properties column to page_revisions for storing page-level styling (backgroundColor, etc.)
-- Rollback: ALTER TABLE page_revisions DROP COLUMN page_properties;

-- Add page_properties column to store JSON with page-level styling properties
-- This includes: backgroundColor, backgroundImage, minHeight, padding, borderColor, 
-- borderWidth, borderStyle, borderRadius, boxShadow
ALTER TABLE page_revisions ADD COLUMN page_properties TEXT DEFAULT NULL;
