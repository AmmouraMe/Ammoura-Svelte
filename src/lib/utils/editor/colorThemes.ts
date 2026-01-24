import type { ColorTheme, ThemeColors, ColorThemeDefinition } from '$lib/types/pages';

/**
 * System default themes (light and dark) - fallback themes used in code
 * Note: IDs must match database theme IDs for consistent rendering
 */
export const SYSTEM_THEMES: ColorThemeDefinition[] = [
  {
    id: 'vibrant', // Matches database theme ID
    name: 'Vibrant Pink',
    mode: 'light',
    isDefault: true,
    isSystem: true,
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
    id: 'midnight', // Matches database theme ID
    name: 'Midnight Purple',
    mode: 'dark',
    isDefault: true,
    isSystem: true,
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
    id: 'minimal',
    name: 'Minimal Light',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#000000',
      secondary: '#6b7280',
      accent: '#111827',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626'
    }
  },
  {
    id: 'professional',
    name: 'Professional Navy',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#1e40af',
      secondary: '#475569',
      accent: '#0891b2',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a',
      textSecondary: '#475569',
      border: '#cbd5e1',
      success: '#059669',
      warning: '#ea580c',
      error: '#dc2626'
    }
  },
  {
    id: 'warm',
    name: 'Warm Orange',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#ea580c',
      secondary: '#92400e',
      accent: '#f59e0b',
      background: '#fffbeb',
      surface: '#fef3c7',
      text: '#78350f',
      textSecondary: '#92400e',
      border: '#fde68a',
      success: '#84cc16',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'cool',
    name: 'Cool Cyan',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#0891b2',
      secondary: '#0369a1',
      accent: '#06b6d4',
      background: '#ecfeff',
      surface: '#cffafe',
      text: '#164e63',
      textSecondary: '#0e7490',
      border: '#a5f3fc',
      success: '#14b8a6',
      warning: '#0ea5e9',
      error: '#6366f1'
    }
  },
  {
    id: 'nature',
    name: 'Nature Green',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#16a34a',
      secondary: '#65a30d',
      accent: '#84cc16',
      background: '#f7fee7',
      surface: '#ecfccb',
      text: '#365314',
      textSecondary: '#4d7c0f',
      border: '#d9f99d',
      success: '#22c55e',
      warning: '#eab308',
      error: '#dc2626'
    }
  },
  {
    id: 'monochrome',
    name: 'Monochrome Gray',
    mode: 'light',
    isDefault: false,
    isSystem: true,
    colors: {
      primary: '#404040',
      secondary: '#737373',
      accent: '#525252',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#171717',
      textSecondary: '#737373',
      border: '#e5e5e5',
      success: '#404040',
      warning: '#737373',
      error: '#262626'
    }
  }
];

// In-memory storage for custom themes (in production, this would be in a database)
let customThemes: ColorThemeDefinition[] = [];

// Storage keys for theme preferences
const SYSTEM_LIGHT_THEME_KEY = 'system-light-theme';
const SYSTEM_DARK_THEME_KEY = 'system-dark-theme';
const CURRENTLY_VIEWING_THEME_KEY = 'currently-viewing-theme';
const THEME_ORDER_KEY = 'theme-order';

// Browser check
const isBrowser = typeof window !== 'undefined';

/**
 * Get the system default theme ID for a specific mode
 * These are used when user selects system theme or hasn't chosen a preference
 */
export function getSystemTheme(mode: 'light' | 'dark'): string {
  if (!isBrowser) return mode === 'light' ? 'vibrant' : 'midnight';

  try {
    const key = mode === 'light' ? SYSTEM_LIGHT_THEME_KEY : SYSTEM_DARK_THEME_KEY;
    const stored = localStorage.getItem(key);
    return stored || (mode === 'light' ? 'vibrant' : 'midnight');
  } catch {
    return mode === 'light' ? 'vibrant' : 'midnight';
  }
}

/**
 * Get the active theme ID for a specific mode (backwards compatibility)
 * @deprecated Use getSystemTheme instead
 */
export function getActiveTheme(mode: 'light' | 'dark'): string {
  return getSystemTheme(mode);
}

