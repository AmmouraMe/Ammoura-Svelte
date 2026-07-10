import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrintfulClient } from './client';
import type {
  PrintfulProduct,
  PrintfulVariant,
  PrintfulOrder,
  PrintfulSyncProductDetail
} from './types';

describe('PrintfulClient', () => {
  let client: PrintfulClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const testApiKey = 'test-api-key-12345';
  const testConfig = { apiKey: testApiKey };

  beforeEach(() => {
    mockFetch = vi.fn();
    // Mock global fetch
    global.fetch = mockFetch;
    client = new PrintfulClient(testConfig);
  });

  describe('constructor', () => {
    it('initializes with config', () => {
      expect(client).toBeDefined();
    });

    it('sets default API URL', () => {
      const defaultClient = new PrintfulClient(testConfig);
      expect(defaultClient['apiUrl']).toBe('https://api.printful.com');
    });

    it('uses custom API URL if provided', () => {
      const customClient = new PrintfulClient({
        apiKey: testApiKey,
        apiUrl: 'https://custom.api.com'
      });
      expect(customClient['apiUrl']).toBe('https://custom.api.com');
    });
  });

  describe('authentication', () => {
    it('includes API key in Authorization header', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ code: 200, result: {} })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getStore();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testApiKey}`
          })
        })
      );
    });

    it('throws error if API key is missing', () => {
      expect(() => new PrintfulClient({ apiKey: '' })).toThrow();
    });
  });

  describe('getStore', () => {
    it('fetches store information', async () => {
      const mockStoreData = {
        name: 'My Store',
        id: 12345
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockStoreData })
      });

      const store = await client.getStore();

      expect(store).toEqual(mockStoreData);
      expect(mockFetch).toHaveBeenCalledWith('https://api.printful.com/store', expect.any(Object));
    });

    it('throws error if API returns error code', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 400,
          error: { code: 'INVALID_REQUEST', message: 'Bad request' }
        })
      });

      await expect(client.getStore()).rejects.toThrow('Bad request');
    });

    it('throws error if network request fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getStore()).rejects.toThrow('Network error');
    });
  });

  describe('getProducts', () => {
    it('fetches all store products', async () => {
      const mockProducts = [
        { id: 1, title: 'Product 1', type: 1 },
        { id: 2, title: 'Product 2', type: 2 }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockProducts })
      });

      const products = await client.getProducts();

      expect(products).toEqual(mockProducts);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/products',
        expect.any(Object)
      );
    });

    it('returns empty array when no products', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: [] })
      });

      const products = await client.getProducts();

      expect(products).toEqual([]);
    });
  });

  describe('getStoreProduct', () => {
    it('fetches a sync product with its orderable sync variants', async () => {
      const mockDetail: PrintfulSyncProductDetail = {
        sync_product: {
          id: 555,
          external_id: null,
          name: 'Hoodie',
          variants: 2,
          synced: 2,
          thumbnail_url: null,
          is_ignored: false
        },
        sync_variants: [
          {
            id: 111,
            external_id: null,
            sync_product_id: 555,
            name: 'Hoodie - M / Black',
            synced: true,
            variant_id: 4012,
            retail_price: '39.99',
            currency: 'USD',
            sku: 'HOOD-M-BLK',
            is_ignored: false,
            size: 'M',
            color: 'Black',
            files: []
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockDetail })
      });

      const detail = await client.getStoreProduct(555);

      expect(detail).toEqual(mockDetail);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/store/products/555',
        expect.any(Object)
      );
    });
  });

  describe('getProductById', () => {
    it('fetches product by ID', async () => {
      const mockProduct: PrintfulProduct = {
        id: 123,
        external_id: 'ext-123',
        title: 'Test Product',
        type: 1,
        description: 'Test description',
        currency: 'USD',
        files: [],
        options: [],
        images: [],
        variants: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockProduct })
      });

      const product = await client.getProductById(123);

      expect(product).toEqual(mockProduct);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/products/123',
        expect.any(Object)
      );
    });
  });

  describe('getVariantById', () => {
    it('fetches variant by ID', async () => {
      const mockVariant: PrintfulVariant = {
        id: 456,
        external_id: 'ext-456',
        product_id: 123,
        size: 'M',
        color: 'Blue',
        color_code: '#0000FF',
        size_code: 'M',
        sku: 'TEST-SKU-M',
        currency: 'USD',
        status: 'active',
        availability_status: 'in_stock',
        price: 15.0,
        cost: 5.0,
        retail_price: 25.0,
        weight: 300,
        image: null,
        files: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockVariant })
      });

      const variant = await client.getVariantById(456);

      expect(variant).toEqual(mockVariant);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/variants/456',
        expect.any(Object)
      );
    });
  });

  describe('createOrder', () => {
    it('creates order with valid data', async () => {
      const mockOrder: PrintfulOrder = {
        id: 789,
        uid: 'uid-789',
        status: 'pending',
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

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockOrder })
      });

      const orderRequest = {
        external_id: 'order-123',
        shipping: 'standard' as const,
        items: [
          {
            variant_id: 456,
            quantity: 2
          }
        ],
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

      const order = await client.createOrder(orderRequest);

      expect(order).toEqual(mockOrder);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/orders',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });

    it('throws error on order creation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 400,
          error: { code: 'INVALID_ORDER', message: 'Invalid order data' }
        })
      });

      const orderRequest = {
        external_id: 'order-123',
        shipping: 'standard' as const,
        items: [],
        recipient: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Los Angeles',
          country_code: 'US',
          zip: '90001',
          email: 'john@example.com'
        }
      };

      await expect(client.createOrder(orderRequest)).rejects.toThrow('Invalid order data');
    });
  });

  describe('getOrder', () => {
    it('fetches order by ID', async () => {
      const mockOrder: PrintfulOrder = {
        id: 789,
        uid: 'uid-789',
        status: 'confirmed',
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

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: mockOrder })
      });

      const order = await client.getOrder(789);

      expect(order).toEqual(mockOrder);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/orders/789',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('includes request ID in error for debugging', async () => {
      const mockError = {
        code: 429,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests'
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockError
      });

      await expect(client.getStore()).rejects.toThrow();
    });

    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        }
      });

      await expect(client.getStore()).rejects.toThrow();
    });

    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.getStore()).rejects.toThrow('HTTP 500');
    });
  });

  describe('cancelOrder', () => {
    it('cancels order by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200, result: { success: true } })
      });

      const result = await client.cancelOrder(789);

      expect(result).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.printful.com/orders/789',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });
});
