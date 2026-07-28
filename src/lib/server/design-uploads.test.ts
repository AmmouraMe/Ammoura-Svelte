import { describe, it, expect } from 'vitest';
import {
  hashClientAddress,
  checkRateLimit,
  validateDimensions,
  validateAgainstZone,
  RATE_LIMIT_MAX_UPLOADS,
  RATE_LIMIT_MAX_BYTES,
  MAX_PIXELS_PER_SIDE,
  MIN_PIXELS_PER_SIDE
} from './design-uploads';

describe('hashClientAddress', () => {
  it('is deterministic for the same address and salt', async () => {
    const a = await hashClientAddress('203.0.113.9', 'salt');
    const b = await hashClientAddress('203.0.113.9', 'salt');
    expect(a).toBe(b);
  });

  it('differs across addresses and across salts', async () => {
    const base = await hashClientAddress('203.0.113.9', 'salt');
    expect(await hashClientAddress('203.0.113.10', 'salt')).not.toBe(base);
    expect(await hashClientAddress('203.0.113.9', 'other-salt')).not.toBe(base);
  });

  it('does not leak the address', async () => {
    const hash = await hashClientAddress('203.0.113.9', 'salt');
    expect(hash).not.toContain('203.0.113.9');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('checkRateLimit', () => {
  it('allows an upload well inside the limits', () => {
    expect(checkRateLimit({ uploads: 1, bytes: 1024 }, 1024).allowed).toBe(true);
  });

  it('blocks once the upload count is reached', () => {
    const decision = checkRateLimit({ uploads: RATE_LIMIT_MAX_UPLOADS, bytes: 0 }, 1);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/too many/i);
  });

  it('blocks when the incoming file would breach the byte budget', () => {
    const decision = checkRateLimit({ uploads: 0, bytes: RATE_LIMIT_MAX_BYTES - 10 }, 1000);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/limit reached/i);
  });

  it('allows a file that exactly reaches the byte budget', () => {
    expect(checkRateLimit({ uploads: 0, bytes: 0 }, RATE_LIMIT_MAX_BYTES).allowed).toBe(true);
  });
});

describe('validateDimensions', () => {
  it('accepts plausible artwork', () => {
    expect(validateDimensions({ width: 6000, height: 4500 }).allowed).toBe(true);
  });

  it('rejects missing or unparseable dimensions', () => {
    expect(validateDimensions(null).allowed).toBe(false);
    expect(validateDimensions({}).allowed).toBe(false);
    expect(validateDimensions({ width: NaN, height: 10 }).allowed).toBe(false);
  });

  it('rejects a decompression-bomb sized image', () => {
    expect(validateDimensions({ width: MAX_PIXELS_PER_SIDE + 1, height: 10 }).allowed).toBe(false);
  });

  it('rejects something too small to be artwork', () => {
    expect(validateDimensions({ width: MIN_PIXELS_PER_SIDE - 1, height: 500 }).allowed).toBe(false);
  });
});

describe('validateAgainstZone', () => {
  const zone = { maxFileSize: 10 * 1024 * 1024, allowedTypes: ['image/png', 'image/jpeg'] };

  it('accepts an allowed type within the size limit', () => {
    expect(validateAgainstZone({ size: 1024, type: 'image/png' }, zone).allowed).toBe(true);
  });

  it('rejects a disallowed type', () => {
    const d = validateAgainstZone({ size: 1024, type: 'image/gif' }, zone);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/file type/i);
  });

  it('rejects an oversized file and names the limit', () => {
    const d = validateAgainstZone({ size: 20 * 1024 * 1024, type: 'image/png' }, zone);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain('10MB');
  });

  it('treats an empty allowlist as "any type"', () => {
    const open = { maxFileSize: 1024, allowedTypes: [] };
    expect(validateAgainstZone({ size: 10, type: 'image/tiff' }, open).allowed).toBe(true);
  });
});
