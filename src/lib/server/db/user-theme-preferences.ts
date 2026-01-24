import type { D1Database } from '@cloudflare/workers-types';
import type { Theme } from '$lib/types/theme';

/**
 * User theme preferences stored in the database
 */
export interface UserThemePreferences {
  user_id: string;
  site_id: string;
  color_scheme: Theme;
  light_theme_id: string | null;
  dark_theme_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Input for updating user theme preferences
 */
export interface UserThemePreferencesInput {
  color_scheme?: Theme;
  light_theme_id?: string | null;
  dark_theme_id?: string | null;
}

/**
 * Get user theme preferences
 */
export async function getUserThemePreferences(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<UserThemePreferences | null> {
  try {
    const result = await db
      .prepare(
        `SELECT user_id, site_id, color_scheme, light_theme_id, dark_theme_id, 
         created_at, updated_at 
         FROM user_theme_preferences 
         WHERE site_id = ? AND user_id = ?`
      )
      .bind(siteId, userId)
      .first<{
        user_id: string;
        site_id: string;
        color_scheme: Theme;
        light_theme_id: string | null;
        dark_theme_id: string | null;
        created_at: number;
        updated_at: number;
      }>();

    return result || null;
  } catch (error) {
    console.error('Failed to get user theme preferences:', error);
    return null;
  }
}

/**
 * Save user theme preferences (upsert)
 */
export async function saveUserThemePreferences(
  db: D1Database,
  siteId: string,
  userId: string,
  preferences: UserThemePreferencesInput
): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Get existing preferences to merge
    const existing = await getUserThemePreferences(db, siteId, userId);

    const colorScheme = preferences.color_scheme ?? existing?.color_scheme ?? 'system';
    const lightThemeId =
      preferences.light_theme_id !== undefined
        ? preferences.light_theme_id
        : (existing?.light_theme_id ?? null);
    const darkThemeId =
      preferences.dark_theme_id !== undefined
        ? preferences.dark_theme_id
        : (existing?.dark_theme_id ?? null);

    await db
      .prepare(
        `INSERT INTO user_theme_preferences 
         (user_id, site_id, color_scheme, light_theme_id, dark_theme_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, site_id) 
         DO UPDATE SET 
           color_scheme = ?, 
           light_theme_id = ?, 
           dark_theme_id = ?, 
           updated_at = ?`
      )
      .bind(
        userId,
        siteId,
        colorScheme,
        lightThemeId,
        darkThemeId,
        now,
        now,
        colorScheme,
        lightThemeId,
        darkThemeId,
        now
      )
      .run();

    return true;
  } catch (error) {
    console.error('Failed to save user theme preferences:', error);
    return false;
  }
}

/**
 * Delete user theme preferences
 */
export async function deleteUserThemePreferences(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<boolean> {
  try {
    await db
      .prepare('DELETE FROM user_theme_preferences WHERE site_id = ? AND user_id = ?')
      .bind(siteId, userId)
      .run();

    return true;
  } catch (error) {
    console.error('Failed to delete user theme preferences:', error);
    return false;
  }
}
