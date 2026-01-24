import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TailwindFlexEditor from '../TailwindFlexEditor.svelte';
import type { WidgetConfig } from '$lib/types/pages';

describe('TailwindFlexEditor', () => {
  const defaultConfig: WidgetConfig = {
    flexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
    flexWrap: { desktop: 'wrap' },
    flexJustifyContent: { desktop: 'flex-start' },
    flexAlignItems: { desktop: 'stretch' },
    flexGap: { desktop: 16, tablet: 12, mobile: 8 }
  };

  describe('Rendering', () => {
    it('renders flex editor with all sections', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText('Quick Presets')).toBeInTheDocument();
      expect(screen.getByText('Flex Direction')).toBeInTheDocument();
      expect(screen.getByText('Flex Wrap')).toBeInTheDocument();
      expect(screen.getByText('Justify Content (Main Axis)')).toBeInTheDocument();
      expect(screen.getByText('Align Items (Cross Axis)')).toBeInTheDocument();
      expect(screen.getByText('Gap')).toBeInTheDocument();
    });

    it('displays breakpoint indicator', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'mobile' }
      });

      expect(screen.getByText('Editing: mobile')).toBeInTheDocument();
    });
  });

  describe('Flex Direction Control', () => {
    it('displays current flex direction', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      // Select has no accessible name, use getAllByRole
      const select = screen.getAllByRole('combobox')[0];
      expect(select).toHaveValue('row');
    });

    it('updates flex direction when changed', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, 'column');

      expect(updatedConfig).toBeTruthy();
      // Only desktop is updated since that's the current breakpoint
      expect(
        updatedConfig && 'flexDirection' in updatedConfig
          ? (updatedConfig as unknown as Record<string, unknown>).flexDirection
          : undefined
      ).toEqual({
        desktop: 'column',
        tablet: 'row',
        mobile: 'column'
      });
    });
  });

  describe('Justify Content Visual Controls', () => {
    it('renders visual buttons for justify content options', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      // Multiple 'start', 'center', 'end' exist (justify + align)
      // Just check they exist using getAllByText
      expect(screen.getAllByText('start').length).toBeGreaterThan(0);
      expect(screen.getAllByText('center').length).toBeGreaterThan(0);
      expect(screen.getAllByText('end').length).toBeGreaterThan(0);
      expect(screen.getByText('space between')).toBeInTheDocument();
    });

    it('marks active justify content option', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      // Both justify and align have 'start' buttons, find first with 'justify-' class
      const buttons = screen.getAllByRole('button');
      const justifyStartButton = buttons.find(
        (btn) =>
          btn.textContent?.includes('start') &&
          btn.querySelector('.visual-preview.justify-flex-start')
      );
      expect(justifyStartButton).toHaveClass('active');
    });
  });

  describe('Gap Controls', () => {
    it('displays gap slider with current value', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      expect(screen.getByText(/All \(16px\)/)).toBeInTheDocument();
    });

    it('updates gap when slider changed', async () => {
      const { component } = render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const slider = screen.getAllByRole('slider')[0] as HTMLInputElement;

      // Simulate slider input
      slider.value = '20';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(updatedConfig).toBeTruthy();
    });
  });

  describe('Presets', () => {
    it('renders all preset buttons', () => {
      render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      // Use getByRole to avoid duplicate text issues (buttons have both name spans and option elements)
      expect(screen.getByRole('button', { name: /Row \(Default\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Column/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Center Everything/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Space Between/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Space Around/ })).toBeInTheDocument();
    });

    it('applies preset configuration when clicked', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'desktop' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const centerButton = screen.getByRole('button', { name: '⊕ Center Everything' });
      await user.click(centerButton);

      expect(updatedConfig).toBeTruthy();
      expect(
        updatedConfig && 'flexJustifyContent' in updatedConfig
          ? (updatedConfig as unknown as Record<string, unknown>).flexJustifyContent
          : undefined
      ).toEqual({ desktop: 'center' });
      expect(
        updatedConfig && 'flexAlignItems' in updatedConfig
          ? (updatedConfig as unknown as Record<string, unknown>).flexAlignItems
          : undefined
      ).toEqual({ desktop: 'center' });
    });
  });

  describe('Responsive Behavior', () => {
    it('shows correct values for mobile breakpoint', () => {
      const mobileConfig: WidgetConfig = {
        ...defaultConfig,
        flexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' }
      };

      render(TailwindFlexEditor, {
        props: { config: mobileConfig, currentBreakpoint: 'mobile' }
      });

      const select = screen.getAllByRole('combobox')[0];
      expect(select).toHaveValue('column');
    });

    it('updates only current breakpoint when changed', async () => {
      const user = userEvent.setup();
      const { component } = render(TailwindFlexEditor, {
        props: { config: defaultConfig, currentBreakpoint: 'tablet' }
      });

      let updatedConfig: WidgetConfig | null = null;
      component.$on('update', (event: CustomEvent<WidgetConfig>) => {
        updatedConfig = event.detail;
      });

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, 'column');

      expect(
        updatedConfig && 'flexDirection' in updatedConfig
          ? (updatedConfig as unknown as Record<string, unknown>).flexDirection
          : undefined
      ).toEqual({
        desktop: 'row',
        tablet: 'column',
        mobile: 'column'
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined config values with defaults', () => {
      render(TailwindFlexEditor, {
        props: { config: {}, currentBreakpoint: 'desktop' }
      });

      const select = screen.getAllByRole('combobox')[0];
      expect(select).toHaveValue('row'); // Default
    });

    it('handles missing responsive values', () => {
      const incompleteConfig: WidgetConfig = {
        flexDirection: { desktop: 'row' } // Missing tablet and mobile
      };

      render(TailwindFlexEditor, {
        props: { config: incompleteConfig, currentBreakpoint: 'mobile' }
      });

      const select = screen.getAllByRole('combobox')[0];
      expect(select).toHaveValue('row'); // Falls back to desktop
    });
  });
});
