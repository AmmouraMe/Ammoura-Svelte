-- Migration: 0079_user_theme_preferences
-- Description: Create user theme preferences table for per-user theme customization
-- This allows users to set their preferred light theme, dark theme, and color scheme mode

-- Create user theme preferences table
CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  -- Color scheme mode: 'light', 'dark', or 'system'
  color_scheme TEXT NOT NULL DEFAULT 'system' CHECK(color_scheme IN ('light', 'dark', 'system')),
  -- Preferred light theme ID (references color_themes.id)
  light_theme_id TEXT,
  -- Preferred dark theme ID (references color_themes.id)
  dark_theme_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(user_id, site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user ON user_theme_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_site ON user_theme_preferences(site_id);
