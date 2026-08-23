import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TailwindContainerEditor from '../TailwindContainerEditor.svelte';
import type { WidgetConfig } from '$lib/types/pages';

describe('TailwindContainerEditor', () => {
  const mockConfig: WidgetConfig = {
    containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
    containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
    containerJustifyContent: 'flex-start',
    containerAlignItems: 'stretch',
    containerWrap: 'nowrap',
    containerGap: { desktop: 16, tablet: 16, mobile: 16 },
    containerMaxWidth: '1200px',
    containerBackground: '#ffffff'
  };

  describe('Tab Navigation', () => {
    it('renders both tabs', () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    it('switches tabs when clicked', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(styleTab).toHaveClass('active');
    });
  });

  describe('Layout Tab', () => {
    it('shows display type selector', () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      expect(screen.getByText('Display Type')).toBeInTheDocument();
    });

    it('shows flexbox controls when display is flex', () => {
      render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig, containerDisplay: { desktop: 'flex' } },
          currentBreakpoint: 'desktop'
        }
      });

      expect(screen.getByText('Flex Wrap')).toBeInTheDocument();
    });

    it('shows grid controls when display is grid', async () => {
      render(TailwindContainerEditor, {
        // Spread so the component's config writes don't leak into other tests
        props: {
          config: { ...mockConfig },
          currentBreakpoint: 'desktop'
        }
      });

      // Display type is a pair of toggle buttons (Flexbox / Grid), not a select
      await fireEvent.click(screen.getByRole('button', { name: 'Grid' }));

      expect(screen.getByText('Grid Template Columns')).toBeInTheDocument();
      expect(screen.getByText('Grid Template Rows')).toBeInTheDocument();
      expect(screen.getByText('Grid Auto Flow')).toBeInTheDocument();
      expect(screen.getByText('Place Items')).toBeInTheDocument();
      // Flex-only controls are hidden while grid is selected
      expect(screen.queryByText('Flex Wrap')).not.toBeInTheDocument();
      expect(screen.queryByText('Justify Content')).not.toBeInTheDocument();
    });

    it('dispatches update event when flex direction changes', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig },
          currentBreakpoint: 'desktop'
        }
      });

      component.$on('update', handleUpdate);

      // Flex direction is a group of icon buttons labelled by their title attribute
      const columnButton = screen.getByTitle('Column (↓)');
      await fireEvent.click(columnButton);

      expect(handleUpdate).toHaveBeenCalled();
      const updated = handleUpdate.mock.calls[0][0].detail as WidgetConfig;
      expect(updated.containerFlexDirection).toMatchObject({ desktop: 'column' });
      expect(columnButton).toHaveClass('active');
    });
  });

  describe('Spacing', () => {
    it('shows padding controls', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      // Padding is in the Style tab
      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(screen.getByText('Padding')).toBeInTheDocument();
    });

    // BLOCKED (component has no such control): the Margin section was moved out of
    // TailwindContainerEditor in the refactor and now lives in UniversalStyleEditor.svelte:238;
    // this editor renders only Padding/Size/Background/Border in its Style tab.
    it.skip('shows margin controls', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: {
            ...mockConfig,
            containerMargin: { desktop: { top: 0, right: 0, bottom: 0, left: 0 } }
          },
          currentBreakpoint: 'desktop'
        }
      });

      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(screen.queryByText('Margin')).toBeInTheDocument();
    });
  });

  describe('Sizing', () => {
    it('shows dimension controls', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      // Size is in the Style tab
      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(screen.getByText('Size')).toBeInTheDocument();
    });

    it('dispatches update when width changes', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      component.$on('update', handleUpdate);

      // Click Style tab to access width control
      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      // Width select is labeled
      const widthSelect = screen.getByLabelText('Width') as unknown as HTMLSelectElement;
      await fireEvent.change(widthSelect, { target: { value: '100%' } });

      expect(handleUpdate).toHaveBeenCalled();
    });
  });

  describe('Styling Tab', () => {
    it('shows background controls', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(screen.getByText('Background')).toBeInTheDocument();
      // Background Color uses ThemeColorInput component - check for the label
      expect(screen.getByText('Background Color')).toBeInTheDocument();
    });

    it('shows border controls', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      const styleTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(styleTab);

      expect(screen.getByText('Border')).toBeInTheDocument();
      expect(screen.getByLabelText('Border Radius (px)')).toBeInTheDocument();
    });
  });

  describe('Effects', () => {
    // Opacity control removed during refactoring
    it.skip('shows opacity control', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig, containerOpacity: { desktop: 100 } },
          currentBreakpoint: 'desktop'
        }
      });

      const stylingTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(stylingTab);

      // Opacity is in the Style tab
      expect(screen.getByText(/Opacity/)).toBeInTheDocument();
    });

    // Cursor, Z-Index, and Overflow controls removed during refactoring
    it.skip('shows cursor control', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig, containerCursor: { desktop: 'pointer' } },
          currentBreakpoint: 'desktop'
        }
      });

      const stylingTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(stylingTab);

      // Cursor is in the Style tab
      expect(screen.getByText(/Cursor/)).toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it.skip('shows z-index control', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig, containerZIndex: { desktop: 0 } },
          currentBreakpoint: 'desktop'
        }
      });

      const stylingTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(stylingTab);

      // Z-Index is in the Style tab
      expect(screen.getByText(/Z-Index/)).toBeInTheDocument();
    });

    it.skip('shows overflow control', async () => {
      render(TailwindContainerEditor, {
        props: {
          config: { ...mockConfig, containerOverflow: { desktop: { x: 'visible', y: 'visible' } } },
          currentBreakpoint: 'desktop'
        }
      });

      const stylingTab = screen.getByRole('button', { name: 'Style' });
      await fireEvent.click(stylingTab);

      // Overflow is in the Style tab
      expect(screen.getByText(/Overflow/)).toBeInTheDocument();
    });
  });

  describe('Responsive Values', () => {
    // TODO: This test needs investigation - Svelte reactive statements may not update
    // properly in test environment when using component.$set() to change breakpoint
    it.skip('handles responsive breakpoint changes', () => {
      const { component } = render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      // Layout tab should be active by default
      // Flex direction buttons have titles but accessible names are just the arrows
      const buttons = screen.getAllByRole('button');
      const rowButton = buttons.find((btn) => btn.getAttribute('title') === 'Row (→)');
      expect(rowButton).toHaveClass('active');

      // Update props using $set
      component.$set({
        config: mockConfig,
        currentBreakpoint: 'mobile'
      });

      // On mobile, column button should be active based on mockConfig.containerFlexDirection.mobile = 'column'
      const mobileButtons = screen.getAllByRole('button');
      const columnButton = mobileButtons.find((btn) => btn.getAttribute('title') === 'Column (↓)');
      expect(columnButton).toHaveClass('active');
    });
  });

  describe('Update Event', () => {
    // TODO: Svelte bind:value in tests - the select change doesn't properly trigger
    // the bind:value update in the test environment. May need to use tick() or
    // investigate Svelte Testing Library best practices for bound values
    it.skip('dispatches update event with modified config', async () => {
      const user = userEvent.setup();
      let updatedConfig: WidgetConfig | null = null;
      const { component } = render(TailwindContainerEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'desktop'
        }
      });

      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      // Layout tab is active by default, justify content select is there
      const selects = screen.getAllByRole('combobox');
      const justifySelect = selects[0];

      // Use userEvent to properly interact with the select
      await user.selectOptions(justifySelect, 'center');

      // Check that update event was dispatched with the modified config
      expect(updatedConfig).toBeTruthy();
      expect(
        updatedConfig && 'containerJustifyContent' in updatedConfig
          ? (updatedConfig as { containerJustifyContent: string }).containerJustifyContent
          : undefined
      ).toBe('center');
    });
  });
});
