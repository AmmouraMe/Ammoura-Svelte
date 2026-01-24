import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TailwindGridEditor from '../TailwindGridEditor.svelte';
import type { WidgetConfig } from '$lib/types/pages';

describe('TailwindGridEditor', () => {
  const defaultConfig: WidgetConfig = {
    useGrid: true,
    gridColumns: { desktop: 3, tablet: 2, mobile: 1 },
    gridRows: { desktop: 'auto' },
    gridAutoFlow: { desktop: 'row' },
    gridColumnGap: { desktop: 16, tablet: 12, mobile: 8 },
    gridRowGap: { desktop: 16, tablet: 12, mobile: 8 }
  };

  describe('Rendering', () => {
    it('renders grid editor with all sections', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText('Quick Presets')).toBeInTheDocument();
      expect(screen.getByText('Grid Template Columns')).toBeInTheDocument();
      expect(screen.getByText('Grid Auto Flow')).toBeInTheDocument();
      expect(screen.getByText('Gap')).toBeInTheDocument();
    });

    it('displays breakpoint indicator', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'tablet' }
      });

      expect(screen.getByText('Editing: tablet')).toBeInTheDocument();
    });
  });

  describe('Grid Template Columns', () => {
    it('displays count mode by default', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText('3 columns')).toBeInTheDocument();
    });

    it('displays template mode for string values', () => {
      const templateConfig: WidgetConfig = {
        ...defaultConfig,
        gridColumns: { desktop: '1fr 2fr 1fr' }
      };

      render(TailwindGridEditor, {
        props: { config: templateConfig, currentBreakpoint: 'desktop' }
      });

      const input = screen.getByPlaceholderText(/e.g., 1fr 2fr 1fr/);
      expect(input).toHaveValue('1fr 2fr 1fr');
    });

    it('toggles between count and template modes', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
        // Simulate parent updating props by setting the config
        component.$set({ config: event.detail });
      });

      const templateButton = screen.getByRole('button', { name: 'Template' });
      await user.click(templateButton);

      // Wait for the DOM to update
      const input = await screen.findByPlaceholderText(/e.g., 1fr 2fr 1fr/);
      expect(input).toBeInTheDocument();
      expect(updatedConfig).toBeTruthy();
    });

    it('updates grid columns when slider changed', async () => {
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const sliders = screen.getAllByRole('slider');
      const columnSlider = sliders[0] as HTMLInputElement; // First slider is for columns

      // Simulate slider input
      columnSlider.value = '4';
      columnSlider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(updatedConfig).toBeTruthy();
    });
  });

  describe('Grid Auto Flow', () => {
    it('displays current grid auto flow', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      const selects = screen.getAllByRole('combobox');
      const select = selects[0]; // First select is Grid Auto Flow
      expect(select).toHaveValue('row');
    });

    it('updates grid auto flow when changed', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, 'column');

      expect(updatedConfig).toBeTruthy();
      if (updatedConfig && 'gridAutoFlow' in updatedConfig) {
        expect((updatedConfig as Record<string, unknown>).gridAutoFlow).toEqual({
          desktop: 'column'
        });
      }
    });
  });

  describe('Gap Controls', () => {
    it('displays column and row gap sliders', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText(/Column Gap \(16px\)/)).toBeInTheDocument();
      expect(screen.getByText(/Row Gap \(16px\)/)).toBeInTheDocument();
    });

    it('updates column gap when slider changed', async () => {
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const columnGapSlider = screen.getByLabelText(/Column Gap/i) as HTMLInputElement;

      // Simulate slider input
      columnGapSlider.value = '20';
      columnGapSlider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(updatedConfig).toBeTruthy();
    });
  });

  describe('Justify and Align Items', () => {
    it('renders visual buttons for justify items', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      const justifySection = screen.getByText('Justify Items (Horizontal)');
      expect(justifySection).toBeInTheDocument();
    });

    it('renders visual buttons for align items', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      const alignSection = screen.getByText('Align Items (Vertical)');
      expect(alignSection).toBeInTheDocument();
    });
  });

  describe('Presets', () => {
    it('renders all grid preset buttons', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText('2 Columns')).toBeInTheDocument();
      expect(screen.getByText('3 Columns')).toBeInTheDocument();
      expect(screen.getByText('4 Columns')).toBeInTheDocument();
      expect(screen.getByText('Sidebar Left')).toBeInTheDocument();
      expect(screen.getByText('Sidebar Right')).toBeInTheDocument();
      expect(screen.getByText('Holy Grail')).toBeInTheDocument();
    });

    it('applies preset configuration when clicked', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const fourColButton = screen.getByRole('button', { name: '▯▯▯▯ 4 Columns' });
      await user.click(fourColButton);

      expect(updatedConfig).toBeTruthy();
      if (updatedConfig && 'gridColumns' in updatedConfig) {
        expect((updatedConfig as unknown as Record<string, unknown>).gridColumns).toEqual({
          desktop: 4,
          tablet: 2,
          mobile: 1
        });
      }
    });

    it('applies template preset correctly', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const sidebarButton = screen.getByRole('button', { name: '▮▯▯ Sidebar Left' });
      await user.click(sidebarButton);

      expect(updatedConfig).toBeTruthy();
      if (updatedConfig && 'gridColumns' in updatedConfig) {
        expect((updatedConfig as unknown as Record<string, unknown>).gridColumns).toEqual({
          desktop: '200px 1fr 1fr',
          tablet: '1fr',
          mobile: '1fr'
        });
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('shows correct values for mobile breakpoint', () => {
      render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'mobile' }
      });

      expect(screen.getByText('1 columns')).toBeInTheDocument();
    });

    it('updates only current breakpoint when changed', async () => {
      const { component } = render(TailwindGridEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'tablet' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const sliders = screen.getAllByRole('slider');
      const columnSlider = sliders[0] as HTMLInputElement;

      // Simulate slider input to change tablet from 2 to 3
      columnSlider.value = '3';
      columnSlider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(updatedConfig).toBeTruthy();
      if (updatedConfig && 'gridColumns' in updatedConfig) {
        const configRecord = updatedConfig as unknown as Record<string, unknown>;
        const gridColumns = configRecord.gridColumns as Record<string, unknown>;
        if (gridColumns && typeof gridColumns === 'object') {
          expect(gridColumns.desktop).toBe(3);
          expect(gridColumns.tablet).toBe(3);
          expect(gridColumns.mobile).toBe(1);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined config values with defaults', () => {
      render(TailwindGridEditor, {
        props: { config: {}, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText('3 columns')).toBeInTheDocument();
    });

    it('handles auto row values', () => {
      const autoConfig: WidgetConfig = {
        ...defaultConfig,
        gridRows: { desktop: 'auto' }
      };

      render(TailwindGridEditor, {
        props: { config: autoConfig, currentBreakpoint: 'desktop' }
      });

      const input = screen.getByPlaceholderText(/auto or repeat/);
      expect(input).toHaveValue('auto');
    });
  });
});
