/**
 * The measuring half of the customer design tools.
 *
 * The obvious way to build a product customizer keeps positions in screen
 * pixels or in percentages of whatever box the preview happened to be, and
 * exports whatever the preview canvas rendered. That produces a file a few
 * hundred pixels wide, far below what a press needs, and it does it silently —
 * the shirt arrives soft and blocky and nobody knows why.
 *
 * So the source of truth here is **inches on the product**. The preview scales
 * inches to screen pixels for display; the print-file builder scales the same
 * inches to the provider's required DPI. The preview can be any size on any
 * screen without touching what gets printed.
 *
 * A design is a *list* of elements — pictures and words — inside one print
 * area, not a single upload. Everything below is pure: no DOM, no stores, so
 * the rules that decide where a design sits can be tested directly and reused
 * by the server-side print-file builder, which has to reproduce the customer's
 * on-screen placement exactly.
 */

import type { PrintGeometry } from './printQuality.js';
import { toInches } from './printQuality.js';

/**
 * A print area in the units the design maths works in.
 *
 * `physical` is false for a zone that is only a box drawn on a product photo
 * with no print geometry behind it. Those still need to be placed, dragged and
 * nudged, so they get a nominal canvas in the same inch units and travel the
 * same code path — only the DPI advice is withheld, because there is no real
 * measurement to be honest about.
 */
export interface DesignArea {
  widthIn: number;
  heightIn: number;
  /** DPI the print process needs. 0 when unknown. */
  requiredDpi: number;
  /** True when `widthIn`/`heightIn` are real measurements of a print area. */
  physical: boolean;
}

/** The nominal width given to a zone with no print geometry behind it. */
export const NOMINAL_AREA_WIDTH_IN = 10;

/** The smallest an element may be shrunk to, in inches. */
export const MIN_ELEMENT_WIDTH_IN = 0.25;

/**
 * Where something sits inside the print area, in inches from its top-left.
 * Inches rather than pixels so the same numbers drive the preview, the cart,
 * the order record and the production sheet.
 */
export interface Placement {
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
  /** Degrees clockwise, about the element's own centre. */
  rotation: number;
}

interface ElementBase {
  id: string;
  place: Placement;
  /** Mirrored horizontally. A flag, so the source file is never rewritten. */
  flipped?: boolean;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  /** Directly-renderable source — the R2-backed `/api/media/...` URL. */
  src: string;
  /** `media_library` id of the full-resolution original. */
  mediaId: string | null;
  name: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  /** Hex ink colour, `#rrggbb`. */
  color: string;
  /** Font stack, so the print file can match what the preview showed. */
  font: string;
}

export type DesignElement = ImageElement | TextElement;

function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * The design area behind a customization zone.
 *
 * A zone linked to a template print area is measured from that; an unlinked one
 * gets `NOMINAL_AREA_WIDTH_IN` across, shaped by the zone box's own aspect so
 * dragging feels right, and marked non-physical.
 */
export function areaFromGeometry(geometry: PrintGeometry | null, zoneAspect = 1): DesignArea {
  if (geometry) {
    return {
      widthIn: toInches(geometry.physWidth, geometry.unit),
      heightIn: toInches(geometry.physHeight, geometry.unit),
      requiredDpi: geometry.requiredDpi,
      physical: true
    };
  }
  const ratio = zoneAspect > 0 ? zoneAspect : 1;
  return {
    widthIn: NOMINAL_AREA_WIDTH_IN,
    heightIn: NOMINAL_AREA_WIDTH_IN / ratio,
    requiredDpi: 0,
    physical: false
  };
}

/**
 * Keep a placement inside the print area.
 *
 * Oversized artwork is scaled down proportionally rather than having its width
 * and height capped separately. Capping them independently squashes the design
 * — a stretched logo is a worse answer than a smaller one, and nobody asked for
 * it to be distorted.
 */
export function clampToArea(place: Placement, area: DesignArea): Placement {
  const fit = Math.min(
    1,
    place.widthIn > 0 ? area.widthIn / place.widthIn : 1,
    place.heightIn > 0 ? area.heightIn / place.heightIn : 1
  );
  const widthIn = round(place.widthIn * fit);
  const heightIn = round(place.heightIn * fit);
  return {
    ...place,
    widthIn,
    heightIn,
    xIn: round(clamp(place.xIn, 0, Math.max(0, area.widthIn - widthIn))),
    yIn: round(clamp(place.yIn, 0, Math.max(0, area.heightIn - heightIn))),
    rotation: normalizeRotation(place.rotation)
  };
}

