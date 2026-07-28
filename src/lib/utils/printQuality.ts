/**
 * Print-quality maths for the customer design tools.
 *
 * The customizer places an uploaded image inside a zone and scales it. What
 * matters for print is not the on-screen size but the *effective DPI*: how many
 * of the upload's real pixels land on each printed inch. That depends only on
 * the upload's pixel dimensions and the physical size it ends up covering.
 *
 * Pure module — no DOM, no stores — so it can be unit-tested and reused by the
 * print-file builder later.
 */

/** Physical geometry of a print area, as carried by `template_print_areas`. */
export interface PrintGeometry {
  /** Physical width of the print area. */
  physWidth: number;
  /** Physical height of the print area. */
  physHeight: number;
  /** Unit the physical dimensions are expressed in. */
  unit: string;
  /** DPI the provider requires for an acceptable print. */
  requiredDpi: number;
}

export type PrintQualityRating = 'excellent' | 'good' | 'low' | 'unusable';

export interface PrintQuality {
  /** Effective dots-per-inch at the current scale. */
  dpi: number;
  rating: PrintQualityRating;
  /** True when at or above the print area's required DPI. */
  meetsRequirement: boolean;
  /** Largest scale that still meets `requiredDpi`, or null if it never does. */
  maxScaleAtRequiredDpi: number | null;
  /** Short human-readable summary. */
  message: string;
}

const CM_PER_INCH = 2.54;
const MM_PER_INCH = 25.4;

/** Convert a physical length to inches. Unknown units are treated as inches. */
export function toInches(value: number, unit: string): number {
  switch ((unit || 'in').toLowerCase()) {
    case 'cm':
      return value / CM_PER_INCH;
    case 'mm':
      return value / MM_PER_INCH;
    default:
      return value;
  }
}

/**
 * Effective DPI for an upload covering `scale` of a print area's width.
 *
 * `scale` is the customizer's own factor: 1 means the design spans the full
 * width of the area, 2 means twice that (so half the DPI).
 */
export function effectiveDpi(pixelWidth: number, geometry: PrintGeometry, scale: number): number {
  const inches = toInches(geometry.physWidth, geometry.unit) * scale;
  if (!(inches > 0) || !(pixelWidth > 0)) return 0;
  return pixelWidth / inches;
}

/**
 * Rate an upload against a print area.
 *
 * Thresholds are expressed relative to the area's own `requiredDpi` rather than
 * absolute numbers, because a mug (300 DPI) and a hoodie (150 DPI) have very
 * different bars for the same artwork.
 */
export function assessPrintQuality(
  pixelWidth: number,
  pixelHeight: number,
  geometry: PrintGeometry,
  scale: number
): PrintQuality {
  const required = geometry.requiredDpi > 0 ? geometry.requiredDpi : 150;

  // Rate on the weaker of the two axes: a wide, short image can satisfy the
  // width test while still being too coarse vertically.
  const widthDpi = effectiveDpi(pixelWidth, geometry, scale);
  const heightGeometry: PrintGeometry = { ...geometry, physWidth: geometry.physHeight };
  const heightDpi = effectiveDpi(pixelHeight, heightGeometry, scale);
  const dpi = Math.min(widthDpi, heightDpi);

  const ratio = dpi / required;
  let rating: PrintQualityRating;
  if (ratio >= 1.5) rating = 'excellent';
  else if (ratio >= 1) rating = 'good';
  else if (ratio >= 0.6) rating = 'low';
  else rating = 'unusable';

  // The scale at which the weaker axis exactly hits the required DPI.
  const limitingPixels = widthDpi <= heightDpi ? pixelWidth : pixelHeight;
  const limitingInches = toInches(
    widthDpi <= heightDpi ? geometry.physWidth : geometry.physHeight,
    geometry.unit
  );
  const maxScaleAtRequiredDpi =
    limitingInches > 0 && required > 0 ? limitingPixels / (limitingInches * required) : null;

  const messages: Record<PrintQualityRating, string> = {
    excellent: 'Excellent print quality',
    good: 'Good print quality',
    low: 'Low resolution — may look soft when printed',
    unusable: 'Too low resolution to print well at this size'
  };

  return {
    dpi: Math.round(dpi),
    rating,
    meetsRequirement: dpi >= required,
    maxScaleAtRequiredDpi:
      maxScaleAtRequiredDpi && Number.isFinite(maxScaleAtRequiredDpi)
        ? Math.round(maxScaleAtRequiredDpi * 100) / 100
        : null,
    message: messages[rating]
  };
}

/**
 * Pixel dimensions an upload needs to fill a print area at its required DPI.
 * Used to tell customers what to supply *before* they pick a file.
 */
export function recommendedPixels(geometry: PrintGeometry): { width: number; height: number } {
  const dpi = geometry.requiredDpi > 0 ? geometry.requiredDpi : 150;
  return {
    width: Math.ceil(toInches(geometry.physWidth, geometry.unit) * dpi),
    height: Math.ceil(toInches(geometry.physHeight, geometry.unit) * dpi)
  };
}

/** Human-readable physical size, e.g. `40 × 30 in`. */
export function formatPhysicalSize(geometry: PrintGeometry): string {
  const trim = (n: number): string => String(Math.round(n * 100) / 100);
  return `${trim(geometry.physWidth)} × ${trim(geometry.physHeight)} ${geometry.unit}`;
}