/**
 * Set the system default theme for a specific mode
 */
export function setSystemTheme(themeId: string, mode: 'light' | 'dark'): boolean {
  if (!isBrowser) return false;

  const theme = getThemeById(themeId);
  if (!theme || theme.mode !== mode) return false;

  try {
    const key = mode === 'light' ? SYSTEM_LIGHT_THEME_KEY : SYSTEM_DARK_THEME_KEY;
    localStorage.setItem(key, themeId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set the active theme for a specific mode (backwards compatibility)
 * @deprecated Use setSystemTheme instead
 */
export function setActiveTheme(themeId: string, mode: 'light' | 'dark'): boolean {
  return setSystemTheme(themeId, mode);
}

/**
 * Get the currently viewing theme for admin preview
 */
export function getCurrentlyViewingTheme(): string | null {
  if (!isBrowser) return null;

  try {
    return localStorage.getItem(CURRENTLY_VIEWING_THEME_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the currently viewing theme for admin preview
 */
export function setCurrentlyViewingTheme(themeId: string | null): void {
  if (!isBrowser) return;

  try {
    if (themeId === null) {
      localStorage.removeItem(CURRENTLY_VIEWING_THEME_KEY);
    } else {
      localStorage.setItem(CURRENTLY_VIEWING_THEME_KEY, themeId);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get saved theme order
 */
function getThemeOrder(): string[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(THEME_ORDER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save theme order
 */
export function saveThemeOrder(order: string[]): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(THEME_ORDER_KEY, JSON.stringify(order));
  } catch (error) {
    console.error('Failed to save theme order:', error);
  }
}

/**
 * Get all themes (system + custom) in saved order
 */
export function getAllThemes(): ColorThemeDefinition[] {
  const allThemes = [...SYSTEM_THEMES, ...customThemes];
  const savedOrder = getThemeOrder();

  if (savedOrder.length === 0) return allThemes;

  // Sort by saved order, with unordered themes at the end
  const ordered = savedOrder
    .map((id) => allThemes.find((t) => t.id === id))
    .filter((t): t is ColorThemeDefinition => t !== undefined);

  const unordered = allThemes.filter((t) => !savedOrder.includes(t.id));

  return [...ordered, ...unordered];
}

/**
 * Get theme by ID
 */
export function getThemeById(id: string): ColorThemeDefinition | undefined {
  return getAllThemes().find((t) => t.id === id);
}

/**
 * Get theme colors for a specific theme
 */
export function getThemeColors(themeId: ColorTheme = 'vibrant'): ThemeColors {
  const theme = getThemeById(themeId);
  if (theme) {
    return theme.colors;
  }
  // Fallback to default light
  return SYSTEM_THEMES[0].colors;
}

/**
 * Apply theme colors with optional overrides
 */
export function applyThemeColors(
  themeId: ColorTheme,
  overrides?: Partial<ThemeColors>
): ThemeColors {
  const baseColors = getThemeColors(themeId);
  return {
    ...baseColors,
    ...overrides
  };
}

/**
 * Generate CSS custom properties from theme colors
 */
export function generateThemeStyles(colors: ThemeColors): string {
  return `
    --theme-primary: ${colors.primary};
    --theme-secondary: ${colors.secondary};
    --theme-accent: ${colors.accent};
    --theme-background: ${colors.background};
    --theme-surface: ${colors.surface};
    --theme-text: ${colors.text};
    --theme-text-secondary: ${colors.textSecondary};
    --theme-border: ${colors.border};
    --theme-success: ${colors.success};
    --theme-warning: ${colors.warning};
    --theme-error: ${colors.error};
  `.trim();
}

/**
 * Get all available themes for dropdown
 */
export function getAvailableThemes(): Array<{
  value: ColorTheme;
  label: string;
  mode: string;
}> {
  return getAllThemes().map((theme) => ({
    value: theme.id,
    label: theme.name,
    mode: theme.mode
  }));
}

/**
 * Get default theme for a specific mode
 */
export function getDefaultTheme(mode: 'light' | 'dark'): ColorThemeDefinition {
  const defaultTheme = SYSTEM_THEMES.find((t) => t.isDefault && t.mode === mode);
  return defaultTheme || SYSTEM_THEMES[0];
}

/**
 * Add or update a custom theme
 */
export function saveCustomTheme(theme: ColorThemeDefinition): void {
  const index = customThemes.findIndex((t) => t.id === theme.id);
  if (index >= 0) {
    customThemes[index] = { ...theme, updated_at: Date.now() };
  } else {
    customThemes.push({ ...theme, created_at: Date.now(), updated_at: Date.now() });
  }
}

/**
 * Delete a custom theme
 */
export function deleteCustomTheme(id: string): boolean {
  const theme = getThemeById(id);
  if (theme && !theme.isSystem) {
    customThemes = customThemes.filter((t) => t.id !== id);
    return true;
  }
  return false;
}

/**
 * Set default theme for a mode
 */
export function setDefaultTheme(id: string, mode: 'light' | 'dark'): boolean {
  const theme = getThemeById(id);
  if (!theme || theme.mode !== mode) return false;

  // Remove default from other themes of same mode
  customThemes = customThemes.map((t) => ({
    ...t,
    isDefault: t.id === id && t.mode === mode ? true : t.mode === mode ? false : t.isDefault
  }));

  return true;
}

/**
 * Convert a theme reference (e.g., "theme:primary") to a CSS variable (e.g., "var(--theme-primary)")
 * or a color reference (e.g., "color:primary-light") to a CSS variable (e.g., "var(--color-primary-light)")
 */
export function themeRefToCssVar(value: string | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Handle theme: references
  if (value.startsWith('theme:')) {
    const colorKey = value.replace('theme:', '');
    const cssVarName = colorKey === 'textSecondary' ? 'text-secondary' : colorKey;
    return `var(--theme-${cssVarName})`;
  }

  // Handle color: references (maps to the app's color system)
  if (value.startsWith('color:')) {
    const colorKey = value.replace('color:', '');
    return `var(--color-${colorKey})`;
  }

  return null;
}

/**
 * Resolve a theme-specific color value for the current theme
 * If the value is a string, return it as-is (or convert theme: references to CSS vars)
 * If it's an object with theme keys, return the color for the current theme or the default theme
 */
export function resolveThemeColor(
  colorValue: string | { [themeId: string]: string } | undefined,
  currentTheme: ColorTheme,
  fallbackColor?: string,
  asCssVar = false
): string {
  if (!colorValue) {
    // Also convert fallback color if it's a theme/color reference
    if (fallbackColor && asCssVar) {
      const cssVar = themeRefToCssVar(fallbackColor);
      if (cssVar) return cssVar;
    }
    return fallbackColor || '';
  }

  // If it's a simple string
  if (typeof colorValue === 'string') {
    // Check if it's a theme or color reference
    if (asCssVar || colorValue.startsWith('theme:') || colorValue.startsWith('color:')) {
      const cssVar = themeRefToCssVar(colorValue);
      if (cssVar) return cssVar;
    }
    return colorValue;
  }

  // If it's an object with theme-specific colors
  if (typeof colorValue === 'object') {
    // Try to get the color for the current theme
    if (colorValue[currentTheme]) {
      const color = colorValue[currentTheme];
      if (asCssVar) {
        const cssVar = themeRefToCssVar(color);
        if (cssVar) return cssVar;
      }
      return color;
    }

    // Try to get a color for the same mode (light/dark)
    const currentThemeData = getThemeById(currentTheme);
    if (currentThemeData) {
      const defaultThemeForMode = getDefaultTheme(currentThemeData.mode);
      if (defaultThemeForMode && colorValue[defaultThemeForMode.id]) {
        const color = colorValue[defaultThemeForMode.id];
        if (asCssVar) {
          const cssVar = themeRefToCssVar(color);
          if (cssVar) return cssVar;
        }
        return color;
      }
    }

    // Return any available color or fallback
    const firstAvailableColor = Object.values(colorValue)[0];
    if (asCssVar && firstAvailableColor) {
      const cssVar = themeRefToCssVar(firstAvailableColor);
      if (cssVar) return cssVar;
    }
    return firstAvailableColor || fallbackColor || '';
  }

  return fallbackColor || '';
}
