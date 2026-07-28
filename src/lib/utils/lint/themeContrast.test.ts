import { describe, it, expect } from 'vitest';
import {
  REQUIRED_CONTRASTS,
  findContrastViolations,
  isPaletteReadable,
  auditBorderContrast,
  AA_TEXT,
  AA_LARGE_OR_UI
} from './themeContrast';
import { SYSTEM_THEMES } from '$lib/utils/editor/colorThemes';
import type { ThemeColors } from '$lib/types/pages';

/**
 * The guard rail.
 *
 * Every built-in palette is checked in both modes. A new theme, or an edit to
 * an existing one, that makes text unreadable fails here rather than shipping
 * and being noticed in a screenshot.
 */
describe('every built-in theme is readable', () => {
  it('ships at least the light and dark defaults', () => {
    expect(SYSTEM_THEMES.length).toBeGreaterThanOrEqual(2);
    expect(SYSTEM_THEMES.some((t) => t.mode === 'light')).toBe(true);
    expect(SYSTEM_THEMES.some((t) => t.mode === 'dark')).toBe(true);
  });

  for (const theme of SYSTEM_THEMES) {
    it(`${theme.id} (${theme.mode}) — "${theme.name}" meets every required contrast`, () => {
      const violations = findContrastViolations(theme.colors);
      // Print the offending pairings, not just a count, so a failure is
      // actionable without re-running anything by hand.
      expect(violations.map((v) => v.message)).toEqual([]);
    });
  }
});

describe('findContrastViolations', () => {
  const readable: ThemeColors = {
    primary: '#0b5cad',
    secondary: '#475569',
    accent: '#0b5cad',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#374151',
    border: '#9ca3af',
    success: '#046c3f',
    warning: '#8a5a00',
    error: '#b3261e'
  } as ThemeColors;

  it('passes a palette built to be readable', () => {
    expect(findContrastViolations(readable)).toEqual([]);
    expect(isPaletteReadable(readable)).toBe(true);
  });

  it('catches body text that disappears into the background', () => {
    const bad = { ...readable, text: '#f4f4f5' };
    const violations = findContrastViolations(bad);
    expect(violations.some((v) => v.foreground === 'text' && v.background === 'background')).toBe(
      true
    );
    expect(isPaletteReadable(bad)).toBe(false);
  });

  it('catches secondary text that is only readable on one of the two surfaces', () => {
    // Fine on white, hopeless on a dark panel.
    const bad = { ...readable, surface: '#1f2937', textSecondary: '#4b5563' };
    const violations = findContrastViolations(bad);
    expect(
      violations.some((v) => v.foreground === 'textSecondary' && v.background === 'surface')
    ).toBe(true);
  });

  it('reports the measured ratio and the reason', () => {
    const bad = { ...readable, text: '#eeeeee' };
    const [first] = findContrastViolations(bad);
    expect(first.ratio).toBeLessThan(AA_TEXT);
    expect(first.because).toBeTruthy();
    expect(first.message).toContain(':1');
  });

  it('reports an unparseable colour instead of silently passing it', () => {
    const bad = { ...readable, text: 'var(--mystery)' } as ThemeColors;
    const violations = findContrastViolations(bad);
    const unmeasured = violations.filter((v) => v.ratio === null);
    expect(unmeasured.length).toBeGreaterThan(0);
    expect(unmeasured[0].message).toContain('could not be measured');
  });

  it('applies the looser bar to non-text UI than to body text', () => {
    const textRule = REQUIRED_CONTRASTS.find(
      (r) => r.foreground === 'text' && r.background === 'background'
    );
    const uiRule = REQUIRED_CONTRASTS.find(
      (r) => r.foreground === 'primary' && r.background === 'background'
    );
    expect(textRule?.minimum).toBe(AA_TEXT);
    expect(uiRule?.minimum).toBe(AA_LARGE_OR_UI);
  });
});

describe('auditBorderContrast', () => {
  it('reports a number without failing the suite', () => {
    for (const theme of SYSTEM_THEMES) {
      const { ratio } = auditBorderContrast(theme.colors);
      expect(ratio === null || ratio >= 1).toBe(true);
    }
  });
});
