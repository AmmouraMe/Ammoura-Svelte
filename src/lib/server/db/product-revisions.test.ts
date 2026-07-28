import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createProductRevision,
  getProductRevisions,
  getProductRevisionById,
  getCurrentProductRevision,
  restoreProductRevision
} from './product-revisions';
import type { D1Database } from '@cloudflare/workers-types';
import type { DBProduct } from './products';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-' + Date.now()
}));

describe('Product Revisions', () => {
  let mockDb: D1Database;
  const siteId = 'site-1';
  const productId = 'product-1';

  const mockProduct: DBProduct = {
    id: productId,
    site_id: siteId,
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    image: '/test.jpg',
    category: 'electronics',
    stock: 10,
    type: 'physical',
    tags: '["tag1","tag2"]',
    template_id: null,
    fulfillment_mode: 'manual',
    created_at: 1234567890,
    updated_at: 1234567890
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;
  });

  describe('createProductRevision', () => {
    it('should create a revision from current product state', async () => {
      const mockGetProductStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockProduct)
      };

      const mockGetCurrentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockBatchStatement = {
        bind: vi.fn().mockReturnThis()
      };

      const mockFulfillmentStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockShippingStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetProductStatement) // getProductById
        .mockReturnValueOnce(mockFulfillmentStatement) // getProductFulfillmentOptions
        .mockReturnValueOnce(mockShippingStatement) // getProductShippingOptions
        .mockReturnValueOnce(mockGetCurrentStatement) // getCurrentRevision
        .mockReturnValueOnce(mockHashesStatement) // createRevision - get hashes
        .mockReturnValueOnce(mockInsertStatement) // createRevision - insert
        .mockReturnValue(mockBatchStatement); // setCurrentRevision - batch

      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await createProductRevision(
        mockDb,
        siteId,
        productId,
        'user-1',
        'Initial save'
      );

      expect(result.entity_type).toBe('product');
      expect(result.entity_id).toBe(productId);
      expect(result.data.name).toBe('Test Product');
      expect(result.data.price).toBe(99.99);
    });

    it('should throw error when product not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await expect(createProductRevision(mockDb, siteId, 'nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should link to parent revision if exists', async () => {
      const mockGetProductStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockProduct)
      };

      const mockParentRevision = {
        id: 'parent-rev',
        site_id: siteId,
        entity_type: 'product',
        entity_id: productId,
        revision_hash: 'parent123',
        data: JSON.stringify({ name: 'Old Product' }),
        created_at: 1234567880,
        is_current: true
      };

      const mockGetCurrentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockParentRevision)
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockBatchStatement = {
        bind: vi.fn().mockReturnThis()
      };

      const mockFulfillmentStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockShippingStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetProductStatement)
        .mockReturnValueOnce(mockFulfillmentStatement)
        .mockReturnValueOnce(mockShippingStatement)
        .mockReturnValueOnce(mockGetCurrentStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValue(mockBatchStatement);

      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await createProductRevision(mockDb, siteId, productId);

      expect(result.parent_revision_id).toBe('parent-rev');
    });
  });

  describe('getProductRevisions', () => {
    it('should retrieve all product revisions', async () => {
      const mockRevisions = [
        {
          id: 'rev-1',
          site_id: siteId,
          entity_type: 'product',
          entity_id: productId,
          revision_hash: 'abc123',
          data: JSON.stringify({ name: 'Product V1' }),
          created_at: 1234567890,
          is_current: false
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRevisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getProductRevisions(mockDb, siteId, productId);

      expect(result).toHaveLength(1);
      expect(result[0].data.name).toBe('Product V1');
    });

    it('should apply limit when specified', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await getProductRevisions(mockDb, siteId, productId, 10);

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('LIMIT');
    });
  });

  describe('getProductRevisionById', () => {
    it('should retrieve a specific product revision', async () => {
      const mockRevision = {
        id: 'rev-1',
        site_id: siteId,
        entity_type: 'product',
        entity_id: productId,
        revision_hash: 'abc123',
        data: JSON.stringify({ name: 'Product V1', price: 50 }),
        created_at: 1234567890,
        is_current: false
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevision)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getProductRevisionById(mockDb, siteId, 'rev-1');

      expect(result).not.toBeNull();
      expect(result!.data.name).toBe('Product V1');
      expect(result!.data.price).toBe(50);
    });
  });

  describe('getCurrentProductRevision', () => {
    it('should retrieve the current product revision', async () => {
      const mockRevision = {
        id: 'rev-current',
        site_id: siteId,
        entity_type: 'product',
        entity_id: productId,
        revision_hash: 'current1',
        data: JSON.stringify({ name: 'Current Product' }),
        created_at: 1234567890,
        is_current: true
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevision)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getCurrentProductRevision(mockDb, siteId, productId);

      expect(result).not.toBeNull();
      expect(result!.is_current).toBe(true);
      expect(result!.data.name).toBe('Current Product');
    });
  });

  describe('restoreProductRevision', () => {
    it('should restore a product revision', async () => {
      const mockRevisionData = {
        name: 'Old Product',
        description: 'Old Description',
        price: 75,
        image: '/old.jpg',
        category: 'old-cat',
        stock: 5,
        type: 'physical' as const,
        tags: '["old"]',
        template_id: null,
        fulfillment_mode: 'manual',
        fulfillmentOptions: [],
        shippingOptions: []
      };

      const mockRevision = {
        id: 'rev-1',
        site_id: siteId,
        entity_type: 'product' as const,
        entity_id: productId,
        revision_hash: 'abc123',
        data: JSON.stringify(mockRevisionData),
        created_at: 1234567880,
        is_current: false
      };

      const mockFirstRevision = vi.fn().mockResolvedValue(mockRevision);
      const mockBindGetRevision = vi.fn().mockReturnValue({ first: mockFirstRevision });

      const mockFirstCurrent = vi.fn().mockResolvedValue(null);
      const mockBindGetCurrent = vi.fn().mockReturnValue({ first: mockFirstCurrent });

      const mockAllHashes = vi.fn().mockResolvedValue({ results: [] });
      const mockBindHashes = vi.fn().mockReturnValue({ all: mockAllHashes });

      const mockRunInsert = vi.fn().mockResolvedValue({});
      const mockBindInsert = vi.fn().mockReturnValue({ run: mockRunInsert });

      const mockBindBatch1 = vi.fn().mockReturnThis();
      const mockBindBatch2 = vi.fn().mockReturnThis();

      const mockFirstProduct = vi.fn().mockResolvedValue(mockProduct);
      const mockBindGetProduct1 = vi.fn().mockReturnValue({ first: mockFirstProduct });
      const mockBindGetProduct2 = vi.fn().mockReturnValue({ first: mockFirstProduct });

      const mockRunUpdate = vi.fn().mockResolvedValue({});
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRunUpdate });

      const mockRunDelete1 = vi.fn().mockResolvedValue({});
      const mockBindDelete1 = vi.fn().mockReturnValue({ run: mockRunDelete1 });

      const mockRunDelete2 = vi.fn().mockResolvedValue({});
      const mockBindDelete2 = vi.fn().mockReturnValue({ run: mockRunDelete2 });

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ bind: mockBindGetRevision }) // 1. getRevisionById
        .mockReturnValueOnce({ bind: mockBindGetCurrent }) // 2. getCurrentRevision
        .mockReturnValueOnce({ bind: mockBindHashes }) // 3. createRevision - check hashes
        .mockReturnValueOnce({ bind: mockBindInsert }) // 4. createRevision - insert
        .mockReturnValueOnce({ bind: mockBindBatch1 }) // 5. setCurrentRevision batch 1
        .mockReturnValueOnce({ bind: mockBindBatch2 }) // 6. setCurrentRevision batch 2
        .mockReturnValueOnce({ bind: mockBindGetProduct1 }) // 7. updateProduct - getProductById (check exists)
        .mockReturnValueOnce({ bind: mockBindUpdate }) // 8. updateProduct - UPDATE statement
        .mockReturnValueOnce({ bind: mockBindGetProduct2 }) // 9. updateProduct - getProductById (return value)
        .mockReturnValueOnce({ bind: mockBindDelete1 }) // 10. setProductFulfillmentOptions - DELETE
        .mockReturnValueOnce({ bind: mockBindDelete2 }); // 11. setProductShippingOptions - DELETE

      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await restoreProductRevision(mockDb, siteId, productId, 'rev-1', 'user-1');

      expect(result.data.name).toBe('Old Product');
      expect(result.data.price).toBe(75);
      expect(result.message).toContain('Restored from revision');
    });
  });
});
