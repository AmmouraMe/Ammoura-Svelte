import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrintfulService } from './service';
import { PrintfulClient } from './client';
import type { DBFulfillmentProvider } from '$lib/types/fulfillment';
import type { D1Database } from '@cloudflare/workers-types';

describe('PrintfulService', () => {
  let mockDb: D1Database;
  let mockClientInstance: Record<string, ReturnType<typeof vi.fn>>;
  let service: PrintfulService;

  const testSiteId = 'test-site-123';
  const testProviderId = 'provider-123';

  const mockProvider: DBFulfillmentProvider = {
    id: testProviderId,
    site_id: testSiteId,
    name: 'Printful Store',
    description: 'Print on demand',
    provider_type: 'printful',
    config: JSON.stringify({ apiKey: 'test-key' }),
    is_default: 0,
    is_active: 1,
    created_at: Date.now(),
    updated_at: Date.now()
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn(),
          all: vi.fn(),
          run: vi.fn()
        })
      })
    } as unknown as D1Database;

    mockClientInstance = {
      getProducts: vi.fn(),
      getProductById: vi.fn(),
      getVariantById: vi.fn(),
      createOrder: vi.fn(),
      getOrder: vi.fn(),
      cancelOrder: vi.fn()
    };

    service = new PrintfulService(mockDb, mockProvider);
    service['client'] = mockClientInstance as unknown as PrintfulClient; // Inject mock client
  });

  describe('constructor', () => {
    it('initializes with provider', () => {
      expect(service).toBeDefined();
    });

    it('throws error if provider is not printful type', () => {
      const invalidProvider: DBFulfillmentProvider = {
        ...mockProvider,
        provider_type: 'manual'
      };

      expect(() => new PrintfulService(mockDb, invalidProvider)).toThrow(
        'Provider is not Printful type'
      );
    });

    it('throws error if API key is missing from config', () => {
      const noKeyProvider: DBFulfillmentProvider = {
        ...mockProvider,
        config: JSON.stringify({})
      };

      expect(() => new PrintfulService(mockDb, noKeyProvider)).toThrow();
    });
  });

  describe('syncProducts', () => {
    it('fetches and syncs products from Printful', async () => {
      const mockProducts = [
        {
          id: 123,
          title: 'Product 1',
          type: 1,
          description: 'Desc 1',
          currency: 'USD',
          external_id: null,
          files: [],
          options: [],
          images: [],
          variants: []
        }
      ];

      mockClientInstance.getProducts.mockResolvedValue(mockProducts);

      const products = await service.syncProducts();

      expect(products).toHaveLength(1);
      expect(products[0].title).toBe('Product 1');
      expect(mockClientInstance.getProducts).toHaveBeenCalled();
    });

    it('returns empty array if sync fails', async () => {
      mockClientInstance.getProducts.mockRejectedValue(new Error('API error'));

      const products = await service.syncProducts();

      expect(products).toEqual([]);
    });
  });

  describe('getProductDetails', () => {
    it('fetches product details from Printful', async () => {
      const mockProduct = {
        id: 123,
        title: 'Product 1',
        type: 1,
        description: 'Desc 1',
        currency: 'USD',
        external_id: null,
        files: [],
        options: [],
        images: [],
        variants: [
          {
            id: 456,
            product_id: 123,
            size: 'M',
            color: 'Blue',
            price: 15.0,
            cost: 5.0,
            availability_status: 'in_stock',
            sku: 'TEST-SKU',
            status: 'active',
            external_id: null,
            color_code: '#0000FF',
            size_code: 'M',
            retail_price: null,
            weight: 300,
            image: null,
            files: [],
            currency: 'USD'
          }
        ]
      };

      mockClientInstance.getProductById.mockResolvedValue(mockProduct);

      const product = await service.getProductDetails(123);

      expect(product).toEqual(mockProduct);
      expect(mockClientInstance.getProductById).toHaveBeenCalledWith(123);
    });

    it('throws error if product not found', async () => {
      mockClientInstance.getProductById.mockRejectedValue(new Error('Product not found'));

      await expect(service.getProductDetails(999)).rejects.toThrow('Product not found');
    });
  });

  describe('checkInventory', () => {
    it('checks variant availability', async () => {
      const mockVariant = {
        id: 456,
        product_id: 123,
        size: 'M',
        color: 'Blue',
        price: 15.0,
        cost: 5.0,
        availability_status: 'in_stock' as const,
        sku: 'TEST-SKU',
        status: 'active' as const,
        external_id: null,
        color_code: '#0000FF',
        size_code: 'M',
        retail_price: null,
        weight: 300,
        image: null,
        files: [],
        currency: 'USD'
      };

      mockClientInstance.getVariantById.mockResolvedValue(mockVariant);

      const available = await service.checkInventory(456);

      expect(available).toBe(true);
    });

    it('returns false for out of stock variants', async () => {
      const mockVariant = {
        id: 456,
        product_id: 123,
        size: 'M',
        color: 'Blue',
        price: 15.0,
        cost: 5.0,
        availability_status: 'out_of_stock' as const,
        sku: 'TEST-SKU',
        status: 'active' as const,
        external_id: null,
        color_code: '#0000FF',
        size_code: 'M',
        retail_price: null,
        weight: 300,
        image: null,
        files: [],
        currency: 'USD'
      };

      mockClientInstance.getVariantById.mockResolvedValue(mockVariant);

      const available = await service.checkInventory(456);

      expect(available).toBe(false);
    });
  });

  describe('createOrderWithPrintful', () => {
    it('creates order with Printful', async () => {
      const mockOrder = {
        id: 789,
        uid: 'uid-789',
        status: 'pending' as const,
        ship_date: null,
        created: Date.now(),
        updated: Date.now(),
        external_id: 'order-123',
        shipping: 'standard',
        shipping_service_name: 'Standard Shipping',
        estimated_delivery_date: null,
        tracking_number: null,
        tracking_url: null,
        costs: {
          currency: 'USD',
          subtotal: 25.0,
          discount: 0,
          shipping: 5.0,
          tax: 0,
          total: 30.0
        },
        items: [],
        recipient: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          state_code: 'CA',
          country_code: 'US',
          zip: '90001',
          email: 'john@example.com'
        }
      };

      mockClientInstance.createOrder.mockResolvedValue(mockOrder);

      const orderRequest = {
        external_id: 'order-123',
        shipping: 'standard' as const,
        items: [{ variant_id: 456, quantity: 2 }],
        recipient: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          state_code: 'CA',
          country_code: 'US',
          zip: '90001',
          email: 'john@example.com'
        }
      };

      const order = await service.createOrderWithPrintful(orderRequest);

      expect(order).toEqual(mockOrder);
      expect(mockClientInstance.createOrder).toHaveBeenCalledWith(orderRequest);
    });

    it('throws error if order creation fails', async () => {
      mockClientInstance.createOrder.mockRejectedValue(new Error('Invalid order'));

      const orderRequest = {
        external_id: 'order-123',
        shipping: 'standard' as const,
        items: [{ variant_id: 456, quantity: 2 }],
        recipient: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          country_code: 'US',
          zip: '90001',
          email: 'john@example.com'
        }
      };

      await expect(service.createOrderWithPrintful(orderRequest)).rejects.toThrow('Invalid order');
    });
  });

  describe('getOrderStatus', () => {
    it('gets order status from Printful', async () => {
      const mockOrder = {
        id: 789,
        uid: 'uid-789',
        status: 'confirmed' as const,
        ship_date: '2025-01-15',
        created: Date.now(),
        updated: Date.now(),
        external_id: 'order-123',
        shipping: 'standard',
        shipping_service_name: 'Standard Shipping',
        estimated_delivery_date: '2025-01-20',
        tracking_number: 'TRACK123',
        tracking_url: 'https://tracking.com/TRACK123',
        costs: {
          currency: 'USD',
          subtotal: 25.0,
          discount: 0,
          shipping: 5.0,
          tax: 0,
          total: 30.0
        },
        items: [],
        recipient: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          state_code: 'CA',
          country_code: 'US',
          zip: '90001',
          email: 'john@example.com'
        }
      };

      mockClientInstance.getOrder.mockResolvedValue(mockOrder);

      const order = await service.getOrderStatus(789);

      expect(order.status).toBe('confirmed');
      expect(order.tracking_number).toBe('TRACK123');
    });
  });

  describe('getPrintfulConfig', () => {
    it('returns parsed config from provider', () => {
      const config = service.getPrintfulConfig();

      expect(config).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('isConfigValid', () => {
    it('returns true when config has API key', () => {
      const valid = service.isConfigValid();

      expect(valid).toBe(true);
    });

    it('throws error when trying to create service with invalid config', () => {
      const invalidProvider: DBFulfillmentProvider = {
        ...mockProvider,
        config: JSON.stringify({})
      };

      expect(() => new PrintfulService(mockDb, invalidProvider)).toThrow(
        'Printful API key is required'
      );
    });
  });
});
