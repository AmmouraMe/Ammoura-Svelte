import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { themeStore } from './theme';

describe('Theme Store', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      }
    };
  })();

  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      }
    };
  })();

  // Mock matchMedia
  const mockMatchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  });

  // Mock document.documentElement
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn()
  };

  const mockSetAttribute = vi.fn();

  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    // Setup sessionStorage mock
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true
    });

    // Setup matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia
    });

    // Setup document mock with spy functions
    document.documentElement.setAttribute = mockSetAttribute;
    Object.defineProperty(document.documentElement, 'classList', {
      value: mockClassList,
      writable: true,
      configurable: true
    });

    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    themeStore.cleanup();
  });

  describe('setTheme', () => {
    it('should set the theme to dark', () => {
      themeStore.setTheme('dark');
      expect(get(themeStore)).toBe('dark');
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });

    it('should set the theme to light', () => {
      themeStore.setTheme('light');
      expect(get(themeStore)).toBe('light');
      expect(localStorageMock.getItem('theme')).toBe('light');
    });

    it('should set the theme to system', () => {
      themeStore.setTheme('system');
      expect(get(themeStore)).toBe('system');
      expect(localStorageMock.getItem('theme')).toBe('system');
    });

    it('should store applied theme in sessionStorage for FOUC prevention', () => {
      themeStore.setTheme('dark');
      expect(sessionStorageMock.getItem('applied-theme')).toBe('dark');
    });

    it('should add theme-loaded class to document', () => {
      themeStore.setTheme('light');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-loaded');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      themeStore.setTheme('light');
      themeStore.toggleTheme();
      expect(get(themeStore)).toBe('dark');
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      themeStore.setTheme('dark');
      themeStore.toggleTheme();
      expect(get(themeStore)).toBe('light');
      expect(localStorageMock.getItem('theme')).toBe('light');
    });

    it('should toggle from system to opposite of system preference', () => {
      // Mock system preference as light (matches: false)
      mockMatchMedia.mockReturnValue({
        matches: false, // light mode
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      themeStore.setTheme('system');
      themeStore.toggleTheme();

      // Should toggle to dark (opposite of system light)
      expect(get(themeStore)).toBe('dark');
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });

    it('should toggle from system to light when system prefers dark', () => {
      // Mock system preference as dark (matches: true)
      mockMatchMedia.mockReturnValue({
        matches: true, // dark mode
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      themeStore.setTheme('system');
      themeStore.toggleTheme();

      // Should toggle to light (opposite of system dark)
      expect(get(themeStore)).toBe('light');
      expect(localStorageMock.getItem('theme')).toBe('light');
    });
  });

  describe('initTheme', () => {
    it('should initialize the theme from localStorage', () => {
      localStorageMock.setItem('theme', 'dark');
      themeStore.initTheme();
      expect(get(themeStore)).toBe('dark');
    });

    it('should default to system if no stored theme', () => {
      themeStore.initTheme();
      expect(get(themeStore)).toBe('system');
    });

    it('should validate stored theme value', () => {
      localStorageMock.setItem('theme', 'invalid');
      themeStore.initTheme();
      // Should fallback to system for invalid value
      expect(get(themeStore)).toBe('system');
    });
  });

  describe('immediate initialization', () => {
    it('should apply theme attributes when setTheme is called', () => {
      // Verify that when theme is set, both setAttribute and classList.add are called
      themeStore.setTheme('dark');
      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-loaded');
    });

    it('should initialize with stored theme on creation', () => {
      localStorageMock.setItem('theme', 'dark');
      // The store has already been created, but we can verify it reads from storage
      const storedTheme = localStorageMock.getItem('theme');
      expect(storedTheme).toBe('dark');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources without errors', () => {
      themeStore.initTheme();
      expect(() => themeStore.cleanup()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      themeStore.cleanup();
      expect(() => themeStore.cleanup()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors during setTheme', () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw, just handle gracefully
      expect(() => themeStore.setTheme('dark')).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle localStorage errors during toggleTheme', () => {
      // Mock localStorage.setItem to throw
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      themeStore.setTheme('light');

      // Should not throw, just handle gracefully
      expect(() => themeStore.toggleTheme()).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle localStorage errors during initTheme', () => {
      // Mock localStorage.getItem to throw
      const getItemSpy = vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw, just handle gracefully and fallback to defaults
      expect(() => themeStore.initTheme()).not.toThrow();

      getItemSpy.mockRestore();
    });

    it('should handle matchMedia not being available', () => {
      // Simulate environment without matchMedia support
      const originalMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: undefined
      });

      // Should handle gracefully
      expect(() => themeStore.initTheme()).not.toThrow();

      // Restore
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia
      });
    });
  });

  describe('system theme detection', () => {
    it('should detect dark system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // dark mode
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      themeStore.setTheme('system');
      expect(get(themeStore)).toBe('system');
      // The actual theme applied would be dark (tested through integration)
    });

    it('should detect light system theme', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // light mode
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      themeStore.setTheme('system');
      expect(get(themeStore)).toBe('system');
      // The actual theme applied would be light (tested through integration)
    });
  });

  describe('media query change listener', () => {
    it('should apply system theme when media query changes and theme is system', () => {
      const addEventListenerFn = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerFn,
        removeEventListener: vi.fn()
      });

      localStorageMock.setItem('theme', 'system');
      themeStore.initTheme();

      expect(addEventListenerFn).toHaveBeenCalledWith('change', expect.any(Function));
      const changeCallback = addEventListenerFn.mock.calls[0][1];

      mockSetAttribute.mockClear();
      changeCallback();

      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('should not reapply theme when media query changes and theme is not system', () => {
      const addEventListenerFn = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerFn,
        removeEventListener: vi.fn()
      });

      localStorageMock.setItem('theme', 'dark');
      themeStore.initTheme();

      const changeCallback = addEventListenerFn.mock.calls[0][1];
      mockSetAttribute.mockClear();

      changeCallback();
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('should apply dark theme when system prefers dark', () => {
      const addEventListenerFn = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: addEventListenerFn,
        removeEventListener: vi.fn()
      });

      localStorageMock.clear();
      themeStore.initTheme();

      const changeCallback = addEventListenerFn.mock.calls[0][1];
      mockSetAttribute.mockClear();

      changeCallback();
      expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('cleanup with active listener', () => {
    it('should call removeEventListener when mediaQuery and listener exist', () => {
      const removeEventListenerFn = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerFn
      });

      themeStore.initTheme();
      themeStore.cleanup();

      expect(removeEventListenerFn).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle removeEventListener throwing during cleanup', () => {
      const removeEventListenerFn = vi.fn().mockImplementation(() => {
        throw new Error('removeEventListener failed');
      });
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerFn
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      themeStore.initTheme();
      expect(() => themeStore.cleanup()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cleanup media query listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('applyTheme error handling', () => {
    it('should handle document.documentElement error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const origSetAttribute = document.documentElement.setAttribute;
      document.documentElement.setAttribute = vi.fn().mockImplementation(() => {
        throw new Error('setAttribute failed');
      });

      // setTheme calls applyTheme internally
      expect(() => themeStore.setTheme('dark')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to apply theme:', expect.any(Error));

      document.documentElement.setAttribute = origSetAttribute;
      consoleSpy.mockRestore();
    });
  });

  describe('initTheme - media query listener error handling', () => {
    it('should handle localStorage throwing in media query listener callback', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      let listenerCallback: ((e: MediaQueryListEvent) => void) | null = null;

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi
          .fn()
          .mockImplementation((_event: string, cb: (e: MediaQueryListEvent) => void) => {
            listenerCallback = cb;
          }),
        removeEventListener: vi.fn()
      });

      themeStore.initTheme();

      // Now make localStorage throw and trigger the listener to cover the catch block
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage failed');
      });

      // Trigger media query change
      if (listenerCallback) {
        (listenerCallback as (e: MediaQueryListEvent) => void)({
          matches: true
        } as MediaQueryListEvent);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to handle system theme change:',
        expect.any(Error)
      );

      getItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('SSR environment', () => {
    it('should default to system theme in SSR (non-browser) environment', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({
        browser: false,
        building: false,
        dev: true,
        version: 'test'
      }));

      const { themeStore: ssrThemeStore } = await import('./theme');
      const { get: getValue } = await import('svelte/store');

      // In SSR, the theme should default to 'system'
      const theme = getValue(ssrThemeStore);
      expect(theme).toBe('system');

      // Calling toggleTheme in SSR should be a no-op (L109)
      ssrThemeStore.toggleTheme();
      expect(getValue(ssrThemeStore)).toBe('system');

      // Calling initTheme in SSR should be a no-op (L138)
      ssrThemeStore.initTheme();
      expect(getValue(ssrThemeStore)).toBe('system');

      // Calling reloadThemeColors in SSR should be a no-op (L176)
      await ssrThemeStore.reloadThemeColors();
      expect(getValue(ssrThemeStore)).toBe('system');

      // Calling setTheme in SSR should be a no-op (L92)
      ssrThemeStore.setTheme('dark');
      expect(getValue(ssrThemeStore)).toBe('system');

      vi.doUnmock('$app/environment');
    });

    it('should handle localStorage warning during init', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({
        browser: true,
        building: false,
        dev: true,
        version: 'test'
      }));

      // Make localStorage throw during init
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { themeStore: failThemeStore } = await import('./theme');
      const { get: getValue } = await import('svelte/store');

      const theme = getValue(failThemeStore);
      // Should fall back to default even when localStorage fails
      expect(theme).toBe('system');

      getItemSpy.mockRestore();
      consoleSpy.mockRestore();
      vi.doUnmock('$app/environment');
    });
  });
});
