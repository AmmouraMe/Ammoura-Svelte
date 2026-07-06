/**
 * Canonical responsive breakpoints (frontend overhaul F0).
 *
 * CSS media queries can't read CSS variables, so these constants are the
 * single source of truth; tokens.css mirrors them as informational
 * --breakpoint-* vars and a unit test keeps the two in sync.
 *
 * Legacy note: the existing builder config model uses named viewports
 * (desktop / tablet / mobile). Those map as: mobile ≤ md, tablet ≤ lg,
 * desktop > lg.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** Media query strings for JS-side matchMedia use. */
export function mediaQueryFor(name: BreakpointName, direction: 'max' | 'min' = 'max'): string {
  const px = BREAKPOINTS[name];
  return direction === 'max' ? `(max-width: ${px}px)` : `(min-width: ${px + 1}px)`;
}
