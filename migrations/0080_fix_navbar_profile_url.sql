-- Migration: 0080_fix_navbar_profile_url
-- Description: Fix Profile link URL in Navigation Bar component to match actual route
-- The Profile page is at /user/profile, not /profile (or # placeholder)
-- This handles both the legacy accountMenuItems format and the new nested container architecture
-- Rollback: UPDATE components SET config = replace(config, '"/user/profile"', '"#"') WHERE name = 'Navigation Bar';

-- Update the Navigation Bar component's config using string replacement
-- This handles deeply nested profile-button URL in the container architecture
UPDATE components
SET config = replace(
  config,
  '"id": "profile-button", "type": "button", "config": {"label": "Profile", "url": "#"',
  '"id": "profile-button", "type": "button", "config": {"label": "Profile", "url": "/user/profile"'
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1
AND config LIKE '%"id": "profile-button"%';

-- Also handle compact JSON format (no spaces after colons)
UPDATE components
SET config = replace(
  config,
  '"id":"profile-button","type":"button","config":{"label":"Profile","url":"#"',
  '"id":"profile-button","type":"button","config":{"label":"Profile","url":"/user/profile"'
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1
AND config LIKE '%profile-button%'
AND config LIKE '%"url":"#"%';

-- Legacy format: update accountMenuItems if present
UPDATE components
SET config = json_replace(
  config,
  '$.accountMenuItems[0].url', '/user/profile'
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'Navigation Bar' AND is_global = 1
AND json_extract(config, '$.accountMenuItems[0].url') IS NOT NULL;
