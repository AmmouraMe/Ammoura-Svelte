/**
 * responsiveStyle — the F1 keystone (frontend overhaul).
 *
 * Turns per-breakpoint prop values into a scoped CSS-custom-property block that
 * the global `.responsive` class (src/lib/styles/responsive.css) reads through a
 * media-query cascade. This is the structural replacement for the inline
 * `style="..."` sprawl in the builtin components: inline styles can't respond to
 * breakpoints, scoped vars + `.responsive` can.
 *
 * Data model: consumes the existing `ResponsiveValue<T> = { mobile?, tablet?,
 * desktop }` shape (desktop required). The cascade is desktop-first to match the
 * base value that is always present and the existing renderer's direction:
 *   base            -> desktop
 *   max-width 1024  -> tablet  (falls back to desktop)
 *   max-width 768   -> mobile  (falls back to tablet, then desktop)
 * The 1024/768 literals live in responsive.css and are pinned to
 * BREAKPOINTS.lg/md by responsiveStyle.test.ts.
 *
 * Usage in a builtin:
 *   const rs = responsiveStyle({ display: {...}, gap: {...}, padding: {...} });
 *   <div class="my-widget {rs.className}" style="background: red; {rs.style}">
 *
 * Rule: any property in the vocabulary that a component needs must be passed
 * here, NOT set in the component's scoped <style> for the same element — two
 * equal-specificity author rules would be source-order dependent. Non-vocabulary
 * properties (background, border, color, ...) are untouched and stay inline.
 */

import type { ResponsiveValue, SpacingConfig } from '$lib/types/pages';

/** The single global class that consumes the emitted `--responsive-*` vars. */
export const RESPONSIVE_CLASS = 'responsive';

/** Breakpoint keys of ResponsiveValue, high-to-low (base is desktop). */
const BREAKPOINT_KEYS = ['desktop', 'tablet', 'mobile'] as const;

// --- value formatters -------------------------------------------------------

/** number -> `<n>px`; string passes through (already has a unit / keyword). */
const px = (v: number | string): string => (typeof v === 'number' ? `${v}px` : v);

/** SpacingConfig -> `top right bottom left`, honoring `auto` and missing sides. */
const spacing = (s: SpacingConfig): string => {
  const side = (x: number | 'auto' | undefined): string => (x === 'auto' ? 'auto' : `${x ?? 0}px`);
  return `${side(s.top)} ${side(s.right)} ${side(s.bottom)} ${side(s.left)}`;
};

/** column count -> a repeat() track list; string passes through. */
const gridColumns = (v: number | string): string =>
  typeof v === 'number' ? `repeat(${v}, minmax(0, 1fr))` : v;

/** keyword value passed straight through (flex-direction, display, ...). */
const keyword = (v: string): string => v;

/**
 * The responsive vocabulary. Each entry maps a prop name to the CSS-var suffix
 * (kebab) used in responsive.css and the formatter for its value. Keep this in
 * lockstep with the `.responsive` declarations in responsive.css.
 */
const VOCABULARY = {
  display: { var: 'display', format: keyword },
  flexDirection: { var: 'flex-direction', format: keyword },
  flexWrap: { var: 'flex-wrap', format: keyword },
  justifyContent: { var: 'justify-content', format: keyword },
  alignItems: { var: 'align-items', format: keyword },
  alignContent: { var: 'align-content', format: keyword },
  gap: { var: 'gap', format: px },
  gridColumns: { var: 'grid-columns', format: gridColumns },
  gridAutoFlow: { var: 'grid-auto-flow', format: keyword },
  padding: { var: 'padding', format: spacing },
  margin: { var: 'margin', format: spacing },
  minHeight: { var: 'min-height', format: px },
  maxHeight: { var: 'max-height', format: px },
  maxWidth: { var: 'max-width', format: px }
} as const;

export type ResponsiveProp = keyof typeof VOCABULARY;

/** Typed input bag — every vocabulary prop as an optional ResponsiveValue. */
export interface ResponsiveStyleProps {
  display?: ResponsiveValue<string>;
  flexDirection?: ResponsiveValue<string>;
  flexWrap?: ResponsiveValue<string>;
  justifyContent?: ResponsiveValue<string>;
  alignItems?: ResponsiveValue<string>;
  alignContent?: ResponsiveValue<string>;
  gap?: ResponsiveValue<number | string>;
  gridColumns?: ResponsiveValue<number | string>;
  gridAutoFlow?: ResponsiveValue<string>;
  padding?: ResponsiveValue<SpacingConfig>;
  margin?: ResponsiveValue<SpacingConfig>;
  minHeight?: ResponsiveValue<number | string>;
  maxHeight?: ResponsiveValue<number | string>;
  maxWidth?: ResponsiveValue<number | string>;
}

export interface ResponsiveStyleResult {
  /** Always RESPONSIVE_CLASS; returned so callers can spread it into class=. */
  className: string;
  /** `--responsive-*` custom-property declarations, `; `-joined (no trailing `;`). */
  style: string;
}

/**
 * Serialize per-breakpoint props into the `.responsive` class + a scoped-var style
 * string. Only breakpoints actually present on each value are emitted, so the
 * media cascade's fallbacks (tablet->desktop, mobile->tablet->desktop) apply.
 */
export function responsiveStyle(props: ResponsiveStyleProps): ResponsiveStyleResult {
  const declarations: string[] = [];

  for (const key of Object.keys(props) as ResponsiveProp[]) {
    const value = props[key] as ResponsiveValue<unknown> | undefined;
    if (!value) continue;

    const { var: suffix, format } = VOCABULARY[key];
    for (const bp of BREAKPOINT_KEYS) {
      const raw = value[bp];
      if (raw === undefined || raw === null) continue;
      declarations.push(`--responsive-${suffix}-${bp}: ${format(raw as never)}`);
    }
  }

  return { className: RESPONSIVE_CLASS, style: declarations.join('; ') };
}
