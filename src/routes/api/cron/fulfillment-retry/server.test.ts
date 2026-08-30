import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db/connection', () => ({
  getDB: vi.fn(() => ({ tag: 'db' }))
}));

const mockSweepDueRelays = vi.fn();
vi.mock('$lib/server/fulfillment/sweep', () => ({
  sweepDueRelays: (...args: unknown[]) => mockSweepDueRelays(...args),
  SWEEP_DEFAULT_LIMIT: 25
}));

import { POST } from './+server';
import type { RequestHandler } from './$types';

type ExtractRequestEvent<T> = T extends (event: infer E) => unknown ? E : never;
type MockRequestEvent = ExtractRequestEvent<RequestHandler>;

const emptySweep = {
  considered: 0,
  succeeded: 0,
  retrying: 0,
  deadLettered: 0,
  skipped: 0
};

describe('POST /api/cron/fulfillment-retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSweepDueRelays.mockResolvedValue(emptySweep);
  });

  function makeEvent(
    options: {
      authorization?: string | null;
      env?: Record<string, unknown>;
      query?: string;
    } = {}
  ): MockRequestEvent {
    const env = options.env ?? { DB: {}, ENCRYPTION_KEY: 'key', CRON_SECRET: 'sweep-secret' };
    const request = {
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'authorization' ? (options.authorization ?? null) : null
      }
    } as unknown as Request;

    return {
      request,
      platform: { env },
      url: new URL(`http://localhost/api/cron/fulfillment-retry${options.query ?? ''}`)
    } as unknown as MockRequestEvent;
  }

  it('runs the sweep for a request with the right bearer token', async () => {
    mockSweepDueRelays.mockResolvedValue({ ...emptySweep, considered: 2, succeeded: 2 });

    const response = await POST(makeEvent({ authorization: 'Bearer sweep-secret' }));

    expect(await response.json()).toEqual({
      ok: true,
      considered: 2,
      succeeded: 2,
      retrying: 0,
      deadLettered: 0,
      skipped: 0
    });
    expect(mockSweepDueRelays).toHaveBeenCalledWith({ tag: 'db' }, 'key', { limit: 25 });
  });

  it('rejects a request with no Authorization header', async () => {
    await expect(POST(makeEvent({ authorization: null }))).rejects.toMatchObject({ status: 401 });
    expect(mockSweepDueRelays).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong secret', async () => {
    await expect(POST(makeEvent({ authorization: 'Bearer nope' }))).rejects.toMatchObject({
      status: 401
    });
    expect(mockSweepDueRelays).not.toHaveBeenCalled();
  });

  it('rejects a secret of a different length', async () => {
    await expect(
      POST(makeEvent({ authorization: 'Bearer sweep-secret-longer' }))
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects a token that is not a bearer token', async () => {
    await expect(POST(makeEvent({ authorization: 'sweep-secret' }))).rejects.toMatchObject({
      status: 401
    });
  });

  it('refuses to run at all when no secret is configured', async () => {
    await expect(
      POST(makeEvent({ env: { DB: {}, ENCRYPTION_KEY: 'key' }, authorization: 'Bearer anything' }))
    ).rejects.toMatchObject({ status: 503 });
    expect(mockSweepDueRelays).not.toHaveBeenCalled();
  });

  it('reports a missing database', async () => {
    await expect(POST(makeEvent({ env: {} }))).rejects.toMatchObject({ status: 503 });
  });

  it('reports a missing encryption key', async () => {
    await expect(
      POST(
        makeEvent({
          env: { DB: {}, CRON_SECRET: 'sweep-secret' },
          authorization: 'Bearer sweep-secret'
        })
      )
    ).rejects.toMatchObject({ status: 500 });
  });

  it('honours a smaller limit', async () => {
    await POST(makeEvent({ authorization: 'Bearer sweep-secret', query: '?limit=5' }));

    expect(mockSweepDueRelays).toHaveBeenCalledWith(expect.anything(), 'key', { limit: 5 });
  });

  it('caps the limit so one call cannot be made expensive', async () => {
    await POST(makeEvent({ authorization: 'Bearer sweep-secret', query: '?limit=100000' }));

    expect(mockSweepDueRelays).toHaveBeenCalledWith(expect.anything(), 'key', { limit: 100 });
  });

  it('falls back to the default limit when the query is nonsense', async () => {
    await POST(makeEvent({ authorization: 'Bearer sweep-secret', query: '?limit=banana' }));

    expect(mockSweepDueRelays).toHaveBeenCalledWith(expect.anything(), 'key', { limit: 25 });
  });
});
