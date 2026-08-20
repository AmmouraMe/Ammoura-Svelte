import { describe, it, expect } from 'vitest';
import {
  areaFromGeometry,
  cascade,
  centerHorizontally,
  centerIn,
  clampToArea,
  duplicateElement,
  fitToArea,
  fitWithin,
  flipElement,
  legacyToPlacement,
  moveBy,
  nextId,
  nudgeBy,
  placeNewImage,
  placeNewText,
  placementBox,
  placementToLegacy,
  pointerDeltaToInches,
  removeElement,
  reorder,
  rescalePlacement,
  resizeToWidth,
  scalePlacement,
  textHeightIn,
  textPixelHeight,
  NOMINAL_AREA_WIDTH_IN,
  type DesignArea,
  type DesignElement,
  type Placement
} from './designElements';

const AREA: DesignArea = { widthIn: 12, heightIn: 16, requiredDpi: 150, physical: true };

function place(over: Partial<Placement> = {}): Placement {
  return { xIn: 1, yIn: 1, widthIn: 4, heightIn: 4, rotation: 0, ...over };
}

function image(id: string, over: Partial<Placement> = {}): DesignElement {
  return {
    kind: 'image',
    id,
    src: `/api/media/${id}`,
    mediaId: id,
    name: `${id}.png`,
    naturalWidth: 2000,
    naturalHeight: 2000,
    place: place(over)
  };
}

describe('areaFromGeometry', () => {
  it('measures a linked print area in inches', () => {
    const area = areaFromGeometry({
      physWidth: 30.48,
      physHeight: 40.64,
      unit: 'cm',
      requiredDpi: 150
    });
    expect(area.widthIn).toBeCloseTo(12, 4);
    expect(area.heightIn).toBeCloseTo(16, 4);
    expect(area.physical).toBe(true);
  });

  it('gives an unlinked zone a nominal canvas shaped by its box', () => {
    const area = areaFromGeometry(null, 2);
    expect(area.widthIn).toBe(NOMINAL_AREA_WIDTH_IN);
    expect(area.heightIn).toBe(NOMINAL_AREA_WIDTH_IN / 2);
    expect(area.physical).toBe(false);
    expect(area.requiredDpi).toBe(0);
  });
});

describe('clampToArea', () => {
  it('keeps a placement inside the area', () => {
    const out = clampToArea(place({ xIn: 20, yIn: -5 }), AREA);
    expect(out.xIn).toBe(8);
    expect(out.yIn).toBe(0);
  });

  it('shrinks oversized artwork proportionally rather than squashing it', () => {
    const out = clampToArea(place({ widthIn: 24, heightIn: 12 }), AREA);
    expect(out.widthIn).toBe(12);
    expect(out.heightIn).toBe(6);
    expect(out.widthIn / out.heightIn).toBeCloseTo(2, 5);
  });

  it('normalizes rotation', () => {
    expect(clampToArea(place({ rotation: -90 }), AREA).rotation).toBe(270);
  });
});

describe('placeNewImage', () => {
  it('starts comfortably inside the area, centred', () => {
    const p = placeNewImage(1000, 1000, AREA);
    expect(p.widthIn).toBeCloseTo(7.2, 3);
    expect(p.xIn).toBeCloseTo((12 - 7.2) / 2, 3);
    expect(p.yIn).toBeCloseTo((16 - 7.2) / 2, 3);
  });

  it('keeps the source aspect ratio', () => {
    const p = placeNewImage(2000, 1000, AREA);
    expect(p.widthIn / p.heightIn).toBeCloseTo(2, 4);
  });
});

describe('placeNewText', () => {
  it('spans most of the area width', () => {
    const p = placeNewText(AREA);
    expect(p.widthIn).toBeCloseTo(8.4, 3);
    expect(p.xIn).toBeCloseTo(1.8, 3);
  });
});

describe('cascade', () => {
  it('leaves the first item alone', () => {
    const p = place();
    expect(cascade(p, 0, AREA)).toEqual(p);
  });

  it('steps later items down and across, wrapping every four', () => {
    const p = place();
    expect(cascade(p, 1, AREA).xIn).toBeCloseTo(1.5, 4);
    expect(cascade(p, 4, AREA).xIn).toBeCloseTo(3, 4);
    expect(cascade(p, 5, AREA).xIn).toBeCloseTo(1.5, 4);
  });
});

