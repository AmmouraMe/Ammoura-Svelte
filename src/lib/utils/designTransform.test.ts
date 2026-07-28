import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRANSFORM,
  SCALE_MIN,
  SCALE_MAX,
  OFFSET_LIMIT,
  normalizeRotation,
  clampTransform,
  snapRotation,
  rotatedBounds,
  fitScale,
  nudge,
  zoomBy,
  rotateBy,
  transformsEqual,
  createHistory,
  pushHistory,
  canUndo,
  canRedo,
  undo,
  redo,
  type DesignTransform
} from './designTransform';

describe('normalizeRotation', () => {
  it('wraps into [0, 360)', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(-450)).toBe(270);
  });

  it('treats non-finite input as 0', () => {
    expect(normalizeRotation(NaN)).toBe(0);
    expect(normalizeRotation(Infinity)).toBe(0);
  });
});

describe('clampTransform', () => {
  it('bounds scale to the allowed range', () => {
    expect(clampTransform({ scale: 99 }).scale).toBe(SCALE_MAX);
    expect(clampTransform({ scale: 0 }).scale).toBe(SCALE_MIN);
  });

  it('bounds offsets so a design cannot be lost off-canvas', () => {
    expect(clampTransform({ offsetXPercent: 5000 }).offsetXPercent).toBe(OFFSET_LIMIT);
    expect(clampTransform({ offsetYPercent: -5000 }).offsetYPercent).toBe(-OFFSET_LIMIT);
  });

  it('fills defaults for missing fields', () => {
    expect(clampTransform({})).toEqual(DEFAULT_TRANSFORM);
  });

  it('survives NaN without producing NaN', () => {
    const t = clampTransform({ scale: NaN, offsetXPercent: NaN, rotation: NaN });
    expect(Number.isNaN(t.scale)).toBe(false);
    expect(Number.isNaN(t.offsetXPercent)).toBe(false);
    expect(t.rotation).toBe(0);
  });
});

describe('snapRotation', () => {
  it('snaps when close to an increment', () => {
    expect(snapRotation(2)).toBe(0);
    expect(snapRotation(88)).toBe(90);
    expect(snapRotation(316)).toBe(315);
  });

  it('leaves deliberate angles alone', () => {
    expect(snapRotation(20)).toBe(20);
    expect(snapRotation(70)).toBe(70);
  });

  it('snaps 358 up to 0 rather than to 360', () => {
    expect(snapRotation(358)).toBe(0);
  });
});

describe('rotatedBounds', () => {
  it('is unchanged at 0 degrees', () => {
    expect(rotatedBounds(2, 1, 0)).toEqual({ width: 2, height: 1 });
  });

  it('swaps axes at 90 degrees', () => {
    const b = rotatedBounds(2, 1, 90);
    expect(b.width).toBeCloseTo(1);
    expect(b.height).toBeCloseTo(2);
  });

  it('needs ~1.414x for a square at 45 degrees', () => {
    const b = rotatedBounds(1, 1, 45);
    expect(b.width).toBeCloseTo(Math.SQRT2);
    expect(b.height).toBeCloseTo(Math.SQRT2);
  });
});

describe('fitScale', () => {
  it('fits a square exactly at scale 1', () => {
    expect(fitScale(1000, 1000, 0)).toBeCloseTo(1);
  });

  it('shrinks a tall image so its height fits', () => {
    // 1:2 portrait — height is the limiting axis.
    expect(fitScale(500, 1000, 0)).toBeCloseTo(0.5);
  });

  it('accounts for rotation needing more room', () => {
    expect(fitScale(1000, 1000, 45)).toBeCloseTo(1 / Math.SQRT2, 3);
  });

  it('is safe for degenerate dimensions', () => {
    expect(fitScale(0, 0, 0)).toBe(1);
  });
});

describe('nudge / zoomBy / rotateBy', () => {
  const base: DesignTransform = { ...DEFAULT_TRANSFORM };

  it('moves by a delta', () => {
    expect(nudge(base, 5, -3)).toMatchObject({ offsetXPercent: 5, offsetYPercent: -3 });
  });

  it('clamps a nudge at the boundary', () => {
    const atEdge = { ...base, offsetXPercent: OFFSET_LIMIT };
    expect(nudge(atEdge, 10, 0).offsetXPercent).toBe(OFFSET_LIMIT);
  });

  it('zooms multiplicatively and clamps', () => {
    expect(zoomBy(base, 2).scale).toBe(2);
    expect(zoomBy(base, 1000).scale).toBe(SCALE_MAX);
    expect(zoomBy(base, 0.0001).scale).toBe(SCALE_MIN);
  });

  it('rotates and wraps', () => {
    expect(rotateBy(base, 90).rotation).toBe(90);
    expect(rotateBy({ ...base, rotation: 350 }, 20).rotation).toBe(10);
  });
});

describe('transformsEqual', () => {
  it('ignores floating-point noise', () => {
    const a = { ...DEFAULT_TRANSFORM };
    const b = { ...DEFAULT_TRANSFORM, scale: 1 + 1e-12 };
    expect(transformsEqual(a, b)).toBe(true);
  });

  it('detects a real change', () => {
    expect(transformsEqual(DEFAULT_TRANSFORM, { ...DEFAULT_TRANSFORM, rotation: 1 })).toBe(false);
  });
});

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory('a');
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe('a');
  });

  it('undoes and redoes across several steps', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(h.present).toBe('c');

    h = undo(h);
    expect(h.present).toBe('b');
    h = undo(h);
    expect(h.present).toBe('a');
    expect(canUndo(h)).toBe(false);

    h = redo(h);
    expect(h.present).toBe('b');
    h = redo(h);
    expect(h.present).toBe('c');
    expect(canRedo(h)).toBe(false);
  });

  it('is a no-op at the ends rather than throwing', () => {
    const h = createHistory('a');
    expect(undo(h)).toEqual(h);
    expect(redo(h)).toEqual(h);
  });

  it('discards the redo branch after a new edit', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = undo(h);
    expect(canRedo(h)).toBe(true);
    h = pushHistory(h, 'c');
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe('c');
  });

  it('bounds memory at the configured limit', () => {
    let h = createHistory(0, 3);
    for (let i = 1; i <= 10; i++) h = pushHistory(h, i);
    expect(h.past.length).toBe(3);
    expect(h.present).toBe(10);
    // Oldest entries were dropped, newest retained.
    expect(h.past).toEqual([7, 8, 9]);
  });

  it('does not mutate the input history', () => {
    const h = createHistory('a');
    const after = pushHistory(h, 'b');
    expect(h.present).toBe('a');
    expect(h.past).toEqual([]);
    expect(after.present).toBe('b');
  });
});
