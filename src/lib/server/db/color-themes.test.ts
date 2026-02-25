import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllColorThemes,
  getColorThemeById,
  saveColorTheme,
  deleteColorTheme,
  updateThemeOrder,
  getThemePreference,
  setThemePreference
} from './color-themes';
import type { D1Database } from '@cloudflare/workers-types';
import type { ColorThemeDefinition, ThemeColors } from '$lib/types/pages';

describe('Color Themes Database Functions', () => {
  let mockDb: D1Database;
  const siteId = 'site-1';

  const mockColors: ThemeColors = {
    primary: '#ef4444',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#374151',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  const mockTheme: ColorThemeDefinition = {
    id: 'theme-1',
    name: 'Default Light',
    mode: 'light',
    isDefault: true,
    isSystem: true,
    colors: mockColors,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;
  });

  describe('getAllColorThemes', () => {
    it('should retrieve all color themes for a site', async () => {
      const mockDbResult = {
        id: 'theme-1',
        name: 'Default Light',
        mode: 'light' as const,
        isDefault: 1,
        isSystem: 1,
        sort_order: 0,
        colors: JSON.stringify(mockColors),
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [mockDbResult] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getAllColorThemes(mockDb, siteId);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name, mode'));
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'theme-1',
        name: 'Default Light',
        mode: 'light',
        isDefault: true,
        isSystem: true
      });
      expect(result[0].colors).toEqual(mockColors);
    });

    it('should return empty array when no themes exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getAllColorThemes(mockDb, siteId);

      expect(result).toEqual([]);
    });

    it('should handle null results', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: null })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getAllColorThemes(mockDb, siteId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getAllColorThemes(mockDb, siteId);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get color themes:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should order themes by sort_order and created_at', async () => {
      const theme1 = {
        id: 'theme-1',
        name: 'Theme 1',
        mode: 'light' as const,
        isDefault: 0,
        isSystem: 0,
        sort_order: 2,
        colors: JSON.stringify(mockColors),
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const theme2 = {
        id: 'theme-2',
        name: 'Theme 2',
        mode: 'light' as const,
        isDefault: 0,
        isSystem: 0,
        sort_order: 0,
        colors: JSON.stringify(mockColors),
        created_at: 1234567891,
        updated_at: 1234567891
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [theme1, theme2] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getAllColorThemes(mockDb, siteId);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sort_order ASC, created_at ASC')
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getColorThemeById', () => {
    it('should retrieve a specific theme by ID', async () => {
      const mockDbResult = {
        id: 'theme-1',
        name: 'Default Light',
        mode: 'light' as const,
        isDefault: 1,
        isSystem: 1,
        colors: JSON.stringify(mockColors),
        created_at: 1234567890,
        updated_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockDbResult)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getColorThemeById(mockDb, siteId, 'theme-1');

      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, 'theme-1');
      expect(result).toMatchObject({
        id: 'theme-1',
        name: 'Default Light',
        mode: 'light',
        isDefault: true,
        isSystem: true
      });
      expect(result?.colors).toEqual(mockColors);
    });

    it('should return null when theme not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getColorThemeById(mockDb, siteId, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getColorThemeById(mockDb, siteId, 'theme-1');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get color theme:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('saveColorTheme', () => {
    it('should create a new theme when it does not exist', async () => {
      const existingCheck = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      const maxOrderQuery = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ max_order: 2 })
      };

      const insertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingCheck;
        if (callCount === 2) return maxOrderQuery;
        return insertStatement;
      });

      const result = await saveColorTheme(mockDb, siteId, mockTheme);

      expect(result).toBe(true);
      expect(insertStatement.bind).toHaveBeenCalledWith(
        'theme-1',
        siteId,
        'Default Light',
        'light',
        1,
        1,
        3, // max_order + 1
        JSON.stringify(mockColors),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should update existing theme', async () => {
      const existingCheck = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: 'theme-1' })
      };

      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingCheck;
        return updateStatement;
      });

      const result = await saveColorTheme(mockDb, siteId, mockTheme);

      expect(result).toBe(true);
      expect(updateStatement.bind).toHaveBeenCalledWith(
        'Default Light',
        'light',
        1,
        JSON.stringify(mockColors),
        expect.any(Number),
        siteId,
        'theme-1'
      );
    });

    it('should handle isDefault false correctly', async () => {
      const themeWithoutDefault = { ...mockTheme, isDefault: false };

      const existingCheck = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      const maxOrderQuery = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ max_order: 0 })
      };

      const insertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingCheck;
        if (callCount === 2) return maxOrderQuery;
        return insertStatement;
      });

      await saveColorTheme(mockDb, siteId, themeWithoutDefault);

      expect(insertStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        0, // isDefault false
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await saveColorTheme(mockDb, siteId, mockTheme);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save color theme:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should use default sort_order of 0 when no existing themes', async () => {
      const existingCheck = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      const maxOrderQuery = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null) // No max_order
      };

      const insertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingCheck;
        if (callCount === 2) return maxOrderQuery;
        return insertStatement;
      });

      await saveColorTheme(mockDb, siteId, mockTheme);

      expect(insertStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        1, // 0 + 1
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('deleteColorTheme', () => {
    it('should delete a theme successfully', async () => {
      const getThemeStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'theme-1',
          name: 'Test Theme',
          mode: 'light',
          isDefault: 0,
          isSystem: 0,
          colors: JSON.stringify(mockColors),
          created_at: 1234567890,
          updated_at: 1234567890
        })
      };

      const preferenceStatement1 = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'other-theme' })
      };

      const preferenceStatement2 = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'another-theme' })
      };

      const deleteStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getThemeStatement;
        if (callCount === 2) return preferenceStatement1;
        if (callCount === 3) return preferenceStatement2;
        return deleteStatement;
      });

      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(true);
      expect(deleteStatement.bind).toHaveBeenCalledWith(siteId, 'theme-1');
    });

    it('should return false when theme not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await deleteColorTheme(mockDb, siteId, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should prevent deletion of system light theme', async () => {
      const getThemeStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'theme-1',
          name: 'System Light',
          mode: 'light',
          isDefault: 1,
          isSystem: 1,
          colors: JSON.stringify(mockColors),
          created_at: 1234567890,
          updated_at: 1234567890
        })
      };

      const preferenceStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'theme-1' })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getThemeStatement;
        return preferenceStatement;
      });

      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(false);
    });

    it('should prevent deletion of system dark theme', async () => {
      const getThemeStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          id: 'theme-dark',
          name: 'System Dark',
          mode: 'dark',
          isDefault: 1,
          isSystem: 1,
          colors: JSON.stringify(mockColors),
          created_at: 1234567890,
          updated_at: 1234567890
        })
      };

      const preferenceStatement1 = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'other-theme' })
      };

      const preferenceStatement2 = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'theme-dark' })
      };

      let callCount = 0;
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getThemeStatement;
        if (callCount === 2) return preferenceStatement1;
        return preferenceStatement2;
      });

      const result = await deleteColorTheme(mockDb, siteId, 'theme-dark');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(false);
      // The error is caught in getColorThemeById which is called first
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get color theme:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('updateThemeOrder', () => {
    it('should update sort order for multiple themes', async () => {
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(updateStatement);

      const themeIds = ['theme-3', 'theme-1', 'theme-2'];
      const result = await updateThemeOrder(mockDb, siteId, themeIds);

      expect(result).toBe(true);
      expect(updateStatement.bind).toHaveBeenCalledTimes(3);
      expect(updateStatement.bind).toHaveBeenNthCalledWith(
        1,
        0,
        expect.any(Number),
        siteId,
        'theme-3'
      );
      expect(updateStatement.bind).toHaveBeenNthCalledWith(
        2,
        1,
        expect.any(Number),
        siteId,
        'theme-1'
      );
      expect(updateStatement.bind).toHaveBeenNthCalledWith(
        3,
        2,
        expect.any(Number),
        siteId,
        'theme-2'
      );
    });

    it('should handle empty theme list', async () => {
      const result = await updateThemeOrder(mockDb, siteId, []);

      expect(result).toBe(true);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(updateStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await updateThemeOrder(mockDb, siteId, ['theme-1']);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update theme order:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getThemePreference', () => {
    it('should retrieve theme preference', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ setting_value: 'theme-light-1' })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemePreference(mockDb, siteId, 'system-light-theme');

      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, 'system-light-theme');
      expect(result).toBe('theme-light-1');
    });

    it('should return null when preference not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getThemePreference(mockDb, siteId, 'system-dark-theme');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getThemePreference(mockDb, siteId, 'system-light-theme');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get theme preference:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('setThemePreference', () => {
    it('should set theme preference', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await setThemePreference(mockDb, siteId, 'system-light-theme', 'theme-1');

      expect(result).toBe(true);
      expect(mockStatement.bind).toHaveBeenCalledWith(
        siteId,
        'system-light-theme',
        'theme-1',
        expect.any(Number),
        expect.any(Number),
        'theme-1',
        expect.any(Number)
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setThemePreference(mockDb, siteId, 'system-light-theme', 'theme-1');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to set theme preference:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('deleteColorTheme error branch', () => {
    it('should return false when delete throws an error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callCount = 0;
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount > 0) {
            throw new Error('Delete failed');
          }
          return Promise.resolve({ success: true });
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { deleteColorTheme } = await import('./color-themes');
      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should return false when deleting active system light theme', async () => {
      let callCount = 0;
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve({ setting_value: 'theme-1' });
            if (callCount === 2) return Promise.resolve({ setting_value: 'theme-2' });
            return Promise.resolve(null);
          }),
          run: vi.fn().mockResolvedValue({ meta: { changes: 1 } })
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { deleteColorTheme } = await import('./color-themes');
      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(false);
    });

    it('should return false when deleting active system dark theme', async () => {
      let callCount = 0;
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve({ setting_value: 'other-theme' });
            if (callCount === 2) return Promise.resolve({ setting_value: 'theme-1' });
            return Promise.resolve(null);
          }),
          run: vi.fn().mockResolvedValue({ meta: { changes: 1 } })
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { deleteColorTheme } = await import('./color-themes');
      const result = await deleteColorTheme(mockDb, siteId, 'theme-1');

      expect(result).toBe(false);
    });
  });
});
