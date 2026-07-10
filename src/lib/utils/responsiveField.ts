/**
 * responsiveField — per-breakpoint editing helpers for the builder (F2).
 *
 * The frontend renders ResponsiveValue<T> = { mobile?, tablet?, desktop } with a
 * desktop-first cascade (mobile falls back to tablet falls back to desktop; see
 * responsive.css). These helpers give the builder editors matching inheritance
 * semantics so a value can be *overridden* at a breakpoint or left to *inherit*:
 *
 *   - desktop is the base (never "inherited").
 *   - tablet inherits desktop unless it has its own slot.
 *   - mobile inherits tablet, then desktop, unless it has its own slot.
 *
 * setBreakpoint writes only the edited breakpoint's slot (seeding a desktop base
 * if none exists) instead of filling all three — that is what makes a tablet/
 * mobile value a real override rather than a copy. clearBreakpoint removes an
 * override so the field inherits again.
 */

import type { ResponsiveValue } from '$lib/types/pages';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

/** Breakpoints a given breakpoint falls back through, nearest first. */
const FALLBACK: Record<Breakpoint, Breakpoint[]> = {
  desktop: ['desktop'],
  tablet: ['tablet', 'desktop'],
  mobile: ['mobile', 'tablet', 'desktop']
};

type RV<T> = ResponsiveValue<T> | undefined;
type Rec<T> = Partial<Record<Breakpoint, T>>;

function isResponsiveObject<T>(v: unknown): v is ResponsiveValue<T> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Read a ResponsiveValue as a partial breakpoint->value record. */
function asRec<T>(value: ResponsiveValue<T>): Rec<T> {
  return value as unknown as Rec<T>;
}

/** The breakpoint the effective value at `bp` actually comes from, or null if unset. */
export function effectiveSource<T>(value: RV<T>, bp: Breakpoint): Breakpoint | null {
  if (!isResponsiveObject<T>(value)) return null;
  const rec = asRec(value);
  for (const step of FALLBACK[bp]) {
    if (rec[step] !== undefined) return step;
  }
  return null;
}

/** The effective value at `bp` after cascade, or `fallback` if nothing is set. */
export function effectiveValue<T>(value: RV<T> | T, bp: Breakpoint, fallback: T): T {
  if (!isResponsiveObject<T>(value)) {
    return value === undefined || value === null ? fallback : (value as T);
  }
  const src = effectiveSource(value, bp);
  return src ? (asRec(value)[src] as T) : fallback;
}

/** True when `bp` has its own explicit slot (i.e. it overrides the cascade). */
export function isOverridden<T>(value: RV<T>, bp: Breakpoint): boolean {
  return isResponsiveObject<T>(value) && asRec(value)[bp] !== undefined;
}

/**
 * True when the effective value at `bp` is inherited from a wider breakpoint
 * rather than set on `bp` itself. Desktop is the base, so it is never inherited.
 */
export function isInherited<T>(value: RV<T>, bp: Breakpoint): boolean {
  if (bp === 'desktop') return false;
  return !isOverridden(value, bp) && effectiveSource(value, bp) !== null;
}

/**
 * Write `newValue` at `bp`, returning a new ResponsiveValue. Only `bp`'s slot is
 * set (seeding a desktop base when absent), so tablet/mobile become real
 * overrides instead of copies of every breakpoint.
 */
export function setBreakpoint<T>(value: RV<T>, bp: Breakpoint, newValue: T): ResponsiveValue<T> {
  const next: Rec<T> = isResponsiveObject<T>(value) ? { ...asRec(value) } : {};
  if (bp !== 'desktop' && next.desktop === undefined) {
    next.desktop = newValue;
  }
  next[bp] = newValue;
  return next as unknown as ResponsiveValue<T>;
}

/**
 * Remove `bp`'s override so it inherits again. No-op for desktop (the base) and
 * for values that aren't responsive objects.
 */
export function clearBreakpoint<T>(value: RV<T>, bp: Breakpoint): RV<T> {
  if (bp === 'desktop' || !isResponsiveObject<T>(value)) return value;
  const next: Rec<T> = { ...asRec(value) };
  delete next[bp];
  return next as unknown as ResponsiveValue<T>;
}
