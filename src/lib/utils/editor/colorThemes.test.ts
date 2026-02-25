import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SYSTEM_THEMES,
  getAllThemes,
  getThemeById,
  getThemeColors,
  applyThemeColors,
  generateThemeStyles,
  getAvailableThemes,
  getDefaultTheme,
  saveCustomTheme,
  deleteCustomTheme,
  setDefaultTheme,
  themeRefToCssVar,
  resolveThemeColor,
  getSystemTheme,
  setSystemTheme,
  saveThemeOrder,
  setCurrentlyViewingTheme,
  setActiveTheme,
  getCurrentlyViewingTheme
} from './colorThemes';
import type { ColorThemeDefinition } from '$lib/types/pages';

describe('Color Themes', () => {
  describe('SYSTEM_THEMES', () => {
    it('should have default light and dark themes', () => {
      expect(SYSTEM_THEMES.length).toBeGreaterThanOrEqual(2);
      const lightTheme = SYSTEM_THEMES.find((t) => t.id === 'vibrant');
      const darkTheme = SYSTEM_THEMES.find((t) => t.id === 'midnight');
      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();
    });

    it('should have system themes marked correctly', () => {
      SYSTEM_THEMES.forEach((theme) => {
        expect(theme.isSystem).toBe(true);
      });
    });
  });

  describe('getAllThemes', () => {
    it('should return all system themes', () => {
      const themes = getAllThemes();
      expect(themes.length).toBeGreaterThanOrEqual(SYSTEM_THEMES.length);
    });
  });

  describe('getThemeById', () => {
    it('should find theme by id', () => {
      const theme = getThemeById('vibrant');
      expect(theme).toBeDefined();
      expect(theme!.id).toBe('vibrant');
    });

    it('should return undefined for non-existent theme', () => {
      const theme = getThemeById('nonexistent');
      expect(theme).toBeUndefined();
    });
  });

  describe('getThemeColors', () => {
    it('should return colors for vibrant theme', () => {
      const colors = getThemeColors('vibrant');
      expect(colors.primary).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.text).toBeDefined();
    });

    it('should return colors for midnight theme', () => {
      const colors = getThemeColors('midnight');
      expect(colors.primary).toBeDefined();
      expect(colors.background).toBeDefined();
    });

    it('should fallback to default light for invalid theme', () => {
      const colors = getThemeColors('invalid');
      const defaultColors = getThemeColors('vibrant');
      expect(colors).toEqual(defaultColors);
    });

    it('should use vibrant when no theme id provided', () => {
      const colors = getThemeColors();
      const defaultColors = getThemeColors('vibrant');
      expect(colors).toEqual(defaultColors);
    });
  });

  describe('applyThemeColors', () => {
    it('should apply theme colors without overrides', () => {
      const colors = applyThemeColors('vibrant');
      expect(colors.primary).toBeDefined();
    });

    it('should apply overrides to theme colors', () => {
      const colors = applyThemeColors('vibrant', { primary: '#ff0000' });
      expect(colors.primary).toBe('#ff0000');
    });

    it('should preserve non-overridden colors', () => {
      const baseColors = getThemeColors('vibrant');
      const colors = applyThemeColors('vibrant', { primary: '#ff0000' });
      expect(colors.secondary).toBe(baseColors.secondary);
    });
  });

  describe('generateThemeStyles', () => {
    it('should generate CSS custom properties', () => {
      const colors = getThemeColors('vibrant');
      const styles = generateThemeStyles(colors);

      expect(styles).toContain('--theme-primary:');
      expect(styles).toContain('--theme-secondary:');
      expect(styles).toContain('--theme-background:');
      expect(styles).toContain('--theme-text:');
    });

    it('should include all color properties', () => {
      const colors = getThemeColors('vibrant');
      const styles = generateThemeStyles(colors);

      expect(styles).toContain('--theme-success:');
      expect(styles).toContain('--theme-warning:');
      expect(styles).toContain('--theme-error:');
      expect(styles).toContain('--theme-border:');
    });
  });

  describe('getAvailableThemes', () => {
    it('should return themes in dropdown format', () => {
      const themes = getAvailableThemes();
      expect(themes.length).toBeGreaterThan(0);
      expect(themes[0]).toHaveProperty('value');
      expect(themes[0]).toHaveProperty('label');
      expect(themes[0]).toHaveProperty('mode');
    });

    it('should include system themes', () => {
      const themes = getAvailableThemes();
      const lightTheme = themes.find((t) => t.value === 'vibrant');
      expect(lightTheme).toBeDefined();
      expect(lightTheme!.mode).toBe('light');
    });
  });

  describe('getDefaultTheme', () => {
    it('should return default light theme', () => {
      const theme = getDefaultTheme('light');
      expect(theme.mode).toBe('light');
      expect(theme.isDefault).toBe(true);
    });

    it('should return default dark theme', () => {
      const theme = getDefaultTheme('dark');
      expect(theme.mode).toBe('dark');
      expect(theme.isDefault).toBe(true);
    });
  });

  describe('saveCustomTheme', () => {
    const customTheme: ColorThemeDefinition = {
      id: 'custom-test',
      name: 'Custom Test',
      mode: 'light',
      isDefault: false,
      isSystem: false,
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        background: '#ffffff',
        surface: '#f0f0f0',
        text: '#000000',
        textSecondary: '#666666',
        border: '#cccccc',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000'
      }
    };

    it('should add new custom theme', () => {
      saveCustomTheme(customTheme);
      const found = getThemeById('custom-test');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Custom Test');
    });

    it('should update existing custom theme', () => {
      saveCustomTheme(customTheme);
      const updated = { ...customTheme, name: 'Updated Name' };
      saveCustomTheme(updated);

      const found = getThemeById('custom-test');
      expect(found!.name).toBe('Updated Name');
    });

    it('should set timestamps on new theme', () => {
      const newTheme = { ...customTheme, id: 'new-with-timestamp' };
      saveCustomTheme(newTheme);
      const found = getThemeById('new-with-timestamp');
      expect(found!.created_at).toBeDefined();
      expect(found!.updated_at).toBeDefined();
    });
  });

  describe('deleteCustomTheme', () => {
    beforeEach(() => {
      saveCustomTheme({
        id: 'deletable',
        name: 'Deletable',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: getThemeColors('vibrant')
      });
    });

    it('should delete custom theme', () => {
      const result = deleteCustomTheme('deletable');
      expect(result).toBe(true);
      expect(getThemeById('deletable')).toBeUndefined();
    });

    it('should not delete system theme', () => {
      const result = deleteCustomTheme('vibrant');
      expect(result).toBe(false);
      expect(getThemeById('vibrant')).toBeDefined();
    });

    it('should return false for non-existent theme', () => {
      const result = deleteCustomTheme('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('setDefaultTheme', () => {
    beforeEach(() => {
      saveCustomTheme({
        id: 'custom-light',
        name: 'Custom Light',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: getThemeColors('vibrant')
      });
    });

    it('should set custom theme as default', () => {
      const result = setDefaultTheme('custom-light', 'light');
      expect(result).toBe(true);
    });

    it('should return false for wrong mode', () => {
      const result = setDefaultTheme('custom-light', 'dark');
      expect(result).toBe(false);
    });

    it('should return false for non-existent theme', () => {
      const result = setDefaultTheme('nonexistent', 'light');
      expect(result).toBe(false);
    });
  });

  describe('themeRefToCssVar', () => {
    it('should convert theme: reference to CSS variable', () => {
      const result = themeRefToCssVar('theme:primary');
      expect(result).toBe('var(--theme-primary)');
    });

    it('should convert theme:textSecondary to CSS variable', () => {
      const result = themeRefToCssVar('theme:textSecondary');
      expect(result).toBe('var(--theme-text-secondary)');
    });

    it('should convert color: reference to CSS variable', () => {
      const result = themeRefToCssVar('color:primary-light');
      expect(result).toBe('var(--color-primary-light)');
    });

    it('should return null for plain color value', () => {
      const result = themeRefToCssVar('#ff0000');
      expect(result).toBeNull();
    });

    it('should return null for undefined value', () => {
      const result = themeRefToCssVar(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = themeRefToCssVar('');
      expect(result).toBeNull();
    });
  });

  describe('resolveThemeColor', () => {
    it('should return plain color value', () => {
      const result = resolveThemeColor('#ff0000', 'vibrant');
      expect(result).toBe('#ff0000');
    });

    it('should always convert theme: references to CSS vars', () => {
      const resultTrue = resolveThemeColor('theme:primary', 'vibrant', '', true);
      expect(resultTrue).toBe('var(--theme-primary)');

      const resultFalse = resolveThemeColor('theme:primary', 'vibrant', '', false);
      expect(resultFalse).toBe('var(--theme-primary)');
    });

    it('should resolve object with theme-specific colors', () => {
      const colorObj = {
        vibrant: '#ff0000',
        midnight: '#00ff00'
      };
      const result = resolveThemeColor(colorObj, 'vibrant');
      expect(result).toBe('#ff0000');
    });

    it('should fallback to default theme of same mode', () => {
      const colorObj = {
        vibrant: '#ff0000',
        midnight: '#00ff00'
      };
      const result = resolveThemeColor(colorObj, 'vibrant');
      expect(result).toBe('#ff0000');
    });

    it('should return fallback color when value is undefined', () => {
      const result = resolveThemeColor(undefined, 'vibrant', '#fallback');
      expect(result).toBe('#fallback');
    });

    it('should return empty string when no value or fallback', () => {
      const result = resolveThemeColor(undefined, 'vibrant');
      expect(result).toBe('');
    });

    it('should resolve color: references to CSS vars', () => {
      const result = resolveThemeColor('color:primary-light', 'vibrant');
      expect(result).toBe('var(--color-primary-light)');
    });

    it('should convert object theme color to CSS var when asCssVar is true', () => {
      const colorObj = {
        vibrant: 'theme:primary',
        midnight: 'theme:secondary'
      };
      const result = resolveThemeColor(colorObj, 'vibrant', '', true);
      expect(result).toBe('var(--theme-primary)');
    });

    it('should return first available color from object when theme not found', () => {
      const colorObj = {
        'custom-theme': '#ff0000',
        'another-theme': '#00ff00'
      };
      const result = resolveThemeColor(colorObj, 'vibrant');
      expect(result).toBe('#ff0000');
    });

    it('should convert first available color to CSS var when needed', () => {
      const colorObj = {
        'custom-theme': 'theme:accent'
      };
      const result = resolveThemeColor(colorObj, 'vibrant', '', true);
      expect(result).toBe('var(--theme-accent)');
    });

    it('should return fallback for empty object', () => {
      const result = resolveThemeColor({} as Record<string, string>, 'vibrant', '#fallback');
      expect(result).toBe('#fallback');
    });

    it('should return empty string for empty object without fallback', () => {
      const result = resolveThemeColor({} as Record<string, string>, 'vibrant');
      expect(result).toBe('');
    });

    it('should resolve color for same mode when exact theme not found', () => {
      // Save a custom light theme first
      saveCustomTheme({
        id: 'custom-light-test',
        name: 'Custom Light Test',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: getThemeColors('vibrant')
      });

      const colorObj = {
        vibrant: '#ff0000',
        midnight: '#00ff00'
      };

      // This should fallback to vibrant since custom-light-test is in light mode
      const result = resolveThemeColor(colorObj, 'custom-light-test');
      expect(result).toBe('#ff0000');

      // Cleanup
      deleteCustomTheme('custom-light-test');
    });
  });

  describe('saveThemeOrder', () => {
    it('should save theme order successfully', () => {
      saveThemeOrder(['midnight', 'vibrant', 'minimal']);
      // Just verify no error is thrown
      const themes = getAllThemes();
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should handle empty order array', () => {
      saveThemeOrder([]);
      const themes = getAllThemes();
      expect(themes.length).toBeGreaterThan(0);
    });
  });

  describe('getSystemTheme and setSystemTheme', () => {
    it('should return vibrant for light mode', () => {
      const result = getDefaultTheme('light');
      expect(result.mode).toBe('light');
    });

    it('should return midnight for dark mode', () => {
      const result = getDefaultTheme('dark');
      expect(result.mode).toBe('dark');
    });

    it('should get system theme for light mode', () => {
      const result = getSystemTheme('light');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should get system theme for dark mode', () => {
      const result = getSystemTheme('dark');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should set system theme for light mode', () => {
      const result = setSystemTheme('vibrant', 'light');
      expect(result).toBe(true);
    });

    it('should set system theme for dark mode', () => {
      const result = setSystemTheme('midnight', 'dark');
      expect(result).toBe(true);
    });

    it('should return false when setting theme with wrong mode', () => {
      const result = setSystemTheme('vibrant', 'dark');
      expect(result).toBe(false);
    });

    it('should return false when setting non-existent theme', () => {
      const result = setSystemTheme('non-existent', 'light');
      expect(result).toBe(false);
    });
  });

  describe('resolveThemeColor edge cases', () => {
    it('should convert fallback color to CSS var when asCssVar is true and value is undefined', () => {
      const result = resolveThemeColor(undefined, 'vibrant', 'theme:primary', true);
      expect(result).toBe('var(--theme-primary)');
    });

    it('should return fallback string when asCssVar is true but fallback is plain color', () => {
      const result = resolveThemeColor(undefined, 'vibrant', '#333333', true);
      expect(result).toBe('#333333');
    });

    it('should return fallback for non-string non-object colorValue', () => {
      // The function handles the last branch: return fallbackColor || ''
      const result = resolveThemeColor(42 as unknown as string, 'vibrant', '#fallback');
      expect(result).toBe('#fallback');
    });

    it('should return empty string for non-string non-object colorValue without fallback', () => {
      const result = resolveThemeColor(42 as unknown as string, 'vibrant');
      expect(result).toBe('');
    });

    it('should convert string color with asCssVar=true and color: prefix', () => {
      const result = resolveThemeColor('color:accent', 'vibrant', '', true);
      expect(result).toBe('var(--color-accent)');
    });

    it('should return plain string when asCssVar is false and no prefix', () => {
      const result = resolveThemeColor('rgb(255,0,0)', 'vibrant', '', false);
      expect(result).toBe('rgb(255,0,0)');
    });

    it('should convert object theme color to CSS var for same-mode default theme', () => {
      const colorObj = {
        vibrant: 'theme:accent'
      };
      const result = resolveThemeColor(colorObj, 'vibrant', '', true);
      expect(result).toBe('var(--theme-accent)');
    });

    it('should return object value without CSS var conversion when asCssVar is false', () => {
      const colorObj = {
        vibrant: '#ff0000'
      };
      const result = resolveThemeColor(colorObj, 'vibrant', '', false);
      expect(result).toBe('#ff0000');
    });
  });

  describe('deleteCustomTheme edge cases', () => {
    it('should return false for system theme deletion attempt', () => {
      const result = deleteCustomTheme('vibrant');
      expect(result).toBe(false);
    });

    it('should return false for non-existent theme', () => {
      const result = deleteCustomTheme('does-not-exist');
      expect(result).toBe(false);
    });
  });

  describe('saveThemeOrder edge cases', () => {
    it('should handle localStorage error when saving theme order', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => saveThemeOrder(['vibrant', 'midnight'])).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save theme order:', expect.any(Error));

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('resolveThemeColor edge cases', () => {
    it('should return first available color from object when no theme match', () => {
      const colorObj = {
        'non-existent-theme': '#ff0000'
      };
      const result = resolveThemeColor(colorObj, 'vibrant', '#fallback', false);
      expect(result).toBe('#ff0000');
    });

    it('should return fallback when object has no values', () => {
      const colorObj = {};
      const result = resolveThemeColor(colorObj, 'vibrant', '#fallback', false);
      expect(result).toBe('#fallback');
    });

    it('should return empty string when object has no values and no fallback', () => {
      const colorObj = {};
      const result = resolveThemeColor(colorObj, 'vibrant', '', false);
      expect(result).toBe('');
    });
  });

  describe('getThemeOrder (via getAllThemes)', () => {
    it('should return all themes in default order when no order stored in localStorage', () => {
      // Ensure no theme order is stored (key is 'theme-order')
      localStorage.removeItem('theme-order');
      const themes = getAllThemes();
      // With no saved order, getAllThemes returns allThemes in default order
      expect(themes.length).toBeGreaterThan(0);
      expect(Array.isArray(themes)).toBe(true);
    });

    it('should handle corrupted theme order in localStorage', () => {
      localStorage.setItem('theme-order', 'not-valid-json{');
      const themes = getAllThemes();
      // Falls back to default order when JSON.parse fails
      expect(themes.length).toBeGreaterThan(0);
    });
  });

  describe('getSystemTheme error handling', () => {
    it('should return fallback when localStorage throws', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'system-theme-light' || key === 'system-theme-dark') {
          throw new Error('Storage error');
        }
        return null;
      });
      // getSystemTheme catches and returns 'vibrant' for light mode
      const lightTheme = getSystemTheme('light');
      expect(lightTheme).toBe('vibrant');
      spy.mockRestore();
    });

    it('should return midnight for dark mode when localStorage throws', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'system-theme-dark') {
          throw new Error('Storage error');
        }
        return null;
      });
      const darkTheme = getSystemTheme('dark');
      expect(darkTheme).toBe('midnight');
      spy.mockRestore();
    });
  });

  describe('saveThemeOrder error handling', () => {
    it('should handle localStorage setItem error gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => saveThemeOrder(['vibrant', 'midnight'])).not.toThrow();
      consoleSpy.mockRestore();
      spy.mockRestore();
    });
  });

  describe('setCurrentlyViewingTheme', () => {
    it('should remove theme when null is passed', () => {
      const removeSpy = vi.spyOn(localStorage, 'removeItem');
      setCurrentlyViewingTheme(null);
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it('should set theme when string is passed', () => {
      const setSpy = vi.spyOn(localStorage, 'setItem');
      setCurrentlyViewingTheme('vibrant');
      expect(setSpy).toHaveBeenCalled();
      setSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(() => setCurrentlyViewingTheme('test-theme')).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('resolveThemeColor asCssVar with mode fallback', () => {
    it('should convert mode-fallback color to CSS var when asCssVar is true', () => {
      // Save a custom light theme
      saveCustomTheme({
        id: 'custom-test-asCssVar',
        name: 'Custom Test asCssVar',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: getThemeColors('vibrant')
      });

      const colorObj = {
        vibrant: 'theme:accent',
        midnight: '#0000ff'
      };

      // Resolve with a theme that shares the light mode — should fallback to vibrant's value
      const result = resolveThemeColor(colorObj, 'custom-test-asCssVar', '', true);
      expect(result).toBe('var(--theme-accent)');

      // Cleanup
      deleteCustomTheme('custom-test-asCssVar');
    });
  });

  describe('setSystemTheme', () => {
    it('should set system theme for light mode', () => {
      setSystemTheme('vibrant', 'light');
      const result = getSystemTheme('light');
      expect(result).toBe('vibrant');
    });

    it('should set system theme for dark mode', () => {
      setSystemTheme('midnight', 'dark');
      const result = getSystemTheme('dark');
      expect(result).toBe('midnight');
    });
  });

  describe('setActiveTheme (deprecated wrapper)', () => {
    it('should delegate to setSystemTheme', () => {
      const result = setActiveTheme('vibrant', 'light');
      expect(result).toBe(true);
      expect(getSystemTheme('light')).toBe('vibrant');
    });
  });

  describe('getCurrentlyViewingTheme', () => {
    it('should return stored viewing theme', () => {
      setCurrentlyViewingTheme('midnight');
      const result = getCurrentlyViewingTheme();
      expect(result).toBe('midnight');
      setCurrentlyViewingTheme(null); // cleanup
    });

    it('should return null when no theme is set', () => {
      setCurrentlyViewingTheme(null);
      const result = getCurrentlyViewingTheme();
      expect(result).toBeNull();
    });

    it('should return null when localStorage.getItem throws', () => {
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      const result = getCurrentlyViewingTheme();
      expect(result).toBeNull();
      spy.mockRestore();
    });
  });
});
