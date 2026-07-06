/**
 * Password hashing for platform accounts using PBKDF2-SHA256 (Web Crypto,
 * available in Cloudflare Workers where bcrypt/argon2 native bindings are not).
 *
 * Stored format: pbkdf2$<iterations>$<salt-base64>$<hash-base64>
 *
 * verifyPassword also accepts the legacy unsalted SHA-256 hex format still
 * present in the site-scoped `users` table, so callers can migrate users to
 * the new format on successful login.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/**
 * True when a stored hash uses the legacy unsalted SHA-256 hex format and
 * should be re-hashed with hashPassword after a successful verification.
 */
export function isLegacyHash(storedHash: string): boolean {
  return !storedHash.startsWith('pbkdf2$');
}

async function legacySha256Hex(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isLegacyHash(storedHash)) {
    const inputHex = await legacySha256Hex(password);
    return timingSafeEqual(
      new TextEncoder().encode(inputHex),
      new TextEncoder().encode(storedHash)
    );
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) {
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1) {
    return false;
  }
  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    const actual = await deriveBits(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
