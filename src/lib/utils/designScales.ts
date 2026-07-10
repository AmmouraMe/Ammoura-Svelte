/**
 * designScales — the spacing/radius token scales for builder pickers (F2).
 *
 * These mirror the px values of the `--space-*` / `--radius-*` custom properties
 * in src/lib/styles/tokens.css. The builder stores spacing/radius as plain
 * numbers (the frontend renders them as `${n}px`), so rather than store token
 * references we let editors snap values to the design scale — tokens become the
 * default quick-pick while any raw number stays possible. Kept in sync with
 * tokens.css by designScales.test.ts.
 */

export interface ScaleStep {
  /** Short label shown on the picker button. */
  label: string;
  /** The px value written to the config. */
  value: number;
  /** The design token this step corresponds to (for the tooltip). */
  token: string;
}

/** Spacing scale — a practical subset of --space-1 … --space-9 (4px → 64px). */
export const SPACE_SCALE: ScaleStep[] = [
  { label: '0', value: 0, token: '0' },
  { label: '4', value: 4, token: '--space-1' },
  { label: '8', value: 8, token: '--space-2' },
  { label: '12', value: 12, token: '--space-3' },
  { label: '16', value: 16, token: '--space-4' },
  { label: '24', value: 24, token: '--space-5' },
  { label: '32', value: 32, token: '--space-6' },
  { label: '48', value: 48, token: '--space-8' },
  { label: '64', value: 64, token: '--space-9' }
];

/** Radius scale — mirrors --radius-sm/md/lg/full plus a squared-off 0. */
export const RADIUS_SCALE: ScaleStep[] = [
  { label: 'None', value: 0, token: '0' },
  { label: 'SM', value: 6, token: '--radius-sm' },
  { label: 'MD', value: 10, token: '--radius-md' },
  { label: 'LG', value: 16, token: '--radius-lg' },
  { label: 'Full', value: 999, token: '--radius-full' }
];
