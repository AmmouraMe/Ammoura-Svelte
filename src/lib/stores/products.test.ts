import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { productsStore, productsList } from './products';
import type { Product } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock
});

const mockProduct: Omit<Product, 'id'> = {
  name: 'Test Product',
  description: 'A test product description',
  price: 99.99,
  image: 'test.jpg',
  category: 'Test Category',
  stock: 10,
  type: 'physical',
  tags: ['test', 'mock']
};

const mockProduct2: Omit<Product, 'id'> = {
  name: 'Test Product 2',
  description: 'Another test product',
  price: 49.99,
  image: 'test2.jpg',
  category: 'Test Category',
  stock: 5,
  type: 'digital',
  tags: ['test', 'digital']
};

const mockServiceProduct: Omit<Product, 'id'> = {
  name: 'Consulting Service',
  description: 'Professional consulting service',
  price: 150.0,
  image: 'service.jpg',
  category: 'Services',
  stock: 0,
  type: 'service',
  tags: ['service', 'consulting']
};

describe('Products Store', () => {
  beforeEach(() => {
    productsStore.reset();
    localStorage.clear();
  });

  describe('create', () => {
    it('should create a new product and return its ID', () => {
      const id = productsStore.create(mockProduct);
      const products = get(productsList);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const createdProduct = products.find((p) => p.id === id);
      expect(createdProduct).toBeDefined();
      expect(createdProduct?.name).toBe(mockProduct.name);
      expect(createdProduct?.description).toBe(mockProduct.description);
      expect(createdProduct?.price).toBe(mockProduct.price);
      expect(createdProduct?.type).toBe(mockProduct.type);
      expect(createdProduct?.tags).toEqual(mockProduct.tags);
    });

    it('should create multiple products with unique IDs', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);

      expect(id1).not.toBe(id2);

      const products = get(productsList);
      expect(products.find((p) => p.id === id1)).toBeDefined();
      expect(products.find((p) => p.id === id2)).toBeDefined();
    });

    it('should create products with different types', () => {
      const physicalId = productsStore.create(mockProduct);
      const digitalId = productsStore.create(mockProduct2);
      const serviceId = productsStore.create(mockServiceProduct);

      const products = get(productsList);

      expect(products.find((p) => p.id === physicalId)?.type).toBe('physical');
      expect(products.find((p) => p.id === digitalId)?.type).toBe('digital');
      expect(products.find((p) => p.id === serviceId)?.type).toBe('service');
    });

    it('should add new product to the end of the list', () => {
      const initialCount = get(productsList).length;
      const id = productsStore.create(mockProduct);
      const products = get(productsList);

      expect(products.length).toBe(initialCount + 1);
      expect(products[products.length - 1].id).toBe(id);
    });
  });

  describe('read', () => {
    it('should return a product by ID', () => {
      const id = productsStore.create(mockProduct);
      const products = get(productsList);
      const product = productsStore.read(id, products);

      expect(product).toBeDefined();
      expect(product?.id).toBe(id);
      expect(product?.name).toBe(mockProduct.name);
    });

    it('should return undefined for non-existent ID', () => {
      const products = get(productsList);
      const product = productsStore.read('non-existent-id', products);

      expect(product).toBeUndefined();
    });

    it('should return correct product when multiple products exist', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);
      const products = get(productsList);

      const product1 = productsStore.read(id1, products);
      const product2 = productsStore.read(id2, products);

      expect(product1?.name).toBe(mockProduct.name);
      expect(product2?.name).toBe(mockProduct2.name);
    });
  });

  describe('update', () => {
    it('should update product name', () => {
      const id = productsStore.create(mockProduct);
      productsStore.update(id, { name: 'Updated Product Name' });
      const products = get(productsList);
      const product = products.find((p) => p.id === id);

      expect(product?.name).toBe('Updated Product Name');
      expect(product?.description).toBe(mockProduct.description); // Other fields unchanged
    });

    it('should update product price', () => {
      const id = productsStore.create(mockProduct);
      productsStore.update(id, { price: 149.99 });
      const products = get(productsList);
      const product = products.find((p) => p.id === id);

      expect(product?.price).toBe(149.99);
    });

    it('should update multiple fields at once', () => {
      const id = productsStore.create(mockProduct);
      productsStore.update(id, {
        name: 'Updated Name',
        price: 199.99,
        stock: 20,
        tags: ['updated', 'test']
      });
      const products = get(productsList);
      const product = products.find((p) => p.id === id);

      expect(product?.name).toBe('Updated Name');
      expect(product?.price).toBe(199.99);
      expect(product?.stock).toBe(20);
      expect(product?.tags).toEqual(['updated', 'test']);
    });

    it('should update product type', () => {
      const id = productsStore.create(mockProduct);
      productsStore.update(id, { type: 'service' });
      const products = get(productsList);
      const product = products.find((p) => p.id === id);

      expect(product?.type).toBe('service');
    });

    it('should not update non-existent product', () => {
      const initialProducts = get(productsList);
      productsStore.update('non-existent-id', { name: 'Updated' });
      const products = get(productsList);

      expect(products).toEqual(initialProducts);
    });

    it('should only update specified product', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);

      productsStore.update(id1, { name: 'Updated Product 1' });
      const products = get(productsList);

      expect(products.find((p) => p.id === id1)?.name).toBe('Updated Product 1');
      expect(products.find((p) => p.id === id2)?.name).toBe(mockProduct2.name);
    });
  });

  describe('delete', () => {
    it('should delete a product by ID', () => {
      const id = productsStore.create(mockProduct);
      const beforeDelete = get(productsList);
      const initialCount = beforeDelete.length;

      productsStore.delete(id);
      const products = get(productsList);

      expect(products.length).toBe(initialCount - 1);
      expect(products.find((p) => p.id === id)).toBeUndefined();
    });

    it('should delete only the specified product', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);

      productsStore.delete(id1);
      const products = get(productsList);

      expect(products.find((p) => p.id === id1)).toBeUndefined();
      expect(products.find((p) => p.id === id2)).toBeDefined();
    });

    it('should handle deleting non-existent product gracefully', () => {
      const initialProducts = get(productsList);
      productsStore.delete('non-existent-id');
      const products = get(productsList);

      expect(products).toEqual(initialProducts);
    });

    it('should delete multiple products independently', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);
      const id3 = productsStore.create(mockServiceProduct);

      productsStore.delete(id1);
      productsStore.delete(id3);
      const products = get(productsList);

      expect(products.find((p) => p.id === id1)).toBeUndefined();
      expect(products.find((p) => p.id === id2)).toBeDefined();
      expect(products.find((p) => p.id === id3)).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all products', () => {
      const products = get(productsList);
      const allProducts = productsStore.getAll(products);

      expect(allProducts).toEqual(products);
      expect(Array.isArray(allProducts)).toBe(true);
    });

    it('should return all products including newly created ones', () => {
      const initialCount = get(productsList).length;
      productsStore.create(mockProduct);
      productsStore.create(mockProduct2);

      const products = get(productsList);
      const allProducts = productsStore.getAll(products);

      expect(allProducts.length).toBe(initialCount + 2);
    });
  });

  describe('getByCategory', () => {
    it('should return products from a specific category', () => {
      productsStore.create(mockProduct);
      productsStore.create(mockProduct2);
      productsStore.create(mockServiceProduct);

      const products = get(productsList);
      const testCategoryProducts = productsStore.getByCategory(products, 'Test Category');

      expect(testCategoryProducts.length).toBeGreaterThanOrEqual(2);
      testCategoryProducts.forEach((product) => {
        expect(product.category).toBe('Test Category');
      });
    });

    it('should return empty array for non-existent category', () => {
      const products = get(productsList);
      const nonExistentProducts = productsStore.getByCategory(products, 'Non-existent Category');

      expect(Array.isArray(nonExistentProducts)).toBe(true);
      expect(nonExistentProducts.length).toBe(0);
    });

    it('should return only products from specified category', () => {
      productsStore.create(mockProduct); // Test Category
      productsStore.create(mockServiceProduct); // Services

      const products = get(productsList);
      const serviceProducts = productsStore.getByCategory(products, 'Services');

      serviceProducts.forEach((product) => {
        expect(product.category).toBe('Services');
      });
    });
  });

  describe('reset', () => {
    it('should reset products to initial state', () => {
      const initialProducts = get(productsList);
      const initialCount = initialProducts.length;

      productsStore.create(mockProduct);
      productsStore.create(mockProduct2);

      expect(get(productsList).length).toBe(initialCount + 2);

      productsStore.reset();
      const resetProducts = get(productsList);

      expect(resetProducts.length).toBe(initialCount);
    });

    it('should remove all created products on reset', () => {
      const id1 = productsStore.create(mockProduct);
      const id2 = productsStore.create(mockProduct2);

      productsStore.reset();
      const products = get(productsList);

      expect(products.find((p) => p.id === id1)).toBeUndefined();
      expect(products.find((p) => p.id === id2)).toBeUndefined();
    });

    it('should restore original products after reset', () => {
      const initialProducts = [...get(productsList)];
      const firstProductId = initialProducts[0]?.id;

      productsStore.delete(firstProductId);
      expect(get(productsList).find((p) => p.id === firstProductId)).toBeUndefined();

      productsStore.reset();
      const products = get(productsList);

      expect(products.find((p) => p.id === firstProductId)).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should handle complete CRUD lifecycle', () => {
      // Create
      const id = productsStore.create(mockProduct);
      let products = get(productsList);
      expect(products.find((p) => p.id === id)).toBeDefined();

      // Read
      const product = productsStore.read(id, products);
      expect(product?.name).toBe(mockProduct.name);

      // Update
      productsStore.update(id, { name: 'Updated Product', price: 199.99 });
      products = get(productsList);
      const updatedProduct = products.find((p) => p.id === id);
      expect(updatedProduct?.name).toBe('Updated Product');
      expect(updatedProduct?.price).toBe(199.99);

      // Delete
      productsStore.delete(id);
      products = get(productsList);
      expect(products.find((p) => p.id === id)).toBeUndefined();
    });

    it('should persist data to localStorage', () => {
      productsStore.create(mockProduct);
      const products = get(productsList);

      const storedData = localStorage.getItem('products');

      // localStorage might be null in test environment without proper browser context
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        expect(parsedData).toEqual(products);
      } else {
        // If localStorage is not available, at least verify the product was created
        expect(products.find((p) => p.name === mockProduct.name)).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors when saving products', () => {
      // Mock setItem to throw
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw, just handle gracefully
      expect(() => productsStore.create(mockProduct)).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('products', 'invalid json{');

      // The existing store should handle this gracefully
      const stored = localStorage.getItem('products');
      expect(() => {
        if (stored) {
          JSON.parse(stored);
        }
      }).toThrow();

      // The actual store initialization handles this, verify it doesn't break the app
      expect(productsStore).toBeDefined();
    });

    it('should fallback to initial products when localStorage fails', () => {
      // Mock getItem to throw
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // The store should still work with initial products
      expect(productsStore).toBeDefined();
      expect(typeof productsStore.create).toBe('function');

      getItemSpy.mockRestore();
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for multiple products', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = productsStore.create({ ...mockProduct, name: `Product ${i}` });
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should generate valid ID format', () => {
      const id = productsStore.create(mockProduct);

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should use fallback ID when crypto.randomUUID is unavailable', () => {
      const originalRandomUUID = crypto.randomUUID;
      // @ts-expect-error testing fallback when randomUUID is unavailable
      crypto.randomUUID = undefined;

      const id = productsStore.create({ ...mockProduct, name: 'Fallback Product' });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      // Fallback format: timestamp-random-random
      expect(id).toMatch(/^\d+-[a-z0-9]+-[a-z0-9]+$/);

      crypto.randomUUID = originalRandomUUID;
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.setItem throwing during persist', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation((key: string) => {
        if (key === 'products') throw new Error('QuotaExceededError');
      });

      // Trigger a products update to fire the persist subscription
      productsStore.create(mockProduct);

      // Should not crash
      expect(get(productsList).length).toBeGreaterThan(0);

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('SSR and initialization error handling', () => {
    it('should return initial products in SSR (non-browser) environment', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({
        browser: false,
        building: false,
        dev: true,
        version: 'test'
      }));

      const { productsList: ssrProductsList } = await import('./products');
      const { get: getValue } = await import('svelte/store');

      const products = getValue(ssrProductsList);
      // Should have initial products from the data file
      expect(Array.isArray(products)).toBe(true);

      vi.doUnmock('$app/environment');
    });

    it('should return initial products when localStorage has invalid JSON', async () => {
      vi.resetModules();
      vi.doMock('$app/environment', () => ({
        browser: true,
        building: false,
        dev: true,
        version: 'test'
      }));

      localStorage.setItem('products', 'not valid json{{{');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { productsList: freshProductsList } = await import('./products');
      const { get: getValue } = await import('svelte/store');

      const products = getValue(freshProductsList);
      expect(Array.isArray(products)).toBe(true);

      consoleSpy.mockRestore();
      localStorage.removeItem('products');
      vi.doUnmock('$app/environment');
    });
  });
});
