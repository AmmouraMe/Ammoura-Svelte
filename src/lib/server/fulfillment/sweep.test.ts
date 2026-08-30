import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDueRelays = vi.fn();
vi.mock('$lib/server/db/fulfillment-relays', () => ({
  getDueRelays: (...args: unknown[]) => mockGetDueRelays(...args)
}));

const mockRelayPaidOrderToPrintful = vi.fn();
vi.mock('$lib/server/integrations/printful/relay', () => ({
  PRINTFUL_PROVIDER_TYPE: 'printful',
  relayPaidOrderToPrintful: (...args: unknown[]) => mockRelayPaidOrderToPrintful(...args)
}));

import { sweepDueRelays, SWEEP_DEFAULT_LIMIT } from './sweep';

const db = {} as unknown as D1Database;

function due(id: string, siteId: string, orderId: string, providerType = 'printful') {
  return { id, site_id: siteId, order_id: orderId, provider_type: providerType };
}

describe('sweepDueRelays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDueRelays.mockResolvedValue([]);
  });

  it('asks for due relays at the given time and limit', async () => {
    await sweepDueRelays(db, 'key', { now: 5000, limit: 5 });

    expect(mockGetDueRelays).toHaveBeenCalledWith(db, 5000, 5);
  });

  it('defaults the limit so a backlog cannot outrun one request', async () => {
    await sweepDueRelays(db, 'key', { now: 5000 });

    expect(mockGetDueRelays).toHaveBeenCalledWith(db, 5000, SWEEP_DEFAULT_LIMIT);
  });

  it('retries each relay under its own site', async () => {
    mockGetDueRelays.mockResolvedValue([
      due('relay-1', 'site-a', 'order-1'),
      due('relay-2', 'site-b', 'order-2')
    ]);
    mockRelayPaidOrderToPrintful.mockResolvedValue({ outcome: 'succeeded' });

    const result = await sweepDueRelays(db, 'key');

    expect(mockRelayPaidOrderToPrintful).toHaveBeenNthCalledWith(1, db, 'site-a', 'order-1', 'key');
    expect(mockRelayPaidOrderToPrintful).toHaveBeenNthCalledWith(2, db, 'site-b', 'order-2', 'key');
    expect(result).toMatchObject({ considered: 2, succeeded: 2 });
  });

  it('counts each outcome separately', async () => {
    mockGetDueRelays.mockResolvedValue([
      due('relay-1', 'site-a', 'order-1'),
      due('relay-2', 'site-a', 'order-2'),
      due('relay-3', 'site-a', 'order-3'),
      due('relay-4', 'site-a', 'order-4')
    ]);
    mockRelayPaidOrderToPrintful
      .mockResolvedValueOnce({ outcome: 'succeeded' })
      .mockResolvedValueOnce({ outcome: 'retrying' })
      .mockResolvedValueOnce({ outcome: 'dead_lettered' })
      .mockResolvedValueOnce({ outcome: 'skipped' });

    const result = await sweepDueRelays(db, 'key');

    expect(result).toEqual({
      considered: 4,
      succeeded: 1,
      retrying: 1,
      deadLettered: 1,
      skipped: 1
    });
  });

  it('counts an order with nothing to relay as skipped', async () => {
    mockGetDueRelays.mockResolvedValue([due('relay-1', 'site-a', 'order-1')]);
    mockRelayPaidOrderToPrintful.mockResolvedValue(null);

    expect(await sweepDueRelays(db, 'key')).toMatchObject({ skipped: 1 });
  });

  it('skips a provider this build cannot relay to, without touching Printful', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDueRelays.mockResolvedValue([due('relay-1', 'site-a', 'order-1', 'gooten')]);

    const result = await sweepDueRelays(db, 'key');

    expect(mockRelayPaidOrderToPrintful).not.toHaveBeenCalled();
    expect(result).toMatchObject({ considered: 1, skipped: 1 });
  });

  it('keeps sweeping after one relay throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDueRelays.mockResolvedValue([
      due('relay-1', 'site-a', 'order-1'),
      due('relay-2', 'site-a', 'order-2')
    ]);
    mockRelayPaidOrderToPrintful
      .mockRejectedValueOnce(new Error('unexpected'))
      .mockResolvedValueOnce({ outcome: 'succeeded' });

    const result = await sweepDueRelays(db, 'key');

    expect(result).toMatchObject({ considered: 2, succeeded: 1, skipped: 1 });
  });
});
