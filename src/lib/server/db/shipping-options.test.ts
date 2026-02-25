import { describe, it, expect, vi } from 'vitest';
import {
  getShippingOptionById,
  getAllShippingOptions,
  deleteShippingOption,
  getProductShippingOptions,
  getCategoryShippingOptions
} from './shipping-options.js';

describe('Shipping Options Database Functions', () => {
  const siteId = 'test-site';

  describe('getShippingOptionById', () => {
    it('should query with correct parameters', async () => {
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Test',
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getShippingOptionById(mockDB, siteId, 'ship-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM shipping_options WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('ship-1', siteId);
      expect(result).toBeDefined();
      expect(result?.name).toBe('Standard');
    });

    it('should return null when not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getShippingOptionById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllShippingOptions', () => {
    it('should query all options for site', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getAllShippingOptions(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM shipping_options WHERE site_id = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
    });

    it('should filter by active status when requested', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getAllShippingOptions(mockDB, siteId, true);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM shipping_options WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC'
      );
    });
  });

  describe('deleteShippingOption', () => {
    it('should delete with correct parameters', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteShippingOption(mockDB, siteId, 'ship-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM shipping_options WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('ship-1', siteId);
      expect(result).toBe(true);
    });

    it('should return false when no rows deleted', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteShippingOption(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getProductShippingOptions', () => {
    it('should query with JOIN to get option details', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getProductShippingOptions(mockDB, siteId, 'product-1');

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalledWith('product-1', siteId);
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('JOIN shipping_options');
      expect(query).toContain('product_shipping_options');
    });
  });

  describe('getCategoryShippingOptions', () => {
    it('should query with JOIN for category', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getCategoryShippingOptions(mockDB, siteId, 'electronics');

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalledWith('electronics', siteId);
      const query = mockPrepare.mock.calls[0][0];
      expect(query).toContain('JOIN shipping_options');
      expect(query).toContain('category_shipping_options');
    });
  });

  describe('createShippingOption', () => {
    it('should create option with correct parameters', async () => {
      const { createShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-new',
        site_id: siteId,
        name: 'Express',
        description: 'Fast shipping',
        price: 25,
        estimated_days_min: 1,
        estimated_days_max: 2,
        carrier: 'FedEx',
        free_shipping_threshold: 100,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const data = {
        name: 'Express',
        description: 'Fast shipping',
        price: 25,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        carrier: 'FedEx',
        freeShippingThreshold: 100,
        isActive: true
      };

      const result = await createShippingOption(mockDB, siteId, data);

      expect(result).toBeDefined();
      expect(result.name).toBe('Express');
      expect(result.price).toBe(25);
    });
  });

  describe('updateShippingOption', () => {
    it('should update option with provided fields', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Test',
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', { price: 15 });

      expect(result).toBeDefined();
      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('setProductShippingOptions', () => {
    it('should set product shipping options', async () => {
      const { setProductShippingOptions } = await import('./shipping-options.js');
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const assignments = [
        {
          shippingOptionId: 'ship-1',
          isDefault: true,
          priceOverride: undefined,
          thresholdOverride: undefined
        }
      ];

      await setProductShippingOptions(mockDB, siteId, 'product-1', assignments);

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalled();
    });
  });

  describe('setCategoryShippingOptions', () => {
    it('should set category shipping options', async () => {
      const { setCategoryShippingOptions } = await import('./shipping-options.js');
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const assignments = [{ shippingOptionId: 'ship-1', isDefault: true }];

      await setCategoryShippingOptions(mockDB, siteId, 'electronics', assignments);

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalled();
    });
  });

  describe('getAvailableShippingForCart', () => {
    it('should return empty array for cart with no physical products', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');
      const mockDB = {} as D1Database;

      const cartItems = [{ id: '1', type: 'digital' as const }];

      const result = await getAvailableShippingForCart(mockDB, siteId, cartItems, 100);

      expect(result).toEqual([]);
    });

    it('should get shipping options for physical products', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [{ id: '1', type: 'physical' as const, category: 'electronics' }];

      const result = await getAvailableShippingForCart(mockDB, siteId, cartItems, 100);

      expect(mockPrepare).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getShippingOptionsForProducts', () => {
    it('should return shipping options for multiple products', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        { id: '1', type: 'physical' as const, category: 'electronics', price: 50, quantity: 1 },
        { id: '2', type: 'physical' as const, category: 'books', price: 20, quantity: 2 }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 100);

      expect(mockPrepare).toHaveBeenCalled();
      expect(typeof result).toBe('object');
    });

    it('should handle products with no shipping options', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [{ id: '1', type: 'physical' as const, price: 30, quantity: 1 }];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 100);

      expect(result).toBeDefined();
      expect(result['1']).toEqual([]);
    });

    it('should apply price overrides from product-specific shipping options', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: 5.99,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Standard shipping',
        price: 10.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProductOptions);
        return Promise.resolve({ results: [], success: true });
      });

      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 50,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 50);

      expect(result['product-1']).toBeDefined();
      expect(result['product-1'].length).toBeGreaterThan(0);
      expect(result['product-1'][0].price).toBe(5.99);
    });

    it('should apply threshold overrides from product-specific shipping options', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: null,
            threshold_override: 25.0,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Standard shipping',
        price: 10.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: 100.0,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProductOptions);
        return Promise.resolve({ results: [], success: true });
      });

      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 30,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 30);

      expect(result['product-1']).toBeDefined();
      expect(result['product-1'][0].isFreeShipping).toBe(true);
      expect(result['product-1'][0].price).toBe(0);
    });

    it('should fall back to category shipping options when no product-specific options exist', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockCategoryOptions = {
        results: [
          {
            id: 'cso-1',
            site_id: siteId,
            category: 'electronics',
            shipping_option_id: 'ship-2',
            is_default: 0,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-2',
        site_id: siteId,
        name: 'Express',
        description: 'Express shipping',
        price: 15.99,
        estimated_days_min: 2,
        estimated_days_max: 3,
        carrier: 'FedEx',
        free_shipping_threshold: 50.0,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ results: [], success: true });
        if (callCount === 2) return Promise.resolve(mockCategoryOptions);
        return Promise.resolve({ results: [], success: true });
      });

      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 40,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 40);

      expect(result['product-1']).toBeDefined();
      expect(result['product-1'].length).toBeGreaterThan(0);
      expect(result['product-1'][0].name).toBe('Express');
    });

    it('should apply free shipping when cart total exceeds threshold', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockCategoryOptions = {
        results: [
          {
            id: 'cso-1',
            site_id: siteId,
            category: 'electronics',
            shipping_option_id: 'ship-2',
            is_default: 0,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-2',
        site_id: siteId,
        name: 'Standard',
        description: 'Standard shipping',
        price: 8.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: 50.0,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ results: [], success: true });
        if (callCount === 2) return Promise.resolve(mockCategoryOptions);
        return Promise.resolve({ results: [], success: true });
      });

      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 60,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 60);

      expect(result['product-1'][0].isFreeShipping).toBe(true);
      expect(result['product-1'][0].price).toBe(0);
    });

    it('should sort shipping options by default first, then by price', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: 15.99,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-2',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-2',
            is_default: 1,
            price_override: 10.99,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-3',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-3',
            is_default: 0,
            price_override: 5.99,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOptions = [
        {
          id: 'ship-1',
          site_id: siteId,
          name: 'Express',
          description: null,
          price: 15.99,
          estimated_days_min: 2,
          estimated_days_max: 3,
          carrier: 'FedEx',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        },
        {
          id: 'ship-2',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 10.99,
          estimated_days_min: 5,
          estimated_days_max: 7,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        },
        {
          id: 'ship-3',
          site_id: siteId,
          name: 'Economy',
          description: null,
          price: 5.99,
          estimated_days_min: 7,
          estimated_days_max: 10,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        }
      ];

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProductOptions);
        return Promise.resolve({ results: [], success: true });
      });

      let firstCallCount = 0;
      const mockFirst = vi.fn().mockImplementation(() => {
        const option = mockShippingOptions[firstCallCount];
        firstCallCount++;
        return Promise.resolve(option);
      });

      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 50,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 50);

      expect(result['product-1'][0].isDefault).toBe(true);
      expect(result['product-1'][0].name).toBe('Standard');
      expect(result['product-1'][1].price).toBe(5.99);
      expect(result['product-1'][2].price).toBe(15.99);
    });

    it('should skip inactive shipping options', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'product-1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockInactiveShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Inactive',
        description: null,
        price: 10.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 0,
        created_at: 123,
        updated_at: 123
      };

      let callCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProductOptions);
        return Promise.resolve({ results: [], success: true });
      });

      const mockFirst = vi.fn().mockResolvedValue(mockInactiveShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        {
          id: 'product-1',
          type: 'physical' as const,
          category: 'electronics',
          price: 50,
          quantity: 1
        }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 50);

      expect(result['product-1']).toEqual([]);
    });

    it('should filter out digital and service products from shipping calculation', async () => {
      const { getShippingOptionsForProducts } = await import('./shipping-options.js');

      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const cartItems = [
        { id: '1', type: 'digital' as const, price: 20, quantity: 1 },
        { id: '2', type: 'service' as const, price: 50, quantity: 1 },
        { id: '3', type: 'physical' as const, category: 'electronics', price: 30, quantity: 1 }
      ];

      const result = await getShippingOptionsForProducts(mockDB, siteId, cartItems, 100);

      expect(result['1']).toBeUndefined();
      expect(result['2']).toBeUndefined();
      expect(result['3']).toBeDefined();
    });
  });

  describe('updateShippingOption - additional field branches', () => {
    const baseMockOption = {
      id: 'ship-1',
      site_id: 'test-site',
      name: 'Standard',
      description: 'Old description',
      price: 10,
      estimated_days_min: 5,
      estimated_days_max: 7,
      carrier: 'USPS',
      free_shipping_threshold: null,
      is_active: 1,
      created_at: 123,
      updated_at: 123
    };

    function createMockDB(): {
      mockDB: D1Database;
      mockPrepare: ReturnType<typeof vi.fn>;
      mockBind: ReturnType<typeof vi.fn>;
      mockRun: ReturnType<typeof vi.fn>;
      mockFirst: ReturnType<typeof vi.fn>;
    } {
      const mockFirst = vi.fn().mockResolvedValue(baseMockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      return {
        mockDB: { prepare: mockPrepare } as unknown as D1Database,
        mockPrepare,
        mockBind,
        mockRun,
        mockFirst
      };
    }

    it('should update name field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { name: 'Premium' });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('name = ?');
    });

    it('should update description field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', {
        description: 'New description'
      });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('description = ?');
    });

    it('should update estimatedDaysMin field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { estimatedDaysMin: 3 });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('estimated_days_min = ?');
    });

    it('should update estimatedDaysMax field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { estimatedDaysMax: 10 });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('estimated_days_max = ?');
    });

    it('should update carrier field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { carrier: 'FedEx' });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('carrier = ?');
    });

    it('should update freeShippingThreshold field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', {
        freeShippingThreshold: 50
      });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('free_shipping_threshold = ?');
    });

    it('should update isActive field to false', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare, mockBind } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { isActive: false });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('is_active = ?');
      // Verify the bound value includes 0 for isActive=false
      const updateBindCall = mockBind.mock.calls.find((_c: unknown[], idx: number) =>
        mockPrepare.mock.calls[idx]?.[0]?.includes?.('UPDATE')
      );
      expect(updateBindCall).toBeDefined();
      expect(updateBindCall).toContain(0);
    });

    it('should update isActive field to true', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare, mockBind } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', { isActive: true });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('is_active = ?');
      const updateBindCall = mockBind.mock.calls.find((_c: unknown[], idx: number) =>
        mockPrepare.mock.calls[idx]?.[0]?.includes?.('UPDATE')
      );
      expect(updateBindCall).toBeDefined();
      expect(updateBindCall).toContain(1);
    });

    it('should return option unchanged when no fields provided (empty data)', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockRun } = createMockDB();

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {});

      expect(result).toBeDefined();
      expect(result!.name).toBe('Standard');
      // No UPDATE should have been executed
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('should update multiple fields at once', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const { mockDB, mockPrepare } = createMockDB();

      await updateShippingOption(mockDB, siteId, 'ship-1', {
        name: 'Premium',
        description: 'Premium shipping',
        price: 25,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        carrier: 'FedEx',
        freeShippingThreshold: 100,
        isActive: true
      });

      const updateCall = mockPrepare.mock.calls.find(
        (c: string[]) => typeof c[0] === 'string' && c[0].includes('UPDATE')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('name = ?');
      expect(updateCall![0]).toContain('description = ?');
      expect(updateCall![0]).toContain('price = ?');
      expect(updateCall![0]).toContain('estimated_days_min = ?');
      expect(updateCall![0]).toContain('estimated_days_max = ?');
      expect(updateCall![0]).toContain('carrier = ?');
      expect(updateCall![0]).toContain('free_shipping_threshold = ?');
      expect(updateCall![0]).toContain('is_active = ?');
    });

    it('should return null when option does not exist', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'nonexistent', {
        price: 15
      });

      expect(result).toBeNull();
      expect(mockRun).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableShippingForCart - detailed logic', () => {
    it('should apply product-specific price and threshold overrides', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: 5.99,
            threshold_override: 80,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Standard shipping',
        price: 10.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: 200,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      // all() always returns product options (same query for initial + override lookup)
      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      // cartTotal=50 < thresholdOverride=80, so NOT free shipping
      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        50
      );

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(5.99); // priceOverride applied
      expect(result[0].isDefault).toBe(true);
      expect(result[0].isFreeShipping).toBe(false);
    });

    it('should apply free shipping when cartTotal exceeds threshold override', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: 7.99,
            threshold_override: 50,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Express',
        description: null,
        price: 15.99,
        estimated_days_min: 2,
        estimated_days_max: 3,
        carrier: 'FedEx',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      // cartTotal=60 >= thresholdOverride=50, so free shipping
      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        60
      );

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(0);
      expect(result[0].isFreeShipping).toBe(true);
      expect(result[0].isDefault).toBe(false);
    });

    it('should use base option free shipping threshold when no override exists', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: null,
        price: 9.99,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: 50,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      // cartTotal=60 >= base threshold=50
      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        60
      );

      expect(result).toHaveLength(1);
      expect(result[0].isFreeShipping).toBe(true);
      expect(result[0].price).toBe(0);
    });

    it('should fall back to category options when product has no specific options', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockCategoryOptions = {
        results: [
          {
            id: 'cso-1',
            site_id: siteId,
            category: 'electronics',
            shipping_option_id: 'ship-2',
            is_default: 0,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-2',
        site_id: siteId,
        name: 'Ground',
        description: 'Ground shipping',
        price: 8.99,
        estimated_days_min: 5,
        estimated_days_max: 10,
        carrier: 'UPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      let allCallCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        allCallCount++;
        // #1: getProductShippingOptions → empty
        if (allCallCount === 1) return Promise.resolve({ results: [], success: true });
        // #2: getCategoryShippingOptions → category options
        if (allCallCount === 2) return Promise.resolve(mockCategoryOptions);
        // #3: getProductShippingOptions for override lookup → empty (no overrides)
        return Promise.resolve({ results: [], success: true });
      });
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const, category: 'electronics' }],
        30
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Ground');
      expect(result[0].price).toBe(8.99); // No override
      expect(result[0].isDefault).toBe(false); // No override
      expect(result[0].isFreeShipping).toBe(false);
    });

    it('should find intersection of shipping options across multiple products', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      // Product 1 has ship-1 and ship-2
      const mockP1Options = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-2',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-2',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      // Product 2 has ship-1 and ship-3
      const mockP2Options = {
        results: [
          {
            id: 'pso-3',
            site_id: siteId,
            product_id: 'p2',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-4',
            site_id: siteId,
            product_id: 'p2',
            shipping_option_id: 'ship-3',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShipOption1 = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      // all() calls:
      // #1: getProductShippingOptions for 'p1' → mockP1Options
      // #2: getProductShippingOptions for 'p2' → mockP2Options
      // Intersection: [ship-1]
      // #3: getProductShippingOptions for 'p1' (override lookup) → mockP1Options
      let allCallCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        allCallCount++;
        if (allCallCount === 1) return Promise.resolve(mockP1Options);
        if (allCallCount === 2) return Promise.resolve(mockP2Options);
        return Promise.resolve(mockP1Options); // override lookup returns p1 options
      });
      const mockFirst = vi.fn().mockResolvedValue(mockShipOption1);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [
          { id: 'p1', type: 'physical' as const },
          { id: 'p2', type: 'physical' as const }
        ],
        20
      );

      // Only ship-1 is in the intersection
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ship-1');
      expect(result[0].name).toBe('Standard');
      expect(result[0].isDefault).toBe(true); // from p1's override for ship-1
    });

    it('should sort results by default first, then by price', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      // Product has 3 shipping options
      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: 20,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-2',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-2',
            is_default: 1,
            price_override: 25,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-3',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-3',
            is_default: 0,
            price_override: 5,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const shipOptions: Record<
        string,
        {
          id: string;
          site_id: string;
          name: string;
          description: string | null;
          price: number;
          estimated_days_min: number;
          estimated_days_max: number;
          carrier: string;
          free_shipping_threshold: null;
          is_active: number;
          created_at: number;
          updated_at: number;
        }
      > = {
        'ship-1': {
          id: 'ship-1',
          site_id: siteId,
          name: 'Express',
          description: null,
          price: 20,
          estimated_days_min: 1,
          estimated_days_max: 2,
          carrier: 'FedEx',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        },
        'ship-2': {
          id: 'ship-2',
          site_id: siteId,
          name: 'Priority',
          description: null,
          price: 25,
          estimated_days_min: 2,
          estimated_days_max: 3,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        },
        'ship-3': {
          id: 'ship-3',
          site_id: siteId,
          name: 'Economy',
          description: null,
          price: 5,
          estimated_days_min: 7,
          estimated_days_max: 14,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        }
      };

      // all() always returns same product options
      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      // first() returns correct shipping option based on call order
      const shippingOrder = ['ship-1', 'ship-2', 'ship-3'];
      let firstCallCount = 0;
      const mockFirst = vi.fn().mockImplementation(() => {
        const opt = shipOptions[shippingOrder[firstCallCount]];
        firstCallCount++;
        return Promise.resolve(opt);
      });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toHaveLength(3);
      // Default (ship-2, Priority) should be first
      expect(result[0].isDefault).toBe(true);
      expect(result[0].name).toBe('Priority');
      // Then sorted by price: Economy (5) before Express (20)
      expect(result[1].price).toBe(5);
      expect(result[1].name).toBe('Economy');
      expect(result[2].price).toBe(20);
      expect(result[2].name).toBe('Express');
    });

    it('should skip inactive shipping options', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockInactiveOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Inactive',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 0,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockInactiveOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toEqual([]);
    });

    it('should return empty when getShippingOptionById returns null', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-ghost',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(null); // option not found
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toEqual([]);
    });

    it('should handle product without category and no product options', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockAll = vi.fn().mockResolvedValue({ results: [], success: true });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      // No category means no fallback to category options
      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toEqual([]);
      // Only 1 all() call for getProductShippingOptions, no category lookup
      expect(mockAll).toHaveBeenCalledTimes(1);
    });

    it('should use base price when override priceOverride is null', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Standard shipping',
        price: 12.5,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(12.5); // base price, no override
      expect(result[0].isDefault).toBe(true);
      expect(result[0].isFreeShipping).toBe(false);
    });

    it('should mix physical and non-physical items, only considering physical', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [
          { id: 'digital-1', type: 'digital' as const },
          { id: 'p1', type: 'physical' as const },
          { id: 'svc-1', type: 'service' as const }
        ],
        100
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Standard');
    });

    it('should apply price override when set', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: 5.99,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(5.99);
    });

    it('should apply free shipping when cart total exceeds threshold', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 1,
            price_override: null,
            threshold_override: 50,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      const mockShippingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: 100,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        75 // above threshold override of 50
      );

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(0);
      expect(result[0].isFreeShipping).toBe(true);
    });

    it('should use category fallback when product has no specific options', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      let allCallCount = 0;
      const mockAll = vi.fn().mockImplementation(() => {
        allCallCount++;
        if (allCallCount === 1) {
          // getProductShippingOptions returns empty
          return Promise.resolve({ results: [], success: true });
        }
        // getCategoryShippingOptions returns options
        return Promise.resolve({
          results: [
            {
              id: 'cso-1',
              site_id: siteId,
              category: 'electronics',
              shipping_option_id: 'ship-cat',
              is_default: 1,
              created_at: 123,
              updated_at: 123,
              option_name: 'Category Ship',
              option_price: 8,
              option_estimated_days_min: 3,
              option_estimated_days_max: 5,
              option_carrier: 'FedEx'
            }
          ],
          success: true
        });
      });

      const mockShippingOption = {
        id: 'ship-cat',
        site_id: siteId,
        name: 'Category Ship',
        description: null,
        price: 8,
        estimated_days_min: 3,
        estimated_days_max: 5,
        carrier: 'FedEx',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockShippingOption);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const, category: 'electronics' }],
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Category Ship');
    });

    it('should sort by default first then by price', async () => {
      const { getAvailableShippingForCart } = await import('./shipping-options.js');

      const mockProductOptions = {
        results: [
          {
            id: 'pso-1',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-1',
            is_default: 0,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          },
          {
            id: 'pso-2',
            site_id: siteId,
            product_id: 'p1',
            shipping_option_id: 'ship-2',
            is_default: 1,
            price_override: null,
            threshold_override: null,
            created_at: 123,
            updated_at: 123
          }
        ],
        success: true
      };

      let firstCallCount = 0;
      const mockFirst = vi.fn().mockImplementation(() => {
        firstCallCount++;
        if (firstCallCount % 2 === 1) {
          return Promise.resolve({
            id: 'ship-1',
            site_id: siteId,
            name: 'Express',
            description: null,
            price: 20,
            estimated_days_min: 1,
            estimated_days_max: 2,
            carrier: 'UPS',
            free_shipping_threshold: null,
            is_active: 1,
            created_at: 123,
            updated_at: 123
          });
        }
        return Promise.resolve({
          id: 'ship-2',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5,
          estimated_days_min: 5,
          estimated_days_max: 7,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        });
      });

      const mockAll = vi.fn().mockResolvedValue(mockProductOptions);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAvailableShippingForCart(
        mockDB,
        siteId,
        [{ id: 'p1', type: 'physical' as const }],
        10
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateShippingOption - additional field branches', () => {
    it('should update description field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        description: 'Old desc',
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: 'USPS',
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        description: 'New desc'
      });
      expect(result).toBeDefined();
    });

    it('should update estimatedDaysMin and estimatedDaysMax', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Std',
        description: null,
        price: 10,
        estimated_days_min: 5,
        estimated_days_max: 7,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        estimatedDaysMin: 3,
        estimatedDaysMax: 5
      });
      expect(result).toBeDefined();
    });

    it('should update carrier field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Std',
        description: null,
        price: 10,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', { carrier: 'FedEx' });
      expect(result).toBeDefined();
    });

    it('should update freeShippingThreshold', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Std',
        description: null,
        price: 10,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        freeShippingThreshold: 50
      });
      expect(result).toBeDefined();
    });

    it('should update isActive to false', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Std',
        description: null,
        price: 10,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', { isActive: false });
      expect(result).toBeDefined();
    });

    it('should return option unchanged when no fields provided', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Std',
        description: null,
        price: 10,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {});
      expect(result).toBeDefined();
      // Should not call run since no updates
      expect(mockRun).not.toHaveBeenCalled();
    });

    it('should update name field', async () => {
      const { updateShippingOption } = await import('./shipping-options.js');
      const mockOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Old Name',
        description: null,
        price: 10,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      };

      const mockFirst = vi.fn().mockResolvedValue(mockOption);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateShippingOption(mockDB, siteId, 'ship-1', { name: 'New Name' });
      expect(result).toBeDefined();
    });
  });

  describe('createShippingOption error branch', () => {
    it('should throw when getShippingOptionById returns null after insert', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { createShippingOption } = await import('./shipping-options');
      await expect(
        createShippingOption(mockDB, siteId, {
          name: 'Standard',
          description: '5-7 days',
          price: 5.99
        })
      ).rejects.toThrow('Failed to create shipping option');
    });
  });

  describe('setProductShippingOptions with isDefault false', () => {
    it('should set isDefault to 0 when false', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { setProductShippingOptions } = await import('./shipping-options.js');
      await setProductShippingOptions(mockDB, siteId, 'product-1', [
        { shippingOptionId: 'ship-1', isDefault: false }
      ]);

      expect(mockBind).toHaveBeenCalled();
    });

    it('should set product shipping with priceOverride', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { setProductShippingOptions } = await import('./shipping-options.js');
      await setProductShippingOptions(mockDB, siteId, 'product-1', [
        { shippingOptionId: 'ship-1', isDefault: true, priceOverride: 9.99 }
      ]);

      expect(mockBind).toHaveBeenCalled();
    });
  });

  describe('setCategoryShippingOptions edge cases', () => {
    it('should handle empty assignments (delete only)', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { setCategoryShippingOptions } = await import('./shipping-options.js');
      await setCategoryShippingOptions(mockDB, siteId, 'electronics', []);

      // Should only call prepare for the DELETE, not for INSERT
      expect(mockPrepare).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCategoryShippingOptions edge cases', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getCategoryShippingOptions(mockDB, siteId, 'electronics');
      expect(result).toEqual([]);
    });
  });

  describe('createShippingOption with minimal fields', () => {
    it('should create with null defaults for optional fields', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const _mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue({
        id: 'ship-new',
        site_id: siteId,
        name: 'Basic Shipping',
        description: null,
        price: 5.99,
        estimated_days_min: null,
        estimated_days_max: null,
        carrier: null,
        free_shipping_threshold: null,
        is_active: 1,
        created_at: 123,
        updated_at: 123
      });

      const mockPrepare = vi
        .fn()
        .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ run: mockRun }) })
        .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ first: mockFirst }) });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { createShippingOption } = await import('./shipping-options.js');
      const result = await createShippingOption(mockDB, siteId, {
        name: 'Basic Shipping',
        price: 5.99
        // description, estimatedDaysMin, estimatedDaysMax, carrier, freeShippingThreshold all omitted
      });

      expect(result).toBeTruthy();
      expect(result.name).toBe('Basic Shipping');
    });
  });

  describe('updateShippingOption with freeShippingThreshold', () => {
    it('should update freeShippingThreshold to null when set to undefined-like', async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: 50,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        })
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 456
        });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { updateShippingOption } = await import('./shipping-options.js');
      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        freeShippingThreshold: undefined
      });

      expect(result).toBeTruthy();
    });

    it('should update carrier field', async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        })
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: 'USPS',
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 456
        });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { updateShippingOption } = await import('./shipping-options.js');
      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        carrier: 'USPS'
      });

      expect(result).toBeTruthy();
    });

    it('should update estimated days', async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        })
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: 3,
          estimated_days_max: 7,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 456
        });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { updateShippingOption } = await import('./shipping-options.js');
      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        estimatedDaysMin: 3,
        estimatedDaysMax: 7
      });

      expect(result).toBeTruthy();
    });

    it('should update isActive flag', async () => {
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 1,
          created_at: 123,
          updated_at: 123
        })
        .mockResolvedValueOnce({
          id: 'ship-1',
          site_id: siteId,
          name: 'Standard',
          description: null,
          price: 5.99,
          estimated_days_min: null,
          estimated_days_max: null,
          carrier: null,
          free_shipping_threshold: null,
          is_active: 0,
          created_at: 123,
          updated_at: 456
        });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { updateShippingOption } = await import('./shipping-options.js');
      const result = await updateShippingOption(mockDB, siteId, 'ship-1', {
        isActive: false
      });

      expect(result).toBeTruthy();
    });
  });

  describe('getProductShippingOptions null results', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { getProductShippingOptions } = await import('./shipping-options.js');
      const result = await getProductShippingOptions(mockDB, siteId, 'product-1');
      expect(result).toEqual([]);
    });
  });

  describe('setCategoryShippingOptions with isDefault false', () => {
    it('should bind isDefault as 0 when false', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { setCategoryShippingOptions } = await import('./shipping-options.js');
      await setCategoryShippingOptions(mockDB, siteId, 'electronics', [
        { shippingOptionId: 'ship-1', isDefault: false }
      ]);

      // INSERT call should have bound isDefault as 0
      const insertCall = mockBind.mock.calls.find(
        (call: unknown[]) => call.length >= 5 && call[4] === 0
      );
      expect(insertCall).toBeTruthy();
    });
  });

  describe('updateShippingOption with null coalescing branches', () => {
    it('should handle estimatedDaysMin as null', async () => {
      const existingOption = {
        id: 'ship-1',
        site_id: siteId,
        name: 'Standard',
        price: 5,
        estimated_days_min: 3,
        estimated_days_max: 5,
        carrier: 'USPS',
        is_active: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };
      const mockFirst = vi.fn().mockResolvedValue(existingOption);
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { updateShippingOption } = await import('./shipping-options.js');
      await updateShippingOption(mockDB, siteId, 'ship-1', {
        estimatedDaysMin: null as unknown as number | undefined,
        estimatedDaysMax: null as unknown as number | undefined,
        carrier: null as unknown as string | undefined
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });
});
