/**
 * Constant-time comparison for secret strings (webhook tokens, bearer tokens).
 *
 * `a === b` on strings short-circuits at the first differing byte, which leaks
 * how much of a guess was correct to anyone who can time the response. Use
 * this wherever an attacker-supplied value is checked against a secret.
 */
export function timingSafeEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  // Length is not secret (and cannot be hidden by this comparison), but the
  // loop must still run over a fixed operand so an early return does not
  // depend on content.
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
