import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db/connection', () => ({
  getDB: vi.fn(() => ({}))
}));

const mockGetFulfillmentProvidersByType = vi.fn();
vi.mock('$lib/server/db/fulfillment-providers', () => ({
  getFulfillmentProvidersByType: (...args: unknown[]) => mockGetFulfillmentProvidersByType(...args)
}));

const mockUpdatePrintfulOrderStatus = vi.fn();
vi.mock('$lib/server/integrations/printful/db', () => ({
  updatePrintfulOrderStatus: (...args: unknown[]) => mockUpdatePrintfulOrderStatus(...args)
}));

const mockLogActivity = vi.fn();
vi.mock('$lib/server/activity-logger', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args)
}));

import { POST } from './+server';
import type { RequestHandler } from './$types';

type ExtractRequestEvent<T> = T extends (event: infer E) => unknown ? E : never;
type MockRequestEvent = ExtractRequestEvent<RequestHandler>;

describe('POST /api/webhooks/printful', () => {
  const mockPlatform = { env: { DB: {} } };
  const mockLocals = { siteId: 'site-1' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeEvent(token: string | null, body?: unknown): MockRequestEvent {
    const url = new URL(`http://localhost/api/webhooks/printful${token ? `?token=${token}` : ''}`);
    const request = {
      json: vi.fn().mockResolvedValue(body ?? {})
    } as unknown as Request;
    return {
      request,
      platform: mockPlatform,
      locals: mockLocals,
      url
    } as unknown as MockRequestEvent;
  }

  it('rejects requests with no token when a provider is connected', async () => {
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ webhook_token: 'real-token' }]);

    await expect(POST(makeEvent(null))).rejects.toMatchObject({ status: 401 });
    expect(mockUpdatePrintfulOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects requests with the wrong token', async () => {
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ webhook_token: 'real-token' }]);

    await expect(POST(makeEvent('wrong-token'))).rejects.toMatchObject({ status: 401 });
    expect(mockUpdatePrintfulOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects requests when no Printful provider is connected at all', async () => {
    mockGetFulfillmentProvidersByType.mockResolvedValue([]);

    await expect(POST(makeEvent('anything'))).rejects.toMatchObject({ status: 401 });
  });

  it('processes the webhook when the token matches', async () => {
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ webhook_token: 'real-token' }]);

    const printfulOrder = {
      id: 999,
      external_id: 'order-1',
      status: 'fulfilled',
      tracking_number: 'TRACK123'
    };

    const response = await POST(
      makeEvent('real-token', { type: 'order_updated', data: { order: printfulOrder } })
    );
    const result = (await response.json()) as { success: boolean };

    expect(result.success).toBe(true);
    expect(mockUpdatePrintfulOrderStatus).toHaveBeenCalledWith(
      {},
      'site-1',
      'order-1',
      'fulfilled',
      expect.any(String)
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });
});
