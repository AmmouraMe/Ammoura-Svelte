/**
 * themeContrast — make unreadable themes hard to ship.
 *
 * The builder lint (see `lintPage.ts`) checks the *content* an author places on
 * a page, against whichever theme happens to be active. That leaves a gap: a
 * palette itself can be unreadable, and it fails silently in whichever mode
 * nobody looked at. Every contrast bug found on this project so far has been of
 * that shape — text or an icon that inherits a colour which happens to collapse
 * into its background in one theme.
 *
 * This module states, once, which pairings a palette MUST satisfy to be usable,
 * so a theme can be checked mechanically rather than by eye. It is pure and
 * framework-free; `themeContrast.test.ts` runs it over every built-in theme and
 * fails the suite when a palette regresses.
 *
 * Thresholds follow WCAG 2.1:
 *   - 4.5:1 for body text
 *   - 3.0:1 for large text and for non-text UI (borders, control outlines)
 */

import { contrastRatio } from './contrast';
import type { ThemeColors } from '$lib/types/pages';

/** WCAG AA minimum for normal body text. */
export const AA_TEXT = 4.5;
/** WCAG AA minimum for large text and non-text UI affordances. */
export const AA_LARGE_OR_UI = 3;

export interface ContrastRequirement {
  /** Palette slot used as the foreground. */
  foreground: keyof ThemeColors;
  /** Palette slot used as the background. */
  background: keyof ThemeColors;
  /** Minimum acceptable ratio. */
  minimum: number;
  /** Why this pairing matters — surfaced in failure output. */
  because: string;
}

/**
 * The pairings the UI actually relies on.
 *
 * Kept deliberately small and justified: every entry corresponds to a
 * combination the app really renders, so a failure is a real defect rather than
 * a theoretical one.
 */
export const REQUIRED_CONTRASTS: ContrastRequirement[] = [
  {
    foreground: 'text',
    background: 'background',
    minimum: AA_TEXT,
    because: 'primary body copy sits on the page background'
  },
  {
    foreground: 'text',
    background: 'surface',
    minimum: AA_TEXT,
    because: 'cards, dropdowns and panels use surface behind normal text'
  },
  {
    foreground: 'textSecondary',
    background: 'background',
    minimum: AA_TEXT,
    because: 'captions, help text and metadata use the secondary text colour'
  },
  {
    foreground: 'textSecondary',
    background: 'surface',
    minimum: AA_TEXT,
    because: 'secondary text inside panels — e.g. the account dropdown role line'
  },
  {
    foreground: 'primary',
    background: 'background',
    minimum: AA_LARGE_OR_UI,
    because: 'primary is used for links and control fills against the page'
  },
  {
    foreground: 'primary',
    background: 'surface',
    minimum: AA_LARGE_OR_UI,
    because: 'primary controls also sit on panels'
  },
  {
    foreground: 'error',
    background: 'background',
    minimum: AA_LARGE_OR_UI,
    because: 'validation and quality warnings must be noticeable'
  },
  {
    foreground: 'error',
    background: 'surface',
    minimum: AA_LARGE_OR_UI,
    because: 'the same warnings appear inside panels and cards'
  },
  {
    foreground: 'success',
    background: 'surface',
    minimum: AA_LARGE_OR_UI,
    because: 'confirmation states appear on panels'
  },
  {
    foreground: 'warning',
    background: 'surface',
    minimum: AA_LARGE_OR_UI,
    because: 'warning states appear on panels'
  }
];

/**
 * Deliberately NOT enforced: `border` against `background`.
 *
 * Every light theme here sits around 1.2:1, and WCAG 1.4.11 would ask for 3:1
 * where a border is the only thing identifying a control. Raising them all
 * would visibly restyle six themes — a design decision, not a contrast fix — so
 * it is surfaced rather than enforced. `auditBorderContrast` reports the
 * numbers for whoever makes that call.
 */
export function auditBorderContrast(colors: ThemeColors): { ratio: number | null } {
  return { ratio: contrastRatio(colors.border as string, colors.background as string) };
}

export interface ContrastViolation {
  foreground: keyof ThemeColors;
  background: keyof ThemeColors;
  /** Measured ratio, or null when a colour could not be parsed. */
  ratio: number | null;
  minimum: number;
  because: string;
  /** Ready-to-read failure line. */
  message: string;
}

/**
 * Check one palette against every requirement.
 *
 * Returns an empty array for a healthy palette. Unparseable colours are
 * reported rather than skipped: a palette slot that cannot be read is itself a
 * defect, unlike an arbitrary author-supplied value in the page linter.
 */
export function findContrastViolations(
  colors: ThemeColors,
  requirements: ContrastRequirement[] = REQUIRED_CONTRASTS
): ContrastViolation[] {
  const violations: ContrastViolation[] = [];

  for (const requirement of requirements) {
    const fg = colors[requirement.foreground];
    const bg = colors[requirement.background];
    const ratio = contrastRatio(fg as string, bg as string);

    if (ratio === null) {
      violations.push({
        ...requirement,
        ratio: null,
        message:
          `${requirement.foreground} (${fg}) on ${requirement.background} (${bg}) ` +
          `could not be measured — ${requirement.because}`
      });
      continue;
    }

    if (ratio < requirement.minimum) {
      violations.push({
        ...requirement,
        ratio,
        message:
          `${requirement.foreground} (${fg}) on ${requirement.background} (${bg}) ` +
          `is ${ratio.toFixed(2)}:1, needs ${requirement.minimum}:1 — ${requirement.because}`
      });
    }
  }

  return violations;
}

/** Convenience predicate for callers that only need a yes/no. */
export function isPaletteReadable(colors: ThemeColors): boolean {
  return findContrastViolations(colors).length === 0;
}
