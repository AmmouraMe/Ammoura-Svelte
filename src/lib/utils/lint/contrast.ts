/**
 * contrast — WCAG 2.1 relative-luminance contrast ratio (F2 builder lint).
 *
 * Used by the builder lint panel to flag text/background color pairs that fall
 * below the AA thresholds against the active theme. Pure and framework-free so
 * it is easy to unit test.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000'
};

/**
 * Parse a CSS color into RGB. Handles #rgb / #rrggbb (+ alpha), rgb()/rgba(),
 * and a few keywords. Returns null for anything unresolvable (e.g. a raw
 * `var(--x)` or gradient) so the caller can skip it rather than guess.
 */
export function parseColor(input: string | undefined | null): Rgb | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (s === 'transparent' || s === 'none' || s === 'inherit' || s === 'currentcolor') return null;
  if (NAMED[s]) s = NAMED[s];

  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6 && hex.length !== 8) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }

  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p));
    if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2] };
  }

  return null;
}

/** sRGB channel [0,255] -> linear-light component [0,1]. */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of an RGB color. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG contrast ratio between two colors, 1 (identical) … 21 (black on white).
 * Returns null if either color can't be parsed.
 */
export function contrastRatio(a: string | undefined, b: string | undefined): number | null {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return null;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** AA thresholds: 4.5 for normal text, 3 for large text (>=24px or >=18.66px bold). */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/** True when the pair meets AA for the given text size. Unknown colors pass (no false alarms). */
export function meetsAA(fg: string | undefined, bg: string | undefined, large = false): boolean {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) return true;
  return ratio >= (large ? AA_LARGE : AA_NORMAL);
}
