import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db/color-themes', () => ({
  getThemePreference: vi.fn(),
  getAllColorThemes: vi.fn()
}));

vi.mock('$lib/server/db/user-theme-preferences', () => ({
  getUserThemePreferences: vi.fn()
}));

vi.mock('$lib/server/db/connection', () => ({
  getDB: vi.fn((platform: { env: { DB: unknown } }) => platform.env.DB)
}));

// Import after mocking
const { GET } = await import('../src/routes/api/theme-colors/+server');
const colorThemes = await import('$lib/server/db/color-themes');
const userThemePrefs = await import('$lib/server/db/user-theme-preferences');

describe('/api/theme-colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns theme colors successfully', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = { siteId: 'test-site' };

    vi.mocked(colorThemes.getThemePreference)
      .mockResolvedValueOnce('custom-light')
      .mockResolvedValueOnce('custom-dark');

    vi.mocked(colorThemes.getAllColorThemes).mockResolvedValueOnce([
      {
        id: 'custom-light',
        name: 'Custom Light',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#8b5cf6',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        }
      },
      {
        id: 'custom-dark',
        name: 'Custom Dark',
        mode: 'dark',
        isDefault: false,
        isSystem: false,
        colors: {
          primary: '#60a5fa',
          secondary: '#94a3b8',
          accent: '#a78bfa',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171'
        }
      }
    ]);

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(response.status).toBe(200);
    expect(data.themeColorsLight).toEqual({
      primary: '#3b82f6',
      primaryHover: '#3b82f6',
      primaryLight: '#8b5cf6',
      secondary: '#64748b',
      secondaryHover: '#64748b',
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f8fafc',
      textPrimary: '#1e293b',
      textSecondary: '#64748b',
      borderPrimary: '#e2e8f0',
      borderSecondary: '#e2e8f0'
    });
    expect(data.themeColorsDark).toEqual({
      primary: '#60a5fa',
      primaryHover: '#60a5fa',
      primaryLight: '#a78bfa',
      secondary: '#94a3b8',
      secondaryHover: '#94a3b8',
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#1e293b',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      borderPrimary: '#334155',
      borderSecondary: '#334155'
    });
  });

  it('returns null when platform is not available', async () => {
    const response = await GET({
      platform: null,
      locals: {}
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(data.themeColorsLight).toBeNull();
    expect(data.themeColorsDark).toBeNull();
  });

  it('falls back to default themes when preferences are not set', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = { siteId: 'test-site' };

    vi.mocked(colorThemes.getThemePreference)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    vi.mocked(colorThemes.getAllColorThemes).mockResolvedValueOnce([
      {
        id: 'vibrant',
        name: 'Vibrant Pink',
        mode: 'light',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#fdf2f8',
          surface: '#fae8ff',
          text: '#1e1b4b',
          textSecondary: '#6b21a8',
          border: '#f5d0fe',
          success: '#22c55e',
          warning: '#fb923c',
          error: '#f43f5e'
        }
      },
      {
        id: 'midnight',
        name: 'Midnight Purple',
        mode: 'dark',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#a78bfa',
          secondary: '#94a3b8',
          accent: '#c084fc',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171'
        }
      }
    ]);

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(data.themeColorsLight).not.toBeNull();
    expect(data.themeColorsDark).not.toBeNull();
  });

  it('handles database errors gracefully', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = { siteId: 'test-site' };

    vi.mocked(colorThemes.getThemePreference).mockRejectedValueOnce(new Error('DB error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(response.status).toBe(500);
    expect(data.themeColorsLight).toBeNull();
    expect(data.themeColorsDark).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading theme colors:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('uses user theme preferences when user is authenticated', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = {
      siteId: 'test-site',
      currentUser: { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'customer' }
    };

    // Site defaults
    vi.mocked(colorThemes.getThemePreference)
      .mockResolvedValueOnce('vibrant')
      .mockResolvedValueOnce('midnight');

    // User prefers 'navy' for light and 'dark-ocean' for dark
    vi.mocked(userThemePrefs.getUserThemePreferences).mockResolvedValueOnce({
      user_id: 'user-1',
      site_id: 'test-site',
      color_scheme: 'system',
      light_theme_id: 'navy',
      dark_theme_id: 'dark-ocean',
      created_at: 0,
      updated_at: 0
    });

    vi.mocked(colorThemes.getAllColorThemes).mockResolvedValueOnce([
      {
        id: 'vibrant',
        name: 'Vibrant Pink',
        mode: 'light',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#fdf2f8',
          surface: '#fae8ff',
          text: '#1e1b4b',
          textSecondary: '#6b21a8',
          border: '#f5d0fe',
          success: '#22c55e',
          warning: '#fb923c',
          error: '#f43f5e'
        }
      },
      {
        id: 'navy',
        name: 'Professional Navy',
        mode: 'light',
        isDefault: false,
        isSystem: false,
        colors: {
          primary: '#1e40af',
          secondary: '#334155',
          accent: '#3b82f6',
          background: '#f8fafc',
          surface: '#e2e8f0',
          text: '#0f172a',
          textSecondary: '#475569',
          border: '#cbd5e1',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626'
        }
      },
      {
        id: 'midnight',
        name: 'Midnight Purple',
        mode: 'dark',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#a78bfa',
          secondary: '#94a3b8',
          accent: '#c084fc',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171'
        }
      },
      {
        id: 'dark-ocean',
        name: 'Dark Ocean',
        mode: 'dark',
        isDefault: false,
        isSystem: false,
        colors: {
          primary: '#06b6d4',
          secondary: '#64748b',
          accent: '#22d3ee',
          background: '#020617',
          surface: '#0f172a',
          text: '#e2e8f0',
          textSecondary: '#94a3b8',
          border: '#1e293b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        }
      }
    ]);

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(response.status).toBe(200);
    // Should use user's navy theme, not site default vibrant
    expect(data.themeColorsLight?.primary).toBe('#1e40af');
    // Should use user's dark-ocean theme, not site default midnight
    expect(data.themeColorsDark?.primary).toBe('#06b6d4');
  });

  it('falls back to site defaults when user has no theme preferences', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = {
      siteId: 'test-site',
      currentUser: { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'customer' }
    };

    vi.mocked(colorThemes.getThemePreference)
      .mockResolvedValueOnce('vibrant')
      .mockResolvedValueOnce('midnight');

    // User has no preferences (null theme IDs)
    vi.mocked(userThemePrefs.getUserThemePreferences).mockResolvedValueOnce({
      user_id: 'user-1',
      site_id: 'test-site',
      color_scheme: 'system',
      light_theme_id: null,
      dark_theme_id: null,
      created_at: 0,
      updated_at: 0
    });

    vi.mocked(colorThemes.getAllColorThemes).mockResolvedValueOnce([
      {
        id: 'vibrant',
        name: 'Vibrant Pink',
        mode: 'light',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#fdf2f8',
          surface: '#fae8ff',
          text: '#1e1b4b',
          textSecondary: '#6b21a8',
          border: '#f5d0fe',
          success: '#22c55e',
          warning: '#fb923c',
          error: '#f43f5e'
        }
      },
      {
        id: 'midnight',
        name: 'Midnight Purple',
        mode: 'dark',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#a78bfa',
          secondary: '#94a3b8',
          accent: '#c084fc',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171'
        }
      }
    ]);

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(response.status).toBe(200);
    // Should fall back to site default vibrant
    expect(data.themeColorsLight?.primary).toBe('#ec4899');
    // Should fall back to site default midnight
    expect(data.themeColorsDark?.primary).toBe('#a78bfa');
  });

  it('does not query user preferences when no user is authenticated', async () => {
    const mockDB = {};
    const mockPlatform = { env: { DB: mockDB } };
    const mockLocals = { siteId: 'test-site' };

    vi.mocked(colorThemes.getThemePreference)
      .mockResolvedValueOnce('vibrant')
      .mockResolvedValueOnce('midnight');

    vi.mocked(colorThemes.getAllColorThemes).mockResolvedValueOnce([
      {
        id: 'vibrant',
        name: 'Vibrant Pink',
        mode: 'light',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#fdf2f8',
          surface: '#fae8ff',
          text: '#1e1b4b',
          textSecondary: '#6b21a8',
          border: '#f5d0fe',
          success: '#22c55e',
          warning: '#fb923c',
          error: '#f43f5e'
        }
      },
      {
        id: 'midnight',
        name: 'Midnight Purple',
        mode: 'dark',
        isDefault: true,
        isSystem: false,
        colors: {
          primary: '#a78bfa',
          secondary: '#94a3b8',
          accent: '#c084fc',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171'
        }
      }
    ]);

    const response = await GET({
      platform: mockPlatform,
      locals: mockLocals
    } as never);

    const data = (await response.json()) as {
      themeColorsLight: Record<string, string> | null;
      themeColorsDark: Record<string, string> | null;
    };

    expect(response.status).toBe(200);
    // getUserThemePreferences should not have been called
    expect(userThemePrefs.getUserThemePreferences).not.toHaveBeenCalled();
    // Should use site defaults
    expect(data.themeColorsLight?.primary).toBe('#ec4899');
  });
});
