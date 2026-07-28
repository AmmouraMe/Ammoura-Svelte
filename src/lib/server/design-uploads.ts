/**
 * Guard rails for customer-uploaded design artwork.
 *
 * Shoppers are not signed in, so this path is necessarily open to the public.
 * That makes validation and rate limiting the only things standing between a
 * storefront and someone filling the owner's R2 bucket. Kept separate from the
 * route handler so the limits are unit-testable.
 */

/** Uploads allowed from one IP, per site, within the window. */
export const RATE_LIMIT_MAX_UPLOADS = 30;
/** Total bytes allowed from one IP, per site, within the window. */
export const RATE_LIMIT_MAX_BYTES = 200 * 1024 * 1024;
/** Rolling window, in seconds. */
export const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

/** Reject absurd dimensions outright — a decompression-bomb guard. */
export const MAX_PIXELS_PER_SIDE = 30000;
/** Below this an "image" is not plausibly artwork. */
export const MIN_PIXELS_PER_SIDE = 16;

export interface UploadLimitUsage {
  uploads: number;
  bytes: number;
}

export interface LimitDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * Salted, non-reversible client identifier. We need to count per client but
 * have no reason to be able to read the address back, so only the digest is
 * ever stored.
 */
export async function hashClientAddress(address: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Would accepting `incomingBytes` breach the window's limits? */
export function checkRateLimit(usage: UploadLimitUsage, incomingBytes: number): LimitDecision {
  if (usage.uploads >= RATE_LIMIT_MAX_UPLOADS) {
    return {
      allowed: false,
      reason: 'Too many uploads from this connection. Please try again later.'
    };
  }
  if (usage.bytes + incomingBytes > RATE_LIMIT_MAX_BYTES) {
    return {
      allowed: false,
      reason: 'Upload limit reached for this connection. Please try again later.'
    };
  }
  return { allowed: true };
}

export interface DimensionInput {
  width: number;
  height: number;
}

/**
 * Validate client-reported dimensions.
 *
 * These come from the browser and are therefore untrusted; they are used only
 * for the quality meter and for rejecting implausible input, never for
 * allocating anything.
 */
export function validateDimensions(dims: Partial<DimensionInput> | null): LimitDecision {
  if (!dims || !Number.isFinite(dims.width) || !Number.isFinite(dims.height)) {
    return { allowed: false, reason: 'Could not read the image dimensions.' };
  }
  const { width = 0, height = 0 } = dims;
  if (width < MIN_PIXELS_PER_SIDE || height < MIN_PIXELS_PER_SIDE) {
    return { allowed: false, reason: 'That image is too small to print.' };
  }
  if (width > MAX_PIXELS_PER_SIDE || height > MAX_PIXELS_PER_SIDE) {
    return { allowed: false, reason: 'That image is too large to process.' };
  }
  return { allowed: true };
}

/** Validate a file against the zone's own declared limits. */
export function validateAgainstZone(
  file: { size: number; type: string },
  zone: { maxFileSize: number; allowedTypes: string[] }
): LimitDecision {
  if (zone.allowedTypes.length > 0 && !zone.allowedTypes.includes(file.type)) {
    return { allowed: false, reason: 'That file type is not allowed for this design area.' };
  }
  if (file.size > zone.maxFileSize) {
    const maxMB = Math.floor(zone.maxFileSize / 1024 / 1024);
    return { allowed: false, reason: `File too large. Maximum size is ${maxMB}MB.` };
  }
  return { allowed: true };
}
