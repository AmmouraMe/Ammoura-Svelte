/**
 * lintPage — accessibility lint for the builder's component tree (F2).
 *
 * Produces non-blocking warnings the builder surfaces in a lint panel:
 *   - contrast: a concrete text/background pair below WCAG AA (resolved against
 *     the active theme via the injected resolver; unresolvable colors are
 *     skipped, never flagged, to avoid false alarms).
 *   - missing-alt: an image with no alt text.
 *   - touch-target: an interactive element with an explicit height under 44px.
 *
 * Framework-free and pure so it is easy to unit test; the builder passes a
 * theme-aware color resolver.
 */

import type { PageComponent, ComponentConfig } from '$lib/types/pages';
import { contrastRatio, AA_NORMAL, AA_LARGE } from './contrast';

export type LintRule = 'contrast' | 'missing-alt' | 'touch-target';

export interface LintWarning {
  componentId: string;
  componentType: string;
  rule: LintRule;
  message: string;
}

/** Resolves a color (possibly a theme reference) to a concrete CSS color, or undefined. */
export type ColorResolver = (color: string | undefined | null) => string | undefined;

const IDENTITY: ColorResolver = (c) => c ?? undefined;

/** Interactive component types whose tap target should be >= 44px. */
const INTERACTIVE = new Set(['button', 'cta']);

interface ColorPair {
  fg?: string;
  bg?: string;
  label: string;
  large?: boolean;
}

/** Well-known text/background color pairs per component type. */
function colorPairs(type: string, config: ComponentConfig): ColorPair[] {
  const pairs: ColorPair[] = [];
  const push = (fg: unknown, bg: unknown, label: string, large = false) => {
    pairs.push({ fg: fg as string, bg: bg as string, label, large });
  };
  switch (type) {
    case 'button':
      push(config.textColor, config.backgroundColor, 'button label', false);
      break;
    case 'navbar':
      push(config.navbarTextColor, config.navbarBackground, 'nav links', false);
      break;
    case 'footer':
      push(config.footerTextColor, config.footerBackground, 'footer text', false);
      break;
    case 'hero':
      push(config.textColor, config.backgroundColor, 'hero text', true);
      break;
    case 'text':
    case 'heading': {
      const styles = config.styles as Record<string, unknown> | undefined;
      push(
        config.textColor ?? styles?.color,
        config.backgroundColor ?? styles?.backgroundColor,
        type,
        type === 'heading'
      );
      break;
    }
  }
  return pairs;
}

function checkContrast(
  id: string,
  type: string,
  config: ComponentConfig,
  resolve: ColorResolver,
  out: LintWarning[]
): void {
  for (const pair of colorPairs(type, config)) {
    const fg = resolve(pair.fg);
    const bg = resolve(pair.bg);
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) continue; // unresolvable / transparent -> don't guess
    const threshold = pair.large ? AA_LARGE : AA_NORMAL;
    if (ratio < threshold) {
      out.push({
        componentId: id,
        componentType: type,
        rule: 'contrast',
        message: `Low contrast on ${pair.label}: ${ratio.toFixed(2)}:1 (needs ${threshold}:1)`
      });
    }
  }
}

function checkAlt(id: string, type: string, config: ComponentConfig, out: LintWarning[]): void {
  if (type !== 'image') return;
  const alt = typeof config.alt === 'string' ? config.alt.trim() : '';
  if (config.src && !alt) {
    out.push({
      componentId: id,
      componentType: type,
      rule: 'missing-alt',
      message: 'Image has no alt text (screen readers can’t describe it)'
    });
  }
}

function checkTouchTarget(
  id: string,
  type: string,
  config: ComponentConfig,
  out: LintWarning[]
): void {
  if (!INTERACTIVE.has(type)) return;
  const styles = config.styles as Record<string, unknown> | undefined;
  for (const key of ['height', 'minHeight'] as const) {
    const raw = styles?.[key];
    const px =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'object' && raw !== null
          ? (raw as Record<string, number>).desktop
          : undefined;
    if (typeof px === 'number' && px > 0 && px < 44) {
      out.push({
        componentId: id,
        componentType: type,
        rule: 'touch-target',
        message: `Tap target is ${px}px tall (should be at least 44px)`
      });
      return;
    }
  }
}

/** Recursively walk a component and its nested children. */
function walk(component: PageComponent, visit: (c: PageComponent) => void): void {
  visit(component);
  const children = (component.config?.children as PageComponent[] | undefined) || [];
  for (const child of children) walk(child, visit);
}

/** Lint a page's components, returning all accessibility warnings. */
export function lintComponents(
  components: PageComponent[],
  resolve: ColorResolver = IDENTITY
): LintWarning[] {
  const out: LintWarning[] = [];
  for (const component of components) {
    walk(component, (c) => {
      const config = (c.config || {}) as ComponentConfig;
      const id = String(c.id ?? '');
      checkContrast(id, c.type, config, resolve, out);
      checkAlt(id, c.type, config, out);
      checkTouchTarget(id, c.type, config, out);
    });
  }
  return out;
}
