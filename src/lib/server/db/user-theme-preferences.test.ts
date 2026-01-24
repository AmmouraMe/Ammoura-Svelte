import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserThemePreferences,
  saveUserThemePreferences,
  deleteUserThemePreferences,
  type UserThemePreferencesInput
} from './user-theme-preferences';

describe('user-theme-preferences', () => {
  const mockSiteId = 'test-site';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserThemePreferences', () => {
    it('returns user theme preferences when found', async () => {
      const mockResult = {
        user_id: mockUserId,
        site_id: mockSiteId,
        color_scheme: 'dark',
        light_theme_id: 'vibrant',
        dark_theme_id: 'midnight',
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockResult)
          })
        })
      };

      const result = await getUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId
      );

      expect(result).toEqual(mockResult);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('returns null when no preferences found', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null)
          })
        })
      };

      const result = await getUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId
      );

      expect(result).toBeNull();
    });

    it('returns null on database error', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get user theme preferences:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('saveUserThemePreferences', () => {
    it('saves new preferences when none exist', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      const preferences: UserThemePreferencesInput = {
        color_scheme: 'dark',
        light_theme_id: 'vibrant',
        dark_theme_id: 'midnight'
      };

      const result = await saveUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId,
        preferences
      );

      expect(result).toBe(true);
    });

    it('merges with existing preferences when updating', async () => {
      const existingPrefs = {
        user_id: mockUserId,
        site_id: mockSiteId,
        color_scheme: 'system',
        light_theme_id: 'minimal',
        dark_theme_id: 'midnight',
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingPrefs),
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      // Only update color_scheme, keep existing theme IDs
      const preferences: UserThemePreferencesInput = {
        color_scheme: 'dark'
      };

      const result = await saveUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId,
        preferences
      );

      expect(result).toBe(true);
    });

    it('defaults to system color scheme when not specified', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      // Empty preferences should default to 'system'
      const preferences: UserThemePreferencesInput = {};

      const result = await saveUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId,
        preferences
      );

      expect(result).toBe(true);
    });

    it('returns false on database error', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await saveUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId,
        { color_scheme: 'dark' }
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('allows setting null theme IDs', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      const preferences: UserThemePreferencesInput = {
        light_theme_id: null,
        dark_theme_id: null
      };

      const result = await saveUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId,
        preferences
      );

      expect(result).toBe(true);
    });
  });

  describe('deleteUserThemePreferences', () => {
    it('deletes preferences successfully', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({})
          })
        })
      };

      const result = await deleteUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId
      );

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM user_theme_preferences WHERE site_id = ? AND user_id = ?'
      );
    });

    it('returns false on database error', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await deleteUserThemePreferences(
        mockDb as unknown as D1Database,
        mockSiteId,
        mockUserId
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
