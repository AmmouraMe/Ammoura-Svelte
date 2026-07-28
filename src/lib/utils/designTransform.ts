/**
 * Placement maths and edit history for the customer design tools.
 *
 * Kept free of DOM and Svelte so the rules that decide where a design sits —
 * and what "undo" means — can be tested directly, and reused later by the
 * server-side print-file builder, which must reproduce the customer's
 * on-screen placement exactly.
 */

/** How a design sits inside its zone. Offsets are % of the zone box. */
export interface DesignTransform {
  offsetXPercent: number;
  offsetYPercent: number;
  scale: number;
  /** Clockwise rotation in degrees. */
  rotation: number;
}

export const DEFAULT_TRANSFORM: DesignTransform = {
  offsetXPercent: 0,
  offsetYPercent: 0,
  scale: 1,
  rotation: 0
};

export const SCALE_MIN = 0.05;
export const SCALE_MAX = 5;
/** How far outside its zone a design may be dragged, in % of the zone. */
export const OFFSET_LIMIT = 100;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Normalize an angle into [0, 360). */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

/** Force a transform into the allowed ranges. Always safe to call. */
export function clampTransform(t: Partial<DesignTransform>): DesignTransform {
  return {
    offsetXPercent: clamp(t.offsetXPercent ?? 0, -OFFSET_LIMIT, OFFSET_LIMIT),
    offsetYPercent: clamp(t.offsetYPercent ?? 0, -OFFSET_LIMIT, OFFSET_LIMIT),
    scale: clamp(t.scale ?? 1, SCALE_MIN, SCALE_MAX),
    rotation: normalizeRotation(t.rotation ?? 0)
  };
}

/** Snap to the nearest increment when within `tolerance` of it. */
export function snapRotation(degrees: number, increment = 45, tolerance = 4): number {
  const normalized = normalizeRotation(degrees);
  const nearest = Math.round(normalized / increment) * increment;
  return Math.abs(normalized - nearest) <= tolerance ? normalizeRotation(nearest) : normalized;
}

/**
 * Axis-aligned bounding box of a rotated rectangle, as a multiple of the
 * unrotated size. A square rotated 45° needs ~1.414x the room.
 */
export function rotatedBounds(
  width: number,
  height: number,
  rotationDegrees: number
): { width: number; height: number } {
  const rad = (normalizeRotation(rotationDegrees) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos
  };
}

/**
 * Scale at which the design exactly fits inside the zone, accounting for
 * rotation. Used by "fit to zone".
 */
export function fitScale(imageWidth: number, imageHeight: number, rotationDegrees = 0): number {
  if (!(imageWidth > 0) || !(imageHeight > 0)) return 1;
  const aspect = imageWidth / imageHeight;
  // Work in zone-relative units: the design spans the zone width at scale 1.
  const bounds = rotatedBounds(1, 1 / aspect, rotationDegrees);
  const limiting = Math.max(bounds.width, bounds.height);
  return limiting > 0 ? clamp(1 / limiting, SCALE_MIN, SCALE_MAX) : 1;
}

/** Move by a delta, clamped. Used by drag and by keyboard nudging. */
export function nudge(t: DesignTransform, dxPercent: number, dyPercent: number): DesignTransform {
  return clampTransform({
    ...t,
    offsetXPercent: t.offsetXPercent + dxPercent,
    offsetYPercent: t.offsetYPercent + dyPercent
  });
}

/** Multiply the scale (zoom in/out by a factor), clamped. */
export function zoomBy(t: DesignTransform, factor: number): DesignTransform {
  return clampTransform({ ...t, scale: t.scale * factor });
}

/** Rotate by a delta, normalized. */
export function rotateBy(t: DesignTransform, deltaDegrees: number): DesignTransform {
  return clampTransform({ ...t, rotation: t.rotation + deltaDegrees });
}

/** True when two transforms are equal to within floating-point noise. */
export function transformsEqual(a: DesignTransform, b: DesignTransform): boolean {
  const near = (x: number, y: number): boolean => Math.abs(x - y) < 1e-6;
  return (
    near(a.offsetXPercent, b.offsetXPercent) &&
    near(a.offsetYPercent, b.offsetYPercent) &&
    near(a.scale, b.scale) &&
    near(a.rotation, b.rotation)
  );
}

/**
 * Bounded undo/redo history.
 *
 * Immutable: every operation returns a new history, so it drops straight into
 * Svelte's reactivity without mutation surprises. Pushing after an undo
 * discards the redo branch, which is what users expect from an editor.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  limit: number;
}

export function createHistory<T>(present: T, limit = 50): History<T> {
  return { past: [], present, future: [], limit };
}

export function pushHistory<T>(history: History<T>, next: T): History<T> {
  const past = [...history.past, history.present];
  // Bound memory: drop the oldest entries beyond the limit.
  const trimmed = past.length > history.limit ? past.slice(past.length - history.limit) : past;
  return { ...history, past: trimmed, present: next, future: [] };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;
  const previous = history.past[history.past.length - 1];
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;
  const [next, ...rest] = history.future;
  return {
    ...history,
    past: [...history.past, history.present],
    present: next,
    future: rest
  };
}