describe('nextId', () => {
  it('is sequential and skips ids already taken', () => {
    expect(nextId([])).toBe('el-1');
    expect(nextId([image('el-1')])).toBe('el-2');
    expect(nextId([image('el-2'), image('el-3')])).toBe('el-4');
  });
});

describe('pointerDeltaToInches', () => {
  it('converts screen movement using the area width alone', () => {
    const { dxIn, dyIn } = pointerDeltaToInches(60, 30, 600, AREA);
    expect(dxIn).toBeCloseTo(1.2, 5);
    expect(dyIn).toBeCloseTo(0.6, 5);
  });

  it('is inert when the preview has no width yet', () => {
    expect(pointerDeltaToInches(60, 30, 0, AREA)).toEqual({ dxIn: 0, dyIn: 0 });
  });
});

describe('moveBy and nudgeBy', () => {
  it('moves in inches and stops at the edge', () => {
    expect(moveBy(place(), 100, 0, AREA).xIn).toBe(8);
  });

  it('nudges in the named direction', () => {
    expect(nudgeBy(place(), 'left', 0.25, AREA).xIn).toBeCloseTo(0.75, 4);
    expect(nudgeBy(place(), 'down', 0.25, AREA).yIn).toBeCloseTo(1.25, 4);
  });
});

describe('resizeToWidth', () => {
  it('keeps the aspect ratio and the centre', () => {
    const before = place({ xIn: 4, yIn: 4, widthIn: 4, heightIn: 2 });
    const after = resizeToWidth(before, 8, AREA);
    expect(after.heightIn).toBeCloseTo(4, 4);
    expect(after.xIn + after.widthIn / 2).toBeCloseTo(6, 4);
    expect(after.yIn + after.heightIn / 2).toBeCloseTo(5, 4);
  });

  it('will not shrink below the minimum', () => {
    expect(resizeToWidth(place(), 0.01, AREA).widthIn).toBeCloseTo(0.25, 4);
  });
});

describe('scalePlacement', () => {
  it('scales about the centre', () => {
    const before = place({ xIn: 4, yIn: 6, widthIn: 4, heightIn: 4 });
    const after = scalePlacement(before, 0.5, AREA);
    expect(after.widthIn).toBeCloseTo(2, 4);
    expect(after.xIn + after.widthIn / 2).toBeCloseTo(6, 4);
    expect(after.yIn + after.heightIn / 2).toBeCloseTo(8, 4);
  });
});

describe('centering and fitting', () => {
  it('centres on both axes', () => {
    const p = centerIn(place(), AREA);
    expect(p.xIn).toBeCloseTo(4, 4);
    expect(p.yIn).toBeCloseTo(6, 4);
  });

  it('centres horizontally without touching the vertical', () => {
    const p = centerHorizontally(place({ yIn: 9 }), AREA);
    expect(p.xIn).toBeCloseTo(4, 4);
    expect(p.yIn).toBeCloseTo(9, 4);
  });

  it('fits to the area on the limiting axis', () => {
    const p = fitToArea(place({ widthIn: 2, heightIn: 4 }), AREA);
    expect(p.heightIn).toBeCloseTo(16, 3);
    expect(p.widthIn).toBeCloseTo(8, 3);
    expect(p.yIn).toBeCloseTo(0, 3);
  });
});

describe('fitWithin', () => {
  it('falls back to plain coverage for an unmeasurable source', () => {
    expect(fitWithin(0, 0, AREA, 0.5)).toEqual({ widthIn: 6, heightIn: 8 });
  });
});

