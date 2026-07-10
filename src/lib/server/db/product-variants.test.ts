import { describe, it, expect, vi } from 'vitest';
import {
  getProductVariants,
  getProductVariantById,
  setProductVariants,
  deleteProductVariants,
  type DBProductVariant
} from './product-variants';

describe('Product Variants Repository', () => {
  const siteId = 'test-site';
  const productId = 'product-1';

  const mockVariant: DBProductVariant = {
    id: 'variant-1',
    site_id: siteId,
    product_id: productId,
    label: 'Medium / Black',
    size: 'M',
    color: 'Black',
    sku: 'HOOD-M-BLK',
    price: 39.99,
    stock_quantity: null,
    sort_order: 0,
    printful_sync_variant_id: 111,
    printful_variant_id: 4012,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('getProductVariants', () => {
    it('lists variants for a product ordered by sort_order', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockVariant] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductVariants(mockDB, siteId, productId);

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY sort_order ASC'));
      expect(mockBind).toHaveBeenCalledWith(siteId, productId);
      expect(result).toEqual([mockVariant]);
    });

    it('returns an empty array when there are none', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductVariants(mockDB, siteId, productId);

      expect(result).toEqual([]);
    });
  });

  describe('getProductVariantById', () => {
    it('gets a variant by id scoped by site', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockVariant);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductVariantById(mockDB, siteId, 'variant-1');

      expect(mockBind).toHaveBeenCalledWith('variant-1', siteId);
      expect(result).toEqual(mockVariant);
    });
  });

  describe('setProductVariants', () => {
    it('deletes existing variants then inserts the new set', async () => {
      const deleteRun = vi.fn().mockResolvedValue({});
      const deleteBind = vi.fn().mockReturnValue({ run: deleteRun });
      const insertRun = vi.fn().mockResolvedValue({});
      const insertBind = vi.fn().mockReturnValue({ run: insertRun });
      const listAll = vi.fn().mockResolvedValue({ results: [mockVariant] });
      const listBind = vi.fn().mockReturnValue({ all: listAll });

      const mockPrepare = vi.fn((sql: string) => {
        if (sql.startsWith('DELETE')) return { bind: deleteBind };
        if (sql.startsWith('INSERT')) return { bind: insertBind };
        return { bind: listBind };
      });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await setProductVariants(mockDB, siteId, productId, [
        {
          label: 'Medium / Black',
          size: 'M',
          color: 'Black',
          sku: 'HOOD-M-BLK',
          price: 39.99,
          printfulSyncVariantId: 111,
          printfulVariantId: 4012
        }
      ]);

      expect(deleteBind).toHaveBeenCalledWith(productId, siteId);
      expect(insertBind).toHaveBeenCalledWith(
        expect.any(String),
        siteId,
        productId,
        'Medium / Black',
        'M',
        'Black',
        'HOOD-M-BLK',
        39.99,
        null,
        0,
        111,
        4012,
        expect.any(Number),
        expect.any(Number)
      );
      expect(result).toEqual([mockVariant]);
    });

    it('assigns sort_order by array index when not given', async () => {
      const deleteBind = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) });
      const insertBind = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) });
      const listBind = vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue({ results: [] }) });

      const mockPrepare = vi.fn((sql: string) => {
        if (sql.startsWith('DELETE')) return { bind: deleteBind };
        if (sql.startsWith('INSERT')) return { bind: insertBind };
        return { bind: listBind };
      });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await setProductVariants(mockDB, siteId, productId, [
        { label: 'A', price: 10 },
        { label: 'B', price: 12 }
      ]);

      expect(insertBind).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        siteId,
        productId,
        'A',
        null,
        null,
        null,
        10,
        null,
        0,
        null,
        null,
        expect.any(Number),
        expect.any(Number)
      );
      expect(insertBind).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        siteId,
        productId,
        'B',
        null,
        null,
        null,
        12,
        null,
        1,
        null,
        null,
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('deleteProductVariants', () => {
    it('deletes all variants for a product scoped by site', async () => {
      const mockRun = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await deleteProductVariants(mockDB, siteId, productId);

      expect(mockBind).toHaveBeenCalledWith(productId, siteId);
      expect(mockRun).toHaveBeenCalled();
    });
  });
});
