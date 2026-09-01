import { describe, it, expect } from 'vitest';
import { isTransientPrintfulFailure, PrintfulApiError } from './errors';

describe('PrintfulApiError', () => {
  it('keeps the status, the Printful code and the raw body', () => {
    const error = new PrintfulApiError('Variant unavailable', {
      status: 422,
      printfulCode: 422,
      body: '{"error":{"message":"Variant unavailable"}}'
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PrintfulApiError');
    expect(error.status).toBe(422);
    expect(error.printfulCode).toBe(422);
    expect(error.body).toContain('Variant unavailable');
  });

  it('defaults every field to null when nothing is known', () => {
    const error = new PrintfulApiError('Network down');

    expect(error.status).toBeNull();
    expect(error.printfulCode).toBeNull();
    expect(error.body).toBeNull();
  });

  it('carries the underlying error as its cause', () => {
    const cause = new TypeError('fetch failed');
    const error = new PrintfulApiError('fetch failed', { cause });

    expect((error as { cause?: unknown }).cause).toBe(cause);
  });
});

describe('isTransientPrintfulFailure', () => {
  it('retries a request that never got a response', () => {
    expect(isTransientPrintfulFailure(new PrintfulApiError('socket hang up'))).toBe(true);
    expect(isTransientPrintfulFailure(new TypeError('fetch failed'))).toBe(true);
  });

  it('retries rate limits and server errors', () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isTransientPrintfulFailure(new PrintfulApiError('busy', { status }))).toBe(true);
    }
  });

  it('does not retry a request Printful understood and refused', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isTransientPrintfulFailure(new PrintfulApiError('nope', { status }))).toBe(false);
    }
  });

  it('treats an unrecognised error as transient', () => {
    expect(isTransientPrintfulFailure(new Error('something else'))).toBe(true);
    expect(isTransientPrintfulFailure('not even an error')).toBe(true);
  });
});
