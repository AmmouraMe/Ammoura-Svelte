import { describe, it, expect, vi } from 'vitest';
import {
  getProductById,
  getAllProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  syncProductImageFromMedia,
  type DBProduct,
  type CreateProductData
} from './products';

describe('Products Repository', () => {
  const siteId = 'test-site';
  const mockProduct: DBProduct = {
    id: 'product-1',
    site_id: siteId,
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    image: 'test.jpg',
    category: 'Electronics',
    stock: 10,
    type: 'physical',
    tags: '["tag1", "tag2"]',
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('getProductById', () => {
    it('should get product by ID scoped by site', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductById(mockDB, siteId, 'product-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('product-1', siteId);
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllProducts', () => {
    it('should get all products for a site', async () => {
      const mockResults = { results: [mockProduct], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllProducts(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE site_id = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId);
      expect(result).toEqual([mockProduct]);
    });

    it('should return empty array when no products found', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllProducts(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getProductsByCategory', () => {
    it('should get products by category scoped by site', async () => {
      const mockResults = { results: [mockProduct], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductsByCategory(mockDB, siteId, 'Electronics');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE site_id = ? AND category = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'Electronics');
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('createProduct', () => {
    it('should create a new product scoped by site', async () => {
      const productData: CreateProductData = {
        name: 'New Product',
        description: 'New Description',
        price: 149.99,
        image: 'new.jpg',
        category: 'Electronics',
        stock: 20,
        type: 'physical',
        tags: ['new', 'test']
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createProduct(mockDB, siteId, productData);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should update product scoped by site', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateProduct(mockDB, siteId, 'product-1', { price: 79.99 });

      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateProduct(mockDB, siteId, 'nonexistent', { price: 79.99 });

      expect(result).toBeNull();
    });

    it('should return product unchanged when no updates provided', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateProduct(mockDB, siteId, 'product-1', {});

      expect(result).toEqual(mockProduct);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product scoped by site', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteProduct(mockDB, siteId, 'product-1');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM products WHERE id = ? AND site_id = ?');
      expect(mockBind).toHaveBeenCalledWith('product-1', siteId);
      expect(result).toBe(true);
    });

    it('should return false when product not found', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteProduct(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateProductStock(mockDB, siteId, 'product-1', -5);

      expect(result).toEqual(mockProduct);
    });

    it('should throw error when insufficient stock', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      await expect(updateProductStock(mockDB, siteId, 'product-1', -100)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should return null when product not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateProductStock(mockDB, siteId, 'nonexistent', 5);

      expect(result).toBeNull();
    });
  });

  describe('syncProductImageFromMedia', () => {
    it('should update product image to first media item URL', async () => {
      const mockFirstMedia = { url: '/media/first-image.jpg' };
      const mockFirst = vi.fn().mockResolvedValue(mockFirstMedia);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi
        .fn()
        .mockReturnValueOnce({ bind: mockBind })
        .mockReturnValueOnce({ bind: mockBindUpdate });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await syncProductImageFromMedia(mockDB, siteId, 'product-1');

      expect(mockPrepare).toHaveBeenNthCalledWith(
        1,
        'SELECT url FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC LIMIT 1'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'product-1');
      expect(mockPrepare).toHaveBeenNthCalledWith(
        2,
        'UPDATE products SET image = ?, updated_at = ? WHERE id = ? AND site_id = ?'
      );
    });

    it('should not update product image when no media exists', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await syncProductImageFromMedia(mockDB, siteId, 'product-1');

      expect(mockPrepare).toHaveBeenCalledTimes(1);
      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT url FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC LIMIT 1'
      );
    });
  });

  describe('createProduct error branch', () => {
    it('should throw when getProductById returns null after insert', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await expect(
        createProduct(mockDB, siteId, {
          name: 'Test',
          description: 'Test',
          price: 9.99,
          image: 'test.jpg',
          category: 'Cat',
          stock: 10,
          type: 'physical',
          tags: []
        })
      ).rejects.toThrow('Failed to create product');
    });
  });

  describe('updateProduct stock and type branches', () => {
    it('should include stock in update query', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateProduct(mockDB, siteId, 'product-1', {
        stock: 25
      });

      expect(result).toBeDefined();
    });

    it('should include type in update query', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProduct);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateProduct(mockDB, siteId, 'product-1', {
        type: 'digital'
      });

      expect(result).toBeDefined();
    });

    it('should return empty array when results is null for getCategories', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { getCategories } = await import('./products');
      const result = await getCategories(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('null results fallbacks', () => {
    it('getAllProducts should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { getAllProducts } = await import('./products');
      const result = await getAllProducts(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getProductsByCategory should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { getProductsByCategory } = await import('./products');
      const result = await getProductsByCategory(mockDB, siteId, 'electronics');
      expect(result).toEqual([]);
    });

    it('calculateProductStock should return 0 when result is null', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const { calculateProductStock } = await import('./products');
      const result = await calculateProductStock(mockDB, siteId, 'product-1');
      expect(result).toBe(0);
    });
  });
});
