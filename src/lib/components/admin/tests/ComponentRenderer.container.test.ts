import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ComponentRenderer from '../ComponentRenderer.svelte';
import type { PageComponent, Breakpoint } from '$lib/types/pages';

describe('ComponentRenderer - Container Display Modes', () => {
  const createContainerComponent = (config: Record<string, unknown>): PageComponent => ({
    id: 'test-container',
    page_id: 'test-page',
    type: 'container',
    position: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    config: {
      containerMaxWidth: '1200px',
      containerBackground: 'transparent',
      ...config
    }
  });

  describe('Flexbox Display Mode', () => {
    it('renders container with flex display mode', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex' },
        containerFlexDirection: { desktop: 'row' },
        containerJustifyContent: 'center',
        containerAlignItems: 'center'
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement).toBeTruthy();
      expect(containerElement.style.display).toBe('flex');
      expect(containerElement.style.flexDirection).toBe('row');
      expect(containerElement.style.justifyContent).toBe('center');
      expect(containerElement.style.alignItems).toBe('center');
    });

    it('applies responsive flex direction', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
        containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' }
      });

      // Test mobile breakpoint
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });

      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      expect(mobileElement.style.display).toBe('flex');
      expect(mobileElement.style.flexDirection).toBe('column');

      // Test desktop breakpoint
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      expect(desktopElement.style.display).toBe('flex');
      expect(desktopElement.style.flexDirection).toBe('row');
    });
  });

  describe('Grid Display Mode', () => {
    it('renders container with grid display mode', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'grid' },
        containerGridCols: { desktop: 3 },
        containerGridRows: { desktop: 2 },
        containerPlaceItems: { desktop: 'center' }
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement).toBeTruthy();
      expect(containerElement.style.display).toBe('grid');
      expect(containerElement.style.gridTemplateColumns).toContain('repeat(3, 1fr)');
      expect(containerElement.style.gridTemplateRows).toContain('repeat(2, 1fr)');
      expect(containerElement.style.placeItems).toBe('center');
    });

    it('handles custom grid template strings', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'grid' },
        containerGridCols: { desktop: '200px 1fr 2fr' },
        containerGridRows: { desktop: 'auto 1fr auto' }
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement.style.display).toBe('grid');
      expect(containerElement.style.gridTemplateColumns).toBe('200px 1fr 2fr');
      expect(containerElement.style.gridTemplateRows).toBe('auto 1fr auto');
    });

    it('applies responsive grid columns', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'grid', tablet: 'grid', mobile: 'grid' },
        containerGridCols: { desktop: 4, tablet: 2, mobile: 1 }
      });

      // Test mobile breakpoint
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });

      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      expect(mobileElement.style.display).toBe('grid');
      expect(mobileElement.style.gridTemplateColumns).toContain('repeat(1, 1fr)');

      // Test tablet breakpoint
      const { container: tabletContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'tablet' as Breakpoint,
          isEditable: false
        }
      });

      const tabletElement = tabletContainer.querySelector('.container-component') as HTMLElement;
      expect(tabletElement.style.display).toBe('grid');
      expect(tabletElement.style.gridTemplateColumns).toContain('repeat(2, 1fr)');

      // Test desktop breakpoint
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      expect(desktopElement.style.display).toBe('grid');
      expect(desktopElement.style.gridTemplateColumns).toContain('repeat(4, 1fr)');
    });

    it('applies grid auto flow', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'grid' },
        containerGridCols: { desktop: 3 },
        containerGridAutoFlow: { desktop: 'dense' }
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement.style.gridAutoFlow).toBe('dense');
    });

    it('applies place content for grid', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'grid' },
        containerGridCols: { desktop: 3 },
        containerPlaceContent: { desktop: 'space-between' }
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement.style.placeContent).toBe('space-between');
    });
  });

  describe('Block Display Mode', () => {
    it('renders container with block display mode', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'block' }
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement).toBeTruthy();
      expect(containerElement.style.display).toBe('block');
    });

    it('does not apply flex or grid properties in block mode', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'block' },
        containerJustifyContent: 'center', // Should not apply
        containerGridCols: { desktop: 3 } // Should not apply
      });

      const { container } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });

      const containerElement = container.querySelector('.container-component') as HTMLElement;
      expect(containerElement.style.display).toBe('block');
      expect(containerElement.style.justifyContent).toBe('');
      expect(containerElement.style.gridTemplateColumns).toBe('');
    });
  });

  describe('Responsive Display Mode Switching', () => {
    it('switches from flex to grid across breakpoints', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex', tablet: 'grid', mobile: 'block' },
        containerFlexDirection: { desktop: 'row' },
        containerGridCols: { tablet: 2 }
      });

      // Desktop: flex
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });
      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      expect(desktopElement.style.display).toBe('flex');
      expect(desktopElement.style.flexDirection).toBe('row');

      // Tablet: grid
      const { container: tabletContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'tablet' as Breakpoint,
          isEditable: false
        }
      });
      const tabletElement = tabletContainer.querySelector('.container-component') as HTMLElement;
      expect(tabletElement.style.display).toBe('grid');
      expect(tabletElement.style.gridTemplateColumns).toContain('repeat(2, 1fr)');

      // Mobile: block
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });
      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      expect(mobileElement.style.display).toBe('block');
    });
  });

  describe('Responsive Spacing', () => {
    it('applies responsive padding', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex' },
        containerPadding: {
          desktop: { top: 40, right: 40, bottom: 40, left: 40 },
          tablet: { top: 30, right: 30, bottom: 30, left: 30 },
          mobile: { top: 20, right: 20, bottom: 20, left: 20 }
        }
      });

      // Mobile
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });
      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      const mobilePadding = mobileElement.getAttribute('style') || '';
      expect(mobilePadding).toContain('padding:');
      expect(mobilePadding).toContain('20px');

      // Desktop
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });
      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      const desktopPadding = desktopElement.getAttribute('style') || '';
      expect(desktopPadding).toContain('padding:');
      expect(desktopPadding).toContain('40px');
    });

    it('applies responsive margin', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex' },
        containerMargin: {
          desktop: { top: 20, bottom: 20 },
          mobile: { top: 10, bottom: 10 }
        }
      });

      // Mobile
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });
      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      const mobileMargin = mobileElement.getAttribute('style') || '';
      expect(mobileMargin).toContain('margin:');
      expect(mobileMargin).toContain('10px');
      expect(mobileMargin).toContain('auto');

      // Desktop
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });
      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      const desktopMargin = desktopElement.getAttribute('style') || '';
      expect(desktopMargin).toContain('margin:');
      expect(desktopMargin).toContain('20px');
      expect(desktopMargin).toContain('auto');
    });
  });

  describe('Gap Property', () => {
    it('applies responsive gap', () => {
      const component = createContainerComponent({
        containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
        containerGap: { desktop: 32, tablet: 24, mobile: 16 }
      });

      // Mobile
      const { container: mobileContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'mobile' as Breakpoint,
          isEditable: false
        }
      });
      const mobileElement = mobileContainer.querySelector('.container-component') as HTMLElement;
      const mobileGap = mobileElement.getAttribute('style') || '';
      expect(mobileGap).toContain('gap:');
      expect(mobileGap).toContain('16px');

      // Desktop
      const { container: desktopContainer } = render(ComponentRenderer, {
        props: {
          component,
          currentBreakpoint: 'desktop' as Breakpoint,
          isEditable: false
        }
      });
      const desktopElement = desktopContainer.querySelector('.container-component') as HTMLElement;
      const desktopGap = desktopElement.getAttribute('style') || '';
      expect(desktopGap).toContain('gap:');
      expect(desktopGap).toContain('32px');
    });
  });
});