/** Normalize an angle into [0, 360). */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

/** Fit inside the area while keeping the source's aspect ratio. */
export function fitWithin(
  naturalWidth: number,
  naturalHeight: number,
  area: DesignArea,
  coverage = 0.6
): { widthIn: number; heightIn: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { widthIn: area.widthIn * coverage, heightIn: area.heightIn * coverage };
  }
  const ratio = naturalHeight / naturalWidth;
  let widthIn = area.widthIn * coverage;
  let heightIn = widthIn * ratio;
  if (heightIn > area.heightIn * coverage) {
    heightIn = area.heightIn * coverage;
    widthIn = heightIn / ratio;
  }
  return { widthIn: round(widthIn), heightIn: round(heightIn) };
}

/**
 * A newly added image, sized to sit comfortably inside the area rather than
 * filling it — most people shrink a design, so starting slightly small means
 * fewer of them ever meet the "this file is too small" warning at all.
 */
export function placeNewImage(
  naturalWidth: number,
  naturalHeight: number,
  area: DesignArea
): Placement {
  const { widthIn, heightIn } = fitWithin(naturalWidth, naturalHeight, area, 0.6);
  return clampToArea(
    {
      widthIn,
      heightIn,
      xIn: (area.widthIn - widthIn) / 2,
      yIn: (area.heightIn - heightIn) / 2,
      rotation: 0
    },
    area
  );
}

/** A new line of text, sized as a fraction of the area's width. */
export function placeNewText(area: DesignArea, aspect = 0.28): Placement {
  const widthIn = area.widthIn * 0.7;
  const heightIn = widthIn * aspect;
  return clampToArea(
    {
      widthIn,
      heightIn,
      xIn: (area.widthIn - widthIn) / 2,
      yIn: (area.heightIn - heightIn) / 2,
      rotation: 0
    },
    area
  );
}

/**
 * Step each new item down and across so it does not land exactly on top of the
 * last one.
 *
 * Everything is centred when added, which means adding three lines of text
 * would otherwise produce one illegible pile. The offset wraps rather than
 * marching off the edge, and clamping keeps it on the product either way.
 */
export function cascade(
  place: Placement,
  index: number,
  area: DesignArea,
  stepIn = 0.5
): Placement {
  if (index <= 0) return place;
  const n = ((index - 1) % 4) + 1;
  return clampToArea({ ...place, xIn: place.xIn + n * stepIn, yIn: place.yIn + n * stepIn }, area);
}

