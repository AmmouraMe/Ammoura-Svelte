-- Migration: 0077_fix_hero_badge_background
-- Description: Fix hero badge button background to be transparent
-- The badge button is an outline variant and should not have a visible background
-- This uses a simple REPLACE that targets the specific pattern in the hero-badge config
-- Rollback: Run the reverse REPLACE (transparent -> theme:surface)

-- Fix the hero-badge button backgroundColor
-- The JSON in the database uses spaced format (e.g., "key": "value" not "key":"value")
UPDATE page_revisions 
SET widgets_snapshot = REPLACE(
  widgets_snapshot, 
  '"backgroundColor": "theme:surface",',
  '"backgroundColor": "transparent",'
)
WHERE widgets_snapshot LIKE '%hero-badge%';
