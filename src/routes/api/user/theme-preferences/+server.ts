import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as userThemePreferences from '$lib/server/db/user-theme-preferences';
import * as colorThemes from '$lib/server/db/color-themes';
import type { RequestHandler } from './$types';

/**
 * GET /api/user/theme-preferences
 * Get current user's theme preferences
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  // Require authentication
  if (!locals.currentUser) {
    throw error(401, 'Unauthorized');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;
  const userId = locals.currentUser.id;

  try {
    // Get user's preferences
    const preferences = await userThemePreferences.getUserThemePreferences(db, siteId, userId);

    // Get available themes for the site
    const themes = await colorThemes.getAllColorThemes(db, siteId);

    // Get site's default themes as fallback
    const [siteLightTheme, siteDarkTheme] = await Promise.all([
      colorThemes.getThemePreference(db, siteId, 'system-light-theme'),
      colorThemes.getThemePreference(db, siteId, 'system-dark-theme')
    ]);

    return json({
      preferences: preferences || {
        user_id: userId,
        site_id: siteId,
        color_scheme: 'system',
        light_theme_id: null,
        dark_theme_id: null
      },
      themes,
      siteDefaults: {
        light_theme_id: siteLightTheme || 'vibrant',
        dark_theme_id: siteDarkTheme || 'midnight'
      }
    });
  } catch (err) {
    console.error('Error loading user theme preferences:', err);
    throw error(500, 'Failed to load theme preferences');
  }
};

/**
 * POST /api/user/theme-preferences
 * Save current user's theme preferences
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  // Require authentication
  if (!locals.currentUser) {
    throw error(401, 'Unauthorized');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;
  const userId = locals.currentUser.id;

  try {
    const body = (await request.json()) as {
      color_scheme?: 'light' | 'dark' | 'system';
      light_theme_id?: string | null;
      dark_theme_id?: string | null;
    };

    // Validate color_scheme if provided
    if (body.color_scheme && !['light', 'dark', 'system'].includes(body.color_scheme)) {
      throw error(400, 'Invalid color scheme. Must be light, dark, or system.');
    }

    // Validate theme IDs if provided
    if (body.light_theme_id || body.dark_theme_id) {
      const themes = await colorThemes.getAllColorThemes(db, siteId);
      const themeIds = themes.map((t) => t.id);

      if (body.light_theme_id && !themeIds.includes(body.light_theme_id)) {
        throw error(400, 'Invalid light theme ID');
      }

      if (body.dark_theme_id && !themeIds.includes(body.dark_theme_id)) {
        throw error(400, 'Invalid dark theme ID');
      }
    }

    const success = await userThemePreferences.saveUserThemePreferences(db, siteId, userId, {
      color_scheme: body.color_scheme,
      light_theme_id: body.light_theme_id,
      dark_theme_id: body.dark_theme_id
    });

    if (!success) {
      throw error(500, 'Failed to save theme preferences');
    }

    // Return updated preferences
    const preferences = await userThemePreferences.getUserThemePreferences(db, siteId, userId);

    return json({
      success: true,
      preferences
    });
  } catch (err) {
    console.error('Error saving user theme preferences:', err);
    if (err instanceof Response) throw err;
    throw error(500, 'Failed to save theme preferences');
  }
};