/** Sequential rather than random, so a design is reproducible and testable. */
export function nextId(existing: DesignElement[], prefix = 'el'): string {
  let n = existing.length + 1;
  const taken = new Set(existing.map((e) => e.id));
  while (taken.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

/**
 * A pointer movement in screen pixels, in inches on the product.
 *
 * The preview is whatever size the screen allows, so this ratio is the only
 * place the two coordinate systems meet. Everything stored stays in inches.
 */
export function pointerDeltaToInches(
  dxPx: number,
  dyPx: number,
  previewWidthPx: number,
  area: DesignArea
): { dxIn: number; dyIn: number } {
  if (previewWidthPx <= 0) return { dxIn: 0, dyIn: 0 };
  const perPx = area.widthIn / previewWidthPx;
  return { dxIn: dxPx * perPx, dyIn: dyPx * perPx };
}

export function moveBy(place: Placement, dxIn: number, dyIn: number, area: DesignArea): Placement {
  return clampToArea({ ...place, xIn: place.xIn + dxIn, yIn: place.yIn + dyIn }, area);
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Keyboard nudge, so the studio is usable without a pointer at all. */
export function nudgeBy(
  place: Placement,
  direction: Direction,
  stepIn: number,
  area: DesignArea
): Placement {
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  return moveBy(place, d[0] * stepIn, d[1] * stepIn, area);
}

/** Resize from the width, keeping the aspect ratio and the centre. */
export function resizeToWidth(place: Placement, widthIn: number, area: DesignArea): Placement {
  const ratio = place.widthIn > 0 ? place.heightIn / place.widthIn : 1;
  const w = Math.max(MIN_ELEMENT_WIDTH_IN, widthIn);
  const h = w * ratio;
  return clampToArea(
    {
      ...place,
      widthIn: w,
      heightIn: h,
      xIn: place.xIn + (place.widthIn - w) / 2,
      yIn: place.yIn + (place.heightIn - h) / 2
    },
    area
  );
}

/** Scale about the centre, so resizing does not walk the design across the product. */
export function scalePlacement(place: Placement, factor: number, area: DesignArea): Placement {
  return resizeToWidth(place, place.widthIn * factor, area);
}

/** Centre on both axes — what "Centre" means to somebody placing a chest print. */
export function centerIn(place: Placement, area: DesignArea): Placement {
  return clampToArea(
    {
      ...place,
      xIn: (area.widthIn - place.widthIn) / 2,
      yIn: (area.heightIn - place.heightIn) / 2
    },
    area
  );
}

/** Centre horizontally only, keeping the height somebody chose deliberately. */
export function centerHorizontally(place: Placement, area: DesignArea): Placement {
  return clampToArea({ ...place, xIn: (area.widthIn - place.widthIn) / 2 }, area);
}

/** Grow to fill the area while keeping the aspect ratio, then centre. */
export function fitToArea(place: Placement, area: DesignArea): Placement {
  const ratio = place.widthIn > 0 ? place.heightIn / place.widthIn : 1;
  let widthIn = area.widthIn;
  let heightIn = widthIn * ratio;
  if (heightIn > area.heightIn) {
    heightIn = area.heightIn;
    widthIn = ratio > 0 ? heightIn / ratio : area.widthIn;
  }
  return centerIn({ ...place, widthIn: round(widthIn), heightIn: round(heightIn) }, area);
}

/** Move an element within the stacking order. Returns a new array. */
export function reorder(
  elements: DesignElement[],
  id: string,
  direction: 'forward' | 'back'
): DesignElement[] {
  const i = elements.findIndex((e) => e.id === id);
  if (i < 0) return elements;
  const j = direction === 'forward' ? i + 1 : i - 1;
  if (j < 0 || j >= elements.length) return elements;
  const out = [...elements];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function removeElement(elements: DesignElement[], id: string): DesignElement[] {
  return elements.filter((e) => e.id !== id);
}

/**
 * Copy an element, offset so the copy is visibly its own thing.
 *
 * Returns the new list and the new id, because the caller almost always wants
 * to select what it just made.
 */
export function duplicateElement(
  elements: DesignElement[],
  id: string,
  area: DesignArea
): { elements: DesignElement[]; id: string | null } {
  const source = elements.find((e) => e.id === id);
  if (!source) return { elements, id: null };
  const copy: DesignElement = {
    ...source,
    id: nextId(elements),
    place: cascade(source.place, 1, area)
  };
  return { elements: [...elements, copy], id: copy.id };
}

/**
 * Mirror an element horizontally.
 *
 * Stored as a flag rather than baked into the artwork, so the print file and
 * the production sheet can both describe it and the original is never altered.
 */
export function flipElement(elements: DesignElement[], id: string): DesignElement[] {
  return elements.map((e) => (e.id === id ? { ...e, flipped: !e.flipped } : e));
}

/**
 * Carry a placement across a change of print area, keeping its proportions.
 *
 * A shopper who switches from a tee to a hoodie, or from front to sleeve, has
 * not asked for their design to jump to a corner. Positions and sizes move as
 * fractions of the area rather than as absolute inches.
 */
export function rescalePlacement(place: Placement, from: DesignArea, to: DesignArea): Placement {
  if (from.widthIn <= 0 || from.heightIn <= 0) return clampToArea(place, to);
  const kx = to.widthIn / from.widthIn;
  const ky = to.heightIn / from.heightIn;
  const k = Math.min(kx, ky);
  return clampToArea(
    {
      ...place,
      xIn: place.xIn * kx,
      yIn: place.yIn * ky,
      widthIn: place.widthIn * k,
      heightIn: place.heightIn * k
    },
    to
  );
}

/** Where an element sits as a percentage of the print area, for CSS. */
export interface PlacementBox {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

/**
 * A placement as percentages of the area box.
 *
 * The only conversion the preview needs: inches are authoritative, and the DOM
 * is told about them in the one unit that survives a responsive layout.
 */
export function placementBox(place: Placement, area: DesignArea): PlacementBox {
  const w = area.widthIn > 0 ? area.widthIn : 1;
  const h = area.heightIn > 0 ? area.heightIn : 1;
  return {
    leftPercent: round((place.xIn / w) * 100, 4),
    topPercent: round((place.yIn / h) * 100, 4),
    widthPercent: round((place.widthIn / w) * 100, 4),
    heightPercent: round((place.heightIn / h) * 100, 4)
  };
}

/**
 * The size on screen, in pixels, an element's text should be rendered at.
 *
 * Text is stored as a box in inches like everything else; the preview needs to
 * know how tall that box is in the pixels it currently occupies.
 */
export function textPixelHeight(
  place: Placement,
  area: DesignArea,
  previewHeightPx: number
): number {
  if (area.heightIn <= 0) return 0;
  return (place.heightIn / area.heightIn) * previewHeightPx;
}

/**
 * The height a line of text needs, from measured letter metrics.
 *
 * Text is stored as a box in inches like everything else, but unlike a picture
 * its proportions are not known until the face has loaded and the string has
 * been measured: a script runs a third wider than a condensed sans at the same
 * size. The caller measures the *ink* — the rectangle the printer actually
 * fills, not the em square, which is taller than the letters — and passes both
 * sides back, so the stored box is exactly what will be printed.
 */
export function textHeightIn(widthIn: number, inkWidthPx: number, inkHeightPx: number): number {
  const aspect = inkHeightPx > 0 ? inkWidthPx / inkHeightPx : 1;
  return round(widthIn / Math.max(aspect, 0.01));
}

// --- Legacy bridge -------------------------------------------------------
//
// Designs placed before this model existed are one image per zone, described by
// an offset in percent of the zone box plus a scale factor against a
// `object-fit: contain` render. Both directions are needed: to read an old cart
// or order back into the studio, and to keep writing the first image element to
// the original order columns so nothing downstream has to change at once.

/** How an old single-upload design was described. */
export interface LegacyTransform {
  offsetXPercent: number;
  offsetYPercent: number;
  scale: number;
  rotation: number;
}

/** The size a `contain`-fitted image takes in the area, before any scaling. */
function containedSize(
  naturalWidth: number,
  naturalHeight: number,
  area: DesignArea
): { widthIn: number; heightIn: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { widthIn: area.widthIn, heightIn: area.heightIn };
  }
  const ratio = naturalHeight / naturalWidth;
  let widthIn = area.widthIn;
  let heightIn = widthIn * ratio;
  if (heightIn > area.heightIn) {
    heightIn = area.heightIn;
    widthIn = heightIn / ratio;
  }
  return { widthIn, heightIn };
}

export function legacyToPlacement(
  t: LegacyTransform,
  naturalWidth: number,
  naturalHeight: number,
  area: DesignArea
): Placement {
  const contained = containedSize(naturalWidth, naturalHeight, area);
  const widthIn = contained.widthIn * (t.scale || 1);
  const heightIn = contained.heightIn * (t.scale || 1);
  const centreX = area.widthIn * (0.5 + (t.offsetXPercent || 0) / 100);
  const centreY = area.heightIn * (0.5 + (t.offsetYPercent || 0) / 100);
  return clampToArea(
    {
      widthIn,
      heightIn,
      xIn: centreX - widthIn / 2,
      yIn: centreY - heightIn / 2,
      rotation: t.rotation || 0
    },
    area
  );
}

export function placementToLegacy(
  place: Placement,
  naturalWidth: number,
  naturalHeight: number,
  area: DesignArea
): LegacyTransform {
  const contained = containedSize(naturalWidth, naturalHeight, area);
  const scale = contained.widthIn > 0 ? place.widthIn / contained.widthIn : 1;
  const centreX = place.xIn + place.widthIn / 2;
  const centreY = place.yIn + place.heightIn / 2;
  return {
    offsetXPercent: round((centreX / (area.widthIn || 1) - 0.5) * 100, 2),
    offsetYPercent: round((centreY / (area.heightIn || 1) - 0.5) * 100, 2),
    scale: round(scale, 4),
    rotation: normalizeRotation(place.rotation)
  };
}
