import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { themeStore } from './theme';

// Mock browser environment
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem(key: string): string | null {
    return this.store[key] || null;
  },
  setItem(key: string, value: string): void {
    this.store[key] = value;
  },
  removeItem(key: string): void {
    delete this.store[key];
  },
  clear(): void {
    this.store = {};
  }
};

const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem(key: string): string | null {
    return this.store[key] || null;
  },
  setItem(key: string, value: string): void {
    this.store[key] = value;
  },
  removeItem(key: string): void {
    delete this.store[key];
  },
  clear(): void {
    this.store = {};
  }
};

describe('themeStore.reloadThemeColors', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup browser environment
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: vi.fn(),
        classList: {
          add: vi.fn()
        }
      },
      getElementById: vi.fn(),
      head: {
        appendChild: vi.fn()
      },
      createElement: vi.fn((_tag: string) => ({
        id: '',
        textContent: ''
      }))
    });
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });

    // Mock fetch
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Clear storage
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and applies light theme colors', async () => {
    const mockThemeColors = {
      themeColorsLight: {
        primary: '#3b82f6',
        secondary: '#64748b',
        bgPrimary: '#ffffff',
        textPrimary: '#1e293b'
      },
      themeColorsDark: {
        primary: '#60a5fa',
        secondary: '#94a3b8',
        bgPrimary: '#0f172a',
        textPrimary: '#f1f5f9'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeColors
    });

    const mockStyleElement = { id: '', textContent: '' } as unknown as HTMLElement;
    vi.mocked(document.getElementById).mockReturnValueOnce(null);
    vi.mocked(document.createElement).mockReturnValueOnce(mockStyleElement);

    await themeStore.reloadThemeColors();

    expect(mockFetch).toHaveBeenCalledWith('/api/theme-colors');
    expect(document.createElement).toHaveBeenCalledWith('style');
    expect(mockStyleElement.id).toBe('theme-colors-light');
    expect(mockStyleElement.textContent).toContain('--color-primary: #3b82f6');
    expect(mockStyleElement.textContent).toContain('--color-secondary: #64748b');
  });

  it('updates existing style elements', async () => {
    const mockThemeColors = {
      themeColorsLight: {
        primary: '#ff0000'
      },
      themeColorsDark: {
        primary: '#00ff00'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeColors
    });

    const mockLightStyleElement = {
      id: 'theme-colors-light',
      textContent: ''
    } as unknown as HTMLElement;
    const mockDarkStyleElement = {
      id: 'theme-colors-dark',
      textContent: ''
    } as unknown as HTMLElement;

    vi.mocked(document.getElementById)
      .mockReturnValueOnce(mockLightStyleElement)
      .mockReturnValueOnce(mockDarkStyleElement);

    await themeStore.reloadThemeColors();

    expect(mockLightStyleElement.textContent).toContain('--color-primary: #ff0000');
    expect(mockDarkStyleElement.textContent).toContain('--color-primary: #00ff00');
  });

  it('handles fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: false
    });

    await themeStore.reloadThemeColors();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('handles network errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await themeStore.reloadThemeColors();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to reload theme colors:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('converts camelCase keys to kebab-case CSS variables', async () => {
    const mockThemeColors = {
      themeColorsLight: {
        primaryHover: '#1e3a8a',
        textSecondary: '#64748b',
        bgTertiary: '#f1f5f9'
      },
      themeColorsDark: null
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeColors
    });

    const mockStyleElement = { id: '', textContent: '' } as unknown as HTMLElement;
    vi.mocked(document.getElementById).mockReturnValueOnce(null);
    vi.mocked(document.createElement).mockReturnValueOnce(mockStyleElement);

    await themeStore.reloadThemeColors();

    expect(mockStyleElement.textContent).toContain('--color-primary-hover: #1e3a8a');
    expect(mockStyleElement.textContent).toContain('--color-text-secondary: #64748b');
    expect(mockStyleElement.textContent).toContain('--color-bg-tertiary: #f1f5f9');
  });

  it('applies dark theme styles with correct selector', async () => {
    const mockThemeColors = {
      themeColorsLight: null,
      themeColorsDark: {
        primary: '#60a5fa'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeColors
    });

    const mockStyleElement = { id: '', textContent: '' } as unknown as HTMLElement;
    vi.mocked(document.getElementById).mockReturnValueOnce(null);
    vi.mocked(document.createElement).mockReturnValueOnce(mockStyleElement);

    await themeStore.reloadThemeColors();

    expect(mockStyleElement.id).toBe('theme-colors-dark');
    expect(mockStyleElement.textContent).toContain("html[data-theme='dark']");
    expect(mockStyleElement.textContent).toContain('--color-primary: #60a5fa');
  });
});
