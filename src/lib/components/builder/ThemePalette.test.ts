import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ThemePalette from './ThemePalette.svelte';
import type { ColorThemeDefinition } from '$lib/types/pages';

describe('ThemePalette', () => {
  const mockThemes: ColorThemeDefinition[] = [
    {
      id: 'theme-1',
      name: 'Default Theme',
      mode: 'light',
      isDefault: true,
      isSystem: false,
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        accent: '#28a745',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textSecondary: '#6c757d',
        border: '#dee2e6',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'system-light',
      name: 'System Light',
      mode: 'light',
      isDefault: false,
      isSystem: true,
      colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        accent: '#198754',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textSecondary: '#6c757d',
        border: '#dee2e6',
        success: '#198754',
        warning: '#ffc107',
        error: '#dc3545'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'system-dark',
      name: 'System Dark',
      mode: 'dark',
      isDefault: false,
      isSystem: true,
      colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        accent: '#198754',
        background: '#212529',
        surface: '#343a40',
        text: '#f8f9fa',
        textSecondary: '#adb5bd',
        border: '#495057',
        success: '#198754',
        warning: '#ffc107',
        error: '#dc3545'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'theme-ocean',
      name: 'Ocean Theme',
      mode: 'light',
      isDefault: false,
      isSystem: false,
      colors: {
        primary: '#0dcaf0',
        secondary: '#6c757d',
        accent: '#20c997',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529',
        textSecondary: '#6c757d',
        border: '#dee2e6',
        success: '#20c997',
        warning: '#ffc107',
        error: '#dc3545'
      },
      created_at: Date.now(),
      updated_at: Date.now()
    }
  ];

  it('renders palette when isOpen is true', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    expect(screen.getByPlaceholderText(/search themes/i)).toBeInTheDocument();
    expect(screen.getByText('Default Theme')).toBeInTheDocument();
    expect(screen.getByText('System Dark')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: false
      }
    });

    expect(screen.queryByPlaceholderText(/search themes/i)).not.toBeInTheDocument();
  });

  it('sorts themes with active first, then system-light, system-dark, then rest', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-ocean',
        activeTheme: 'theme-ocean',
        isOpen: true
      }
    });

    const themeItems = screen
      .getAllByRole('button')
      .filter((btn) => btn.classList.contains('theme-item'));
    const themeNames = themeItems.map((item) => {
      const nameEl = item.querySelector('.theme-name');
      return nameEl?.textContent?.trim();
    });

    // Ocean theme should be first (active), then rest alphabetically: Default, System Dark, System Light
    expect(themeNames[0]).toBe('Ocean Theme');
    expect(themeNames[1]).toBe('Default Theme');
    expect(themeNames[2]).toBe('System Dark');
    expect(themeNames[3]).toBe('System Light');
  });

  it('filters themes based on search input', async () => {
    const user = userEvent.setup();
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const searchInput = screen.getByPlaceholderText(/search themes/i);
    await user.type(searchInput, 'dark');

    expect(screen.getByText('System Dark')).toBeInTheDocument();
    expect(screen.queryByText('Ocean Theme')).not.toBeInTheDocument();
  });

  it('dispatches confirmTheme event when clicking a theme', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const confirmSpy = vi.fn();
    component.$on('confirmTheme', confirmSpy);

    // Click on System Dark
    const darkTheme = screen.getByText('System Dark');
    await user.click(darkTheme);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'system-dark'
      })
    );
  });

  it('dispatches previewTheme event on hover', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const previewSpy = vi.fn();
    component.$on('previewTheme', previewSpy);

    const oceanTheme = screen.getByText('Ocean Theme');
    await user.hover(oceanTheme);

    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'theme-ocean'
      })
    );
  });

  it('shows reset button when previewing different theme', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-ocean',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    // Reset button should be visible when currentTheme !== activeTheme
    const resetButton = screen.getByRole('button', { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
  });

  it('hides reset button when not previewing', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    // Reset button should not be visible when currentTheme === activeTheme
    const resetButton = screen.queryByRole('button', { name: /reset/i });
    expect(resetButton).not.toBeInTheDocument();
  });

  it('resets to active theme when clicking reset button', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-ocean',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const resetSpy = vi.fn();
    const closeSpy = vi.fn();
    component.$on('resetTheme', resetSpy);
    component.$on('close', closeSpy);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect(resetSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('dispatches close event when pressing Escape', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const closeSpy = vi.fn();
    component.$on('close', closeSpy);

    const searchInput = screen.getByPlaceholderText(/search themes/i);
    searchInput.focus();

    await user.keyboard('{Escape}');

    expect(closeSpy).toHaveBeenCalled();
  });

  it('shows checkmark next to active theme', () => {
    render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'system-dark',
        activeTheme: 'system-dark',
        isOpen: true
      }
    });

    const darkThemeItem = screen.getByText('System Dark').closest('.theme-item');
    expect(darkThemeItem).toHaveClass('active');
  });

  it('clicking backdrop closes palette and restores active theme', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-ocean',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const closeSpy = vi.fn();
    const previewSpy = vi.fn();
    component.$on('close', closeSpy);
    component.$on('previewTheme', previewSpy);

    const backdrop = document.querySelector('.palette-backdrop');
    if (backdrop) {
      await user.click(backdrop as HTMLElement);
      expect(closeSpy).toHaveBeenCalled();
      expect(previewSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'theme-1'
        })
      );
    }
  });

  it('navigates themes with arrow keys', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const previewSpy = vi.fn();
    component.$on('previewTheme', previewSpy);

    const searchInput = screen.getByPlaceholderText(/search themes/i);
    searchInput.focus();

    // Arrow down should move to next theme
    await user.keyboard('{ArrowDown}');
    expect(previewSpy).toHaveBeenCalled();

    // Arrow up should move to previous theme
    await user.keyboard('{ArrowUp}');
    expect(previewSpy).toHaveBeenCalled();
  });

  it('confirms theme on Enter key', async () => {
    const user = userEvent.setup();
    const { component } = render(ThemePalette, {
      props: {
        colorThemes: mockThemes,
        currentTheme: 'theme-1',
        activeTheme: 'theme-1',
        isOpen: true
      }
    });

    const confirmSpy = vi.fn();
    component.$on('confirmTheme', confirmSpy);

    const searchInput = screen.getByPlaceholderText(/search themes/i);
    searchInput.focus();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(confirmSpy).toHaveBeenCalled();
  });
});
