-- Migration: 0078_fix_hero_badge_background_v2
-- Description: Fix hero badge button background to be transparent (retry)
-- Migration 0077 may not have matched due to JSON formatting differences
-- The actual JSON in the database has spaces after colons, so we match that pattern
-- Rollback: Manual fix required

-- Fix the hero-badge button backgroundColor using spaced JSON format
UPDATE page_revisions 
SET widgets_snapshot = REPLACE(
  widgets_snapshot, 
  '"backgroundColor": "theme:surface",',
  '"backgroundColor": "transparent",'
)
WHERE widgets_snapshot LIKE '%hero-badge%'
  AND widgets_snapshot LIKE '%"backgroundColor": "theme:surface"%';