describe('stacking order', () => {
  const els = [image('a'), image('b'), image('c')];

  it('moves an element forward and back', () => {
    expect(reorder(els, 'a', 'forward').map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(reorder(els, 'c', 'back').map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the ends and for unknown ids', () => {
    expect(reorder(els, 'a', 'back')).toBe(els);
    expect(reorder(els, 'c', 'forward')).toBe(els);
    expect(reorder(els, 'zz', 'forward')).toBe(els);
  });
});

describe('removeElement', () => {
  it('drops only the named element', () => {
    expect(removeElement([image('a'), image('b')], 'a').map((e) => e.id)).toEqual(['b']);
  });
});

describe('duplicateElement', () => {
  it('copies with a new id, offset so the copy is visible', () => {
    const { elements, id } = duplicateElement([image('el-1')], 'el-1', AREA);
    expect(elements).toHaveLength(2);
    expect(id).toBe('el-2');
    expect(elements[1].place.xIn).toBeCloseTo(1.5, 4);
  });

  it('reports nothing copied for an unknown id', () => {
    const els = [image('el-1')];
    expect(duplicateElement(els, 'nope', AREA)).toEqual({ elements: els, id: null });
  });
});

describe('flipElement', () => {
  it('toggles a flag rather than rewriting the source', () => {
    const once = flipElement([image('a')], 'a');
    expect(once[0].flipped).toBe(true);
    expect(flipElement(once, 'a')[0].flipped).toBe(false);
    expect((once[0] as { src: string }).src).toBe('/api/media/a');
  });
});

describe('rescalePlacement', () => {
  const bigger: DesignArea = { widthIn: 24, heightIn: 32, requiredDpi: 150, physical: true };

  it('carries a design across a change of area by proportion', () => {
    const before = place({ xIn: 3, yIn: 4, widthIn: 6, heightIn: 8 });
    const after = rescalePlacement(before, AREA, bigger);
    expect(after.xIn).toBeCloseTo(6, 3);
    expect(after.yIn).toBeCloseTo(8, 3);
    expect(after.widthIn).toBeCloseTo(12, 3);
    expect(after.heightIn).toBeCloseTo(16, 3);
  });

  it('still lands inside a smaller area', () => {
    const small: DesignArea = { widthIn: 4, heightIn: 4, requiredDpi: 150, physical: true };
    const after = rescalePlacement(place({ widthIn: 10, heightIn: 10 }), AREA, small);
    expect(after.xIn + after.widthIn).toBeLessThanOrEqual(4.001);
    expect(after.yIn + after.heightIn).toBeLessThanOrEqual(4.001);
  });
});

describe('placementBox', () => {
  it('describes a placement as percentages of the area', () => {
    const box = placementBox(place({ xIn: 3, yIn: 4, widthIn: 6, heightIn: 8 }), AREA);
    expect(box.leftPercent).toBeCloseTo(25, 3);
    expect(box.topPercent).toBeCloseTo(25, 3);
    expect(box.widthPercent).toBeCloseTo(50, 3);
    expect(box.heightPercent).toBeCloseTo(50, 3);
  });
});

describe('textPixelHeight', () => {
  it('scales the stored inch height into the preview', () => {
    expect(textPixelHeight(place({ heightIn: 4 }), AREA, 800)).toBeCloseTo(200, 4);
  });
});

describe('textHeightIn', () => {
  it('shapes the box from the ink actually measured', () => {
    // Letters whose ink measured 120 x 100: 1.2:1, so a 6" box is 5" tall.
    expect(textHeightIn(6, 120, 100)).toBeCloseTo(5, 4);
    // A tall, narrow face gives a taller box for the same chosen width.
    expect(textHeightIn(6, 60, 100)).toBeCloseTo(10, 4);
  });

  it('does not divide by an unmeasurably narrow string', () => {
    expect(Number.isFinite(textHeightIn(6, 0, 100))).toBe(true);
    expect(Number.isFinite(textHeightIn(6, 120, 0))).toBe(true);
  });
});

describe('the legacy bridge', () => {
  it('reads a centred, unscaled upload as a contained placement', () => {
    const p = legacyToPlacement(
      { offsetXPercent: 0, offsetYPercent: 0, scale: 1, rotation: 0 },
      2000,
      2000,
      AREA
    );
    expect(p.widthIn).toBeCloseTo(12, 3);
    expect(p.heightIn).toBeCloseTo(12, 3);
    expect(p.xIn).toBeCloseTo(0, 3);
    expect(p.yIn).toBeCloseTo(2, 3);
  });

  it('round-trips a placement back to the old numbers', () => {
    const original = { offsetXPercent: 10, offsetYPercent: -5, scale: 0.5, rotation: 45 };
    const p = legacyToPlacement(original, 2000, 1000, AREA);
    const back = placementToLegacy(p, 2000, 1000, AREA);
    expect(back.offsetXPercent).toBeCloseTo(10, 1);
    expect(back.offsetYPercent).toBeCloseTo(-5, 1);
    expect(back.scale).toBeCloseTo(0.5, 2);
    expect(back.rotation).toBe(45);
  });
});
