-- Migration: 0083_layout_page_properties
-- Description: Add page_properties column to layouts table for storing layout-level styling
--              (max-width, padding, background, etc.) that controls how the page content area
--              is rendered on the storefront.
-- Rollback: ALTER TABLE layouts DROP COLUMN page_properties;

ALTER TABLE layouts ADD COLUMN page_properties TEXT DEFAULT NULL;
