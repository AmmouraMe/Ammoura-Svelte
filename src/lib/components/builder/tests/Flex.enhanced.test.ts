import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Flex from '../../builtin/Flex.svelte';
import type { ComponentConfig } from '$lib/types/pages';

describe('Flex - Enhanced Tailwind Support', () => {
  describe('Flex Mode', () => {
    it('renders with default flex properties', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexDirection: { desktop: 'row' },
        flexJustifyContent: { desktop: 'flex-start' },
        flexAlignItems: { desktop: 'stretch' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toBeInTheDocument();
      expect(widget).toHaveStyle({ display: 'flex' });
    });

    it('applies responsive flex direction', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexDirection: { desktop: 'row', tablet: 'column', mobile: 'column' }
      };

      // Desktop
      const { container: desktopContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });
      let widget = desktopContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'flex-direction': 'row' });

      // Mobile
      const { container: mobileContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'mobile' }
      });
      widget = mobileContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'flex-direction': 'column' });
    });

    it('applies flex wrap property', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexWrap: { desktop: 'wrap', tablet: 'nowrap', mobile: 'wrap-reverse' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'flex-wrap': 'wrap' });
    });

    it('applies justify content property', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexJustifyContent: { desktop: 'space-between' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'justify-content': 'space-between' });
    });

    it('applies separate gap-x and gap-y', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexGapX: { desktop: 24 },
        flexGapY: { desktop: 16 }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        'column-gap': '24px',
        'row-gap': '16px'
      });
    });

    it('applies padding with responsive values', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexPadding: {
          desktop: { top: 20, right: 30, bottom: 20, left: 30 },
          mobile: { top: 10, right: 15, bottom: 10, left: 15 }
        }
      };

      // Desktop
      const { container: desktopContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });
      let widget = desktopContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ padding: '20px 30px 20px 30px' });

      // Mobile
      const { container: mobileContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'mobile' }
      });
      widget = mobileContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ padding: '10px 15px 10px 15px' });
    });

    it('applies width and height properties', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexWidth: { desktop: '80%' },
        flexHeight: { desktop: '500px' },
        flexMinHeight: { desktop: '400px' },
        flexMaxWidth: { desktop: '1200px' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        width: '80%',
        height: '500px',
        'min-height': '400px',
        'max-width': '1200px'
      });
    });

    it('applies border configuration', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexBorder: {
          width: 2,
          style: 'dashed',
          color: '#ff0000',
          radius: 8
        }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        'border-width': '2px',
        'border-style': 'dashed',
        'border-color': '#ff0000'
      });
    });
  });

  describe('Grid Mode', () => {
    it('renders with grid display when useGrid is true', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridColumns: { desktop: 3 }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ display: 'grid' });
    });

    it('applies grid-template-columns with number', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridColumns: { desktop: 4, tablet: 2, mobile: 1 }
      };

      // Desktop
      const { container: desktopContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });
      let widget = desktopContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'grid-template-columns': 'repeat(4, 1fr)' });

      // Mobile
      const { container: mobileContainer } = render(Flex, {
        props: { config, currentBreakpoint: 'mobile' }
      });
      widget = mobileContainer.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'grid-template-columns': 'repeat(1, 1fr)' });
    });

    it('applies grid-template-columns with template string', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridColumns: { desktop: '200px 1fr 1fr' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'grid-template-columns': '200px 1fr 1fr' });
    });

    it('applies grid auto flow', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridAutoFlow: { desktop: 'column', tablet: 'row', mobile: 'dense' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'grid-auto-flow': 'column' });
    });

    it('applies separate column and row gaps', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridColumnGap: { desktop: 24 },
        gridRowGap: { desktop: 16 }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        'column-gap': '24px',
        'row-gap': '16px'
      });
    });

    it('applies justify-items and align-items', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridJustifyItems: { desktop: 'center' },
        gridAlignItems: { desktop: 'end' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        'justify-items': 'center',
        'align-items': 'end'
      });
    });

    it('applies justify-content and align-content', () => {
      const config: ComponentConfig = {
        useGrid: true,
        gridJustifyContent: { desktop: 'space-between' },
        gridAlignContent: { desktop: 'space-around' }
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({
        'justify-content': 'space-between',
        'align-content': 'space-around'
      });
    });
  });

  describe('Placeholder State', () => {
    it('shows placeholder when no children', () => {
      const config: ComponentConfig = {
        useGrid: false,
        children: []
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      expect(container.textContent).toContain('Add elements to this flex container');
    });

    it('shows grid placeholder when useGrid is true and no children', () => {
      const config: ComponentConfig = {
        useGrid: true,
        children: []
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      expect(container.textContent).toContain('Add elements to this grid');
    });
  });

  describe('Responsive Fallbacks', () => {
    it('falls back to desktop value when breakpoint value missing', () => {
      const config: ComponentConfig = {
        useGrid: false,
        flexDirection: { desktop: 'row' } // Missing tablet and mobile
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'mobile' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toHaveStyle({ 'flex-direction': 'row' });
    });

    it('uses defaults when config values completely missing', () => {
      const config: ComponentConfig = {
        useGrid: false
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).toBeInTheDocument();
      // Should render with defaults without crashing
    });
  });

  describe('Anchor Names', () => {
    it('applies anchor name as id attribute', () => {
      const config: ComponentConfig = {
        useGrid: false,
        anchorName: 'my-section'
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('#my-section');
      expect(widget).toBeInTheDocument();
    });

    it('does not add id when anchor name is undefined', () => {
      const config: ComponentConfig = {
        useGrid: false
      };

      const { container } = render(Flex, {
        props: { config, currentBreakpoint: 'desktop' }
      });

      const widget = container.querySelector('.flex-component');
      expect(widget).not.toHaveAttribute('id');
    });
  });
});
