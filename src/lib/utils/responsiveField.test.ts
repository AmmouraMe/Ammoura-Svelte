import { describe, it, expect } from 'vitest';
import {
  effectiveSource,
  effectiveValue,
  isOverridden,
  isInherited,
  setBreakpoint,
  clearBreakpoint
} from './responsiveField';

describe('responsiveField', () => {
  describe('effectiveSource', () => {
    it('resolves the cascade nearest-first (mobile -> tablet -> desktop)', () => {
      expect(effectiveSource({ desktop: 1, tablet: 2, mobile: 3 }, 'mobile')).toBe('mobile');
      expect(effectiveSource({ desktop: 1, tablet: 2 }, 'mobile')).toBe('tablet');
      expect(effectiveSource({ desktop: 1 }, 'mobile')).toBe('desktop');
      expect(effectiveSource({ desktop: 1 }, 'tablet')).toBe('desktop');
    });

    it('returns null when nothing is set', () => {
      expect(effectiveSource(undefined, 'mobile')).toBeNull();
    });
  });

  describe('effectiveValue', () => {
    it('returns the cascaded value', () => {
      expect(effectiveValue({ desktop: 10, mobile: 4 }, 'mobile', 0)).toBe(4);
      expect(effectiveValue({ desktop: 10 }, 'mobile', 0)).toBe(10);
      expect(effectiveValue(undefined, 'mobile', 0)).toBe(0);
    });

    it('passes a plain scalar through', () => {
      expect(effectiveValue(7 as unknown as { desktop: number }, 'mobile', 0)).toBe(7);
    });
  });

  describe('isOverridden / isInherited', () => {
    it('desktop is the base: never inherited', () => {
      expect(isInherited({ desktop: 1 }, 'desktop')).toBe(false);
      expect(isOverridden({ desktop: 1 }, 'desktop')).toBe(true);
    });

    it('a breakpoint with its own slot is overridden, not inherited', () => {
      const rv = { desktop: 1, mobile: 3 };
      expect(isOverridden(rv, 'mobile')).toBe(true);
      expect(isInherited(rv, 'mobile')).toBe(false);
    });

    it('a breakpoint without its own slot inherits', () => {
      const rv = { desktop: 1 };
      expect(isOverridden(rv, 'mobile')).toBe(false);
      expect(isInherited(rv, 'mobile')).toBe(true);
    });

    it('nothing set at all is not "inherited" (there is no source)', () => {
      expect(isInherited(undefined, 'mobile')).toBe(false);
    });
  });

  describe('setBreakpoint', () => {
    it('editing desktop sets only the base', () => {
      expect(setBreakpoint(undefined, 'desktop', 5)).toEqual({ desktop: 5 });
    });

    it('editing mobile seeds a desktop base and sets only mobile (a real override)', () => {
      // No copy into tablet -> tablet still inherits desktop.
      expect(setBreakpoint(undefined, 'mobile', 8)).toEqual({ desktop: 8, mobile: 8 });
    });

    it('editing mobile on an existing value leaves desktop/tablet untouched', () => {
      expect(setBreakpoint({ desktop: 1, tablet: 2 }, 'mobile', 9)).toEqual({
        desktop: 1,
        tablet: 2,
        mobile: 9
      });
    });
  });

  describe('clearBreakpoint', () => {
    it('removes an override so the field inherits again', () => {
      expect(clearBreakpoint({ desktop: 1, mobile: 3 }, 'mobile')).toEqual({ desktop: 1 });
    });

    it('is a no-op for desktop (the base)', () => {
      const rv = { desktop: 1, mobile: 3 };
      expect(clearBreakpoint(rv, 'desktop')).toBe(rv);
    });
  });
});
