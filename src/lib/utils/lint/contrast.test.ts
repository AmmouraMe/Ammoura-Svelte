import { describe, it, expect } from 'vitest';
import { parseColor, contrastRatio, meetsAA } from './contrast';

describe('contrast', () => {
  describe('parseColor', () => {
    it('parses #rrggbb and #rgb', () => {
      expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses rgb()/rgba()', () => {
      expect(parseColor('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0 });
      expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
    });

    it('handles keywords and returns null for unresolvable values', () => {
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseColor('transparent')).toBeNull();
      expect(parseColor('var(--color-primary)')).toBeNull();
      expect(parseColor(undefined)).toBeNull();
    });
  });

  describe('contrastRatio', () => {
    it('is 21 for black on white and 1 for identical colors', () => {
      expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
      expect(contrastRatio('#345678', '#345678')).toBeCloseTo(1, 5);
    });

    it('is symmetric', () => {
      const a = contrastRatio('#111111', '#eeeeee');
      const b = contrastRatio('#eeeeee', '#111111');
      expect(a).toBeCloseTo(b as number, 5);
    });

    it('returns null when a color is unresolvable', () => {
      expect(contrastRatio('var(--x)', '#fff')).toBeNull();
    });
  });

  describe('meetsAA', () => {
    it('passes high-contrast pairs and fails low-contrast pairs', () => {
      expect(meetsAA('#000', '#fff')).toBe(true);
      expect(meetsAA('#777777', '#808080')).toBe(false); // ~1.06:1
    });

    it('uses the 3:1 large-text threshold when large=true', () => {
      // ~3.1:1 — fails normal, passes large
      const fg = '#8a8a8a';
      const bg = '#ffffff';
      expect(meetsAA(fg, bg, false)).toBe(false);
      expect(meetsAA(fg, bg, true)).toBe(true);
    });

    it('does not raise a false alarm on unresolvable colors', () => {
      expect(meetsAA('var(--x)', '#000')).toBe(true);
    });
  });
});
