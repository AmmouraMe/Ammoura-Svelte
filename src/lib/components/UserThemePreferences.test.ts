import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import UserThemePreferences from './UserThemePreferences.svelte';

// Mock the stores
vi.mock('$lib/stores/theme', () => ({
  themeStore: {
    subscribe: vi.fn((callback) => {
      callback('system');
      return () => {};
    }),
    setTheme: vi.fn()
  }
}));

vi.mock('$lib/stores/toast', () => ({
  toastStore: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('UserThemePreferences', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    // Default mock - never resolves (stays in loading state)
    mockFetch.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the component title', () => {
    render(UserThemePreferences);
    expect(screen.getByText('Theme Preferences')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(UserThemePreferences);
    expect(
      screen.getByText(
        'Customize your viewing experience. Choose your preferred color scheme and themes.'
      )
    ).toBeInTheDocument();
  });

  it('renders loading state while fetching preferences', () => {
    render(UserThemePreferences);
    expect(screen.getByText('Loading theme preferences...')).toBeInTheDocument();
  });

  it('shows loading spinner during initial load', () => {
    const { container } = render(UserThemePreferences);
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('has the component wrapper class', () => {
    const { container } = render(UserThemePreferences);
    expect(container.querySelector('.theme-preferences')).toBeInTheDocument();
  });
});
