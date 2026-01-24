import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle.svelte';
import * as themeStoreModule from '$lib/stores/theme';

// Mock the themeStore
vi.mock('$lib/stores/theme', () => {
  const mockStore = {
    subscribe: vi.fn((callback) => {
      callback('light');
      return () => {};
    }),
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    initTheme: vi.fn(),
    cleanup: vi.fn(),
    reloadThemeColors: vi.fn()
  };

  return {
    themeStore: mockStore
  };
});

describe('ThemeToggle (builtin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders toggle button with default configuration', () => {
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with custom button size', () => {
      render(ThemeToggle, { props: { config: { size: 'large' } } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-large');
    });

    it('renders with small size', () => {
      render(ThemeToggle, { props: { config: { size: 'small' } } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-small');
    });

    it('renders with medium size by default', () => {
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-medium');
    });

    it('renders with icon variant by default', () => {
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-icon');
    });

    it('renders with icon-label variant when specified', () => {
      render(ThemeToggle, { props: { config: { toggleVariant: 'icon-label' } } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-icon-label');
    });

    it('renders with button variant when specified', () => {
      render(ThemeToggle, { props: { config: { toggleVariant: 'button' } } });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle-button');
    });

    it('has appropriate aria-label', () => {
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Toggle theme');
    });

    it('applies anchorName as id when provided', () => {
      render(ThemeToggle, { props: { config: { anchorName: 'my-theme-toggle' } } });

      const wrapper = document.getElementById('my-theme-toggle');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls toggleTheme when clicked', async () => {
      const user = userEvent.setup();
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      await user.click(button);

      expect(themeStoreModule.themeStore.toggleTheme).toHaveBeenCalled();
    });

    it('calls toggleTheme on each click', async () => {
      const user = userEvent.setup();
      render(ThemeToggle, { props: { config: {} } });

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);

      expect(themeStoreModule.themeStore.toggleTheme).toHaveBeenCalledTimes(2);
    });
  });

  describe('Icon rendering', () => {
    it('renders sun/moon icon SVG', () => {
      render(ThemeToggle, { props: { config: {} } });

      // Check for SVG element (the icon)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Alignment', () => {
    it('defaults to left alignment', () => {
      render(ThemeToggle, { props: { config: {} } });

      const wrapper = document.querySelector('.theme-toggle-widget');
      expect(wrapper).toHaveStyle({ justifyContent: 'flex-start' });
    });

    it('supports center alignment', () => {
      render(ThemeToggle, { props: { config: { alignment: 'center' } } });

      const wrapper = document.querySelector('.theme-toggle-widget');
      expect(wrapper).toHaveStyle({ justifyContent: 'center' });
    });

    it('supports right alignment', () => {
      render(ThemeToggle, { props: { config: { alignment: 'right' } } });

      const wrapper = document.querySelector('.theme-toggle-widget');
      expect(wrapper).toHaveStyle({ justifyContent: 'flex-end' });
    });
  });
});
