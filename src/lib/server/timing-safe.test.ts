import { describe, it, expect } from 'vitest';
import { timingSafeEqual } from './timing-safe';

describe('timingSafeEqual', () => {
  it('accepts identical strings', () => {
    expect(timingSafeEqual('sk_live_abc123', 'sk_live_abc123')).toBe(true);
  });

  it('rejects strings differing in one byte', () => {
    expect(timingSafeEqual('token-a', 'token-b')).toBe(false);
  });

  it('rejects a correct prefix', () => {
    expect(timingSafeEqual('tok', 'token')).toBe(false);
    expect(timingSafeEqual('token', 'tok')).toBe(false);
  });

  it('rejects null and undefined rather than matching them together', () => {
    expect(timingSafeEqual(null, null)).toBe(false);
    expect(timingSafeEqual(undefined, undefined)).toBe(false);
    expect(timingSafeEqual(null, 'token')).toBe(false);
    expect(timingSafeEqual('token', undefined)).toBe(false);
  });

  it('treats empty strings as equal to each other only', () => {
    expect(timingSafeEqual('', '')).toBe(true);
    expect(timingSafeEqual('', 'x')).toBe(false);
  });

  it('compares multi-byte characters by their encoded bytes', () => {
    expect(timingSafeEqual('héllo', 'héllo')).toBe(true);
    expect(timingSafeEqual('héllo', 'hello')).toBe(false);
  });
});
