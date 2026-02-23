import { describe, it, expect } from 'vitest';

/**
 * Tests for mobile collapse configuration logic used in FrontendComponentRenderer.
 *
 * When containerMobileCollapse is enabled on a container, its children should be
 * collapsible behind a hamburger icon on mobile viewports.
 */

interface MobileCollapseConfig {
  containerMobileCollapse?: boolean;
  containerMobileCollapseLabel?: string;
  containerMobileCollapseIconColor?: string;
  containerMobileCollapseBackground?: string;
}

/**
 * Determine if a container should show mobile collapse behavior.
 * Extracted for pure function testing.
 */
function shouldShowMobileCollapse(type: string, config: MobileCollapseConfig): boolean {
  const isContainerType =
    type === 'container' || type === 'row' || type === 'flex' || type === 'composite';
  return isContainerType && config.containerMobileCollapse === true;
}

/**
 * Get the label for the mobile collapse toggle button.
 */
function getMobileCollapseLabel(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseLabel || 'Menu';
}

/**
 * Get the icon color for the mobile collapse toggle.
 */
function getMobileCollapseIconColor(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseIconColor || 'currentColor';
}

/**
 * Get the background color for the mobile collapse toggle.
 */
function getMobileCollapseBackground(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseBackground || 'transparent';
}

describe('FrontendComponentRenderer - Mobile Collapse', () => {
  describe('shouldShowMobileCollapse', () => {
    it('returns true for container type with collapse enabled', () => {
      expect(shouldShowMobileCollapse('container', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for row type with collapse enabled', () => {
      expect(shouldShowMobileCollapse('row', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for flex type with collapse enabled', () => {
      expect(shouldShowMobileCollapse('flex', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns true for composite type with collapse enabled', () => {
      expect(shouldShowMobileCollapse('composite', { containerMobileCollapse: true })).toBe(true);
    });

    it('returns false for container type with collapse disabled', () => {
      expect(shouldShowMobileCollapse('container', { containerMobileCollapse: false })).toBe(false);
    });

    it('returns false for container type without collapse config', () => {
      expect(shouldShowMobileCollapse('container', {})).toBe(false);
    });

    it('returns false for non-container types even with collapse enabled', () => {
      expect(shouldShowMobileCollapse('text', { containerMobileCollapse: true })).toBe(false);
    });

    it('returns false for navbar type (navbar has its own mobile handling)', () => {
      expect(shouldShowMobileCollapse('navbar', { containerMobileCollapse: true })).toBe(false);
    });

    it('returns false for footer type', () => {
      expect(shouldShowMobileCollapse('footer', { containerMobileCollapse: true })).toBe(false);
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
