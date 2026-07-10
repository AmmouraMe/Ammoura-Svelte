import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetOrderById = vi.fn();
const mockGetOrderItems = vi.fn();
vi.mock('$lib/server/db/orders', () => ({
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
  getOrderItems: (...args: unknown[]) => mockGetOrderItems(...args)
}));

const mockGetProductVariantById = vi.fn();
vi.mock('$lib/server/db/product-variants', () => ({
  getProductVariantById: (...args: unknown[]) => mockGetProductVariantById(...args)
}));

const mockGetFulfillmentProvidersByType = vi.fn();
vi.mock('$lib/server/db/fulfillment-providers', () => ({
  getFulfillmentProvidersByType: (...args: unknown[]) => mockGetFulfillmentProvidersByType(...args)
}));

const mockStorePrintfulOrder = vi.fn();
vi.mock('./db', () => ({
  storePrintfulOrder: (...args: unknown[]) => mockStorePrintfulOrder(...args)
}));

const mockCreateOrderWithPrintful = vi.fn();
const mockFromProvider = vi.fn();
vi.mock('./service', () => ({
  PrintfulService: {
    fromProvider: (...args: unknown[]) => mockFromProvider(...args)
  }
}));

const mockLogActivity = vi.fn();
vi.mock('$lib/server/activity-logger', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args)
}));

import { relayPaidOrderToPrintful } from './relay';

describe('relayPaidOrderToPrintful', () => {
  const siteId = 'site-1';
  const orderId = 'order-1';
  const encryptionKey = 'test-key';

  const mockOrder = {
    id: orderId,
    site_id: siteId,
    shipping_address: JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'United States'
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFromProvider.mockResolvedValue({
      createOrderWithPrintful: mockCreateOrderWithPrintful
    });
  });

  it('does nothing when the order has no items with a variant', async () => {
    mockGetOrderById.mockResolvedValue(mockOrder);
    mockGetOrderItems.mockResolvedValue([{ variant_id: null, quantity: 1 }]);

    await relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey);

    expect(mockFromProvider).not.toHaveBeenCalled();
    expect(mockCreateOrderWithPrintful).not.toHaveBeenCalled();
  });

  it('does nothing when order is not found', async () => {
    mockGetOrderById.mockResolvedValue(null);

    await relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey);

    expect(mockGetOrderItems).not.toHaveBeenCalled();
  });

  it('does nothing when a variant has no printful_sync_variant_id', async () => {
    mockGetOrderById.mockResolvedValue(mockOrder);
    mockGetOrderItems.mockResolvedValue([{ variant_id: 'variant-1', quantity: 2 }]);
    mockGetProductVariantById.mockResolvedValue({ printful_sync_variant_id: null });

    await relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey);

    expect(mockFromProvider).not.toHaveBeenCalled();
  });

  it('logs and does nothing when no Printful provider is connected', async () => {
    mockGetOrderById.mockResolvedValue(mockOrder);
    mockGetOrderItems.mockResolvedValue([{ variant_id: 'variant-1', quantity: 2 }]);
    mockGetProductVariantById.mockResolvedValue({ printful_sync_variant_id: 999 });
    mockGetFulfillmentProvidersByType.mockResolvedValue([]);

    await relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey);

    expect(mockFromProvider).not.toHaveBeenCalled();
  });

  it('places a real Printful order for items mapped to sync variants', async () => {
    mockGetOrderById.mockResolvedValue(mockOrder);
    mockGetOrderItems.mockResolvedValue([
      { variant_id: 'variant-1', quantity: 2 },
      { variant_id: null, quantity: 1 } // non-Printful line, ignored
    ]);
    mockGetProductVariantById.mockResolvedValue({ printful_sync_variant_id: 999 });
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ id: 'provider-1' }]);
    mockCreateOrderWithPrintful.mockResolvedValue({ id: 555 });

    await relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey);

    expect(mockFromProvider).toHaveBeenCalledWith({ id: 'provider-1' }, encryptionKey);
    expect(mockCreateOrderWithPrintful).toHaveBeenCalledWith({
      external_id: orderId,
      shipping: 'standard',
      items: [{ sync_variant_id: 999, quantity: 2 }],
      recipient: {
        name: 'John Doe',
        address1: '123 Main St',
        city: 'Anytown',
        state_code: 'CA',
        country_code: 'US',
        zip: '12345',
        phone: '555-1234',
        email: 'john@example.com'
      }
    });
    expect(mockStorePrintfulOrder).toHaveBeenCalledWith(
      expect.anything(),
      siteId,
      orderId,
      555,
      expect.any(String)
    );
    expect(mockLogActivity).toHaveBeenCalled();
  });

  it('logs and does not throw when the shipping country is unrecognized', async () => {
    mockGetOrderById.mockResolvedValue({
      ...mockOrder,
      shipping_address: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'Wakanda'
      })
    });
    mockGetOrderItems.mockResolvedValue([{ variant_id: 'variant-1', quantity: 1 }]);
    mockGetProductVariantById.mockResolvedValue({ printful_sync_variant_id: 999 });
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ id: 'provider-1' }]);

    await expect(
      relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey)
    ).resolves.toBeUndefined();

    expect(mockCreateOrderWithPrintful).not.toHaveBeenCalled();
  });

  it('never throws, even if Printful order creation fails', async () => {
    mockGetOrderById.mockResolvedValue(mockOrder);
    mockGetOrderItems.mockResolvedValue([{ variant_id: 'variant-1', quantity: 1 }]);
    mockGetProductVariantById.mockResolvedValue({ printful_sync_variant_id: 999 });
    mockGetFulfillmentProvidersByType.mockResolvedValue([{ id: 'provider-1' }]);
    mockCreateOrderWithPrintful.mockRejectedValue(new Error('Printful API error'));

    await expect(
      relayPaidOrderToPrintful({} as unknown as D1Database, siteId, orderId, encryptionKey)
    ).resolves.toBeUndefined();
  });
});
