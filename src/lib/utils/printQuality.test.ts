import { describe, it, expect } from 'vitest';
import {
  toInches,
  effectiveDpi,
  assessPrintQuality,
  recommendedPixels,
  formatPhysicalSize,
  type PrintGeometry
} from './printQuality';

// The seeded all-over hoodie area: 40 x 30 in at 150 DPI.
const HOODIE: PrintGeometry = { physWidth: 40, physHeight: 30, unit: 'in', requiredDpi: 150 };
// The seeded mug wrap: 9.5 x 3.5 in at 300 DPI.
const MUG: PrintGeometry = { physWidth: 9.5, physHeight: 3.5, unit: 'in', requiredDpi: 300 };

describe('toInches', () => {
  it('passes inches through', () => {
    expect(toInches(12, 'in')).toBe(12);
  });

  it('converts cm and mm', () => {
    expect(toInches(2.54, 'cm')).toBeCloseTo(1);
    expect(toInches(25.4, 'mm')).toBeCloseTo(1);
  });

  it('treats an unknown or empty unit as inches', () => {
    expect(toInches(5, 'furlong')).toBe(5);
    expect(toInches(5, '')).toBe(5);
  });
});

describe('effectiveDpi', () => {
  it('is pixels divided by covered inches', () => {
    // 6000px across 40in = 150 DPI at scale 1.
    expect(effectiveDpi(6000, HOODIE, 1)).toBe(150);
  });

  it('halves when the design is scaled to twice the width', () => {
    expect(effectiveDpi(6000, HOODIE, 2)).toBe(75);
  });

  it('returns 0 for degenerate input rather than Infinity/NaN', () => {
    expect(effectiveDpi(0, HOODIE, 1)).toBe(0);
    expect(effectiveDpi(6000, HOODIE, 0)).toBe(0);
    expect(effectiveDpi(6000, { ...HOODIE, physWidth: 0 }, 1)).toBe(0);
  });
});

describe('assessPrintQuality', () => {
  it('rates an exactly-sufficient upload as good and meeting the requirement', () => {
    const q = assessPrintQuality(6000, 4500, HOODIE, 1);
    expect(q.dpi).toBe(150);
    expect(q.rating).toBe('good');
    expect(q.meetsRequirement).toBe(true);
  });

  it('rates generous resolution as excellent', () => {
    const q = assessPrintQuality(12000, 9000, HOODIE, 1);
    expect(q.rating).toBe('excellent');
  });

  it('flags the 800px downsample the old pipeline produced as unusable', () => {
    const q = assessPrintQuality(800, 600, HOODIE, 1);
    expect(q.meetsRequirement).toBe(false);
    expect(q.rating).toBe('unusable');
    expect(q.dpi).toBe(20);
  });

  it('rates by the weaker axis, not just width', () => {
    // Wide enough across, far too short vertically.
    const q = assessPrintQuality(6000, 900, HOODIE, 1);
    expect(q.dpi).toBe(30);
    expect(q.meetsRequirement).toBe(false);
  });

  it('degrades as the customer scales the design up', () => {
    const at1 = assessPrintQuality(12000, 9000, HOODIE, 1);
    const at2 = assessPrintQuality(12000, 9000, HOODIE, 2);
    expect(at1.dpi).toBe(300);
    expect(at2.dpi).toBe(150);
    expect(at2.meetsRequirement).toBe(true);
    const at3 = assessPrintQuality(12000, 9000, HOODIE, 3);
    expect(at3.meetsRequirement).toBe(false);
  });

  it('reports the largest scale that still meets the requirement', () => {
    const q = assessPrintQuality(12000, 9000, HOODIE, 1);
    // 12000px / (40in * 150dpi) = 2
    expect(q.maxScaleAtRequiredDpi).toBe(2);
  });

  it('applies the print area’s own DPI bar, not a fixed one', () => {
    // 2850px across 9.5in = 300 DPI: fine for a mug.
    const mug = assessPrintQuality(2850, 1050, MUG, 1);
    expect(mug.meetsRequirement).toBe(true);
    // The same pixel count over the hoodie's 40in is far too coarse.
    const hoodie = assessPrintQuality(2850, 1050, HOODIE, 1);
    expect(hoodie.meetsRequirement).toBe(false);
  });

  it('falls back to 150 DPI when the area declares none', () => {
    const q = assessPrintQuality(6000, 4500, { ...HOODIE, requiredDpi: 0 }, 1);
    expect(q.meetsRequirement).toBe(true);
  });
});

describe('recommendedPixels', () => {
  it('reports the pixels needed to fill the area at required DPI', () => {
    expect(recommendedPixels(HOODIE)).toEqual({ width: 6000, height: 4500 });
    expect(recommendedPixels(MUG)).toEqual({ width: 2850, height: 1050 });
  });
});

describe('formatPhysicalSize', () => {
  it('formats with the unit', () => {
    expect(formatPhysicalSize(HOODIE)).toBe('40 × 30 in');
    expect(formatPhysicalSize(MUG)).toBe('9.5 × 3.5 in');
  });
});
