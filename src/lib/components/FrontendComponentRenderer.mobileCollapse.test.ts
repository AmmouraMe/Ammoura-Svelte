import { describe, it, expect } from 'vitest';
import {
  getMobileCollapseLabel,
  shouldShowMobileCollapse,
  type MobileCollapseConfig
} from '$lib/utils/mobileCollapse';

/**
 * Tests for mobile collapse configuration logic used in FrontendComponentRenderer.
 *
 * When containerMobileCollapse is enabled on a container, its children should be
 * collapsible behind a hamburger icon on mobile viewports. A row of navigation
 * items inside a navbar does this without being asked.
 *
 * These import the real rule from $lib/utils/mobileCollapse rather than
 * restating it, so the tests cannot pass while the renderer does something else.
 */

/** Convenience wrapper for the common "no navbar context" case. */
function collapses(type: string, config: MobileCollapseConfig): boolean {
  return shouldShowMobileCollapse({ type, config });
}

/**
 * The icon colour and background fall back to CSS keywords before the renderer
 * resolves them against the active theme. Mirrored here because resolution
 * itself belongs to the component.
 */
function getMobileCollapseIconColor(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseIconColor || 'currentColor';
}

function getMobileCollapseBackground(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseBackground || 'transparent';
}

describe('FrontendComponentRenderer - Mobile Collapse', () => {
  describe('shouldShowMobileCollapse', () => {
    it('returns true for container type with collapse enabled', () => {
      expect(collapses('container', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for row type with collapse enabled', () => {
      expect(collapses('row', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for flex type with collapse enabled', () => {
      expect(collapses('flex', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for composite type with collapse enabled', () => {
      expect(collapses('composite', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns false for container type with collapse disabled', () => {
      expect(collapses('container', { containerMobileCollapse: false })).toBe(false);
    });

    it('returns false for container type without collapse config', () => {
      expect(collapses('container', {})).toBe(false);
    });

    it('returns false for non-container types even with collapse enabled', () => {
      expect(collapses('text', { containerMobileCollapse: true })).toBe(false);
    });

    it('returns false for navbar type (navbar has its own mobile handling)', () => {
      expect(collapses('navbar', { containerMobileCollapse: true })).toBe(false);
    });

    it('returns false for footer type', () => {
      expect(collapses('footer', { containerMobileCollapse: true })).toBe(false);
    });
  });

  describe('automatic collapse inside a navbar', () => {
    const navItems = [
      { type: 'button' },
      { type: 'button' },
      { type: 'dropdown' },
      { type: 'theme_toggle' }
    ];

    it('collapses a row of navigation items without any config', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: {},
          insideNavbar: true,
          children: navItems
        })
      ).toBe(true);
    });

    it('leaves the same container alone outside a navbar', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: {},
          insideNavbar: false,
          children: navItems
        })
      ).toBe(false);
    });

    it('respects an explicit false so a navbar row can stay expanded', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: { containerMobileCollapse: false },
          insideNavbar: true,
          children: navItems
        })
      ).toBe(false);
    });

    it('does not collapse a layout wrapper, which would hide the logo too', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: {},
          insideNavbar: true,
          children: [{ type: 'container' }, { type: 'container' }]
        })
      ).toBe(false);
    });

    it('does not collapse a container holding a single item', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: {},
          insideNavbar: true,
          children: [{ type: 'heading' }]
        })
      ).toBe(false);
    });

    it('does not collapse an empty container', () => {
      expect(
        shouldShowMobileCollapse({
          type: 'container',
          config: {},
          insideNavbar: true,
          children: []
        })
      ).toBe(false);
    });
  });

  describe('getMobileCollapseLabel', () => {
    it('returns custom label when provided', () => {
      expect(getMobileCollapseLabel({ containerMobileCollapseLabel: 'Navigation' })).toBe(
        'Navigation'
      );
    });

    it('returns "Menu" as default label', () => {
      expect(getMobileCollapseLabel({})).toBe('Menu');
    });

    it('returns "Menu" when label is empty string', () => {
      expect(getMobileCollapseLabel({ containerMobileCollapseLabel: '' })).toBe('Menu');
    });
  });

  describe('getMobileCollapseIconColor', () => {
    it('returns custom icon color when provided', () => {
      expect(getMobileCollapseIconColor({ containerMobileCollapseIconColor: '#ff0000' })).toBe(
        '#ff0000'
      );
    });

    it('returns "currentColor" as default', () => {
      expect(getMobileCollapseIconColor({})).toBe('currentColor');
    });
  });

  describe('getMobileCollapseBackground', () => {
    it('returns custom background when provided', () => {
      expect(getMobileCollapseBackground({ containerMobileCollapseBackground: '#333' })).toBe(
        '#333'
      );
    });

    it('returns "transparent" as default', () => {
      expect(getMobileCollapseBackground({})).toBe('transparent');
    });
  });
});
