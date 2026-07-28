import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductMedia,
  getProductMediaById,
  createProductMedia,
  updateProductMediaOrder,
  deleteProductMedia,
  getMediaLibrary,
  getMediaLibraryItemById,
  createMediaLibraryItem,
  incrementMediaUsedCount,
  decrementMediaUsedCount,
  deleteMediaLibraryItem,
  getFirstProductMediaUrl,
  type DBProductMedia,
  type DBMediaLibraryItem,
  type CreateProductMediaData,
  type CreateMediaLibraryItemData
} from './media';
import * as connection from './connection';

describe('Product Media Repository', () => {
  const siteId = 'test-site';
  const productId = 'test-product';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProductMedia: DBProductMedia = {
    id: 'media-1',
    site_id: siteId,
    product_id: productId,
    type: 'image',
    url: '/media/test.jpg',
    thumbnail_url: null,
    filename: 'test.jpg',
    size: 1024,
    mime_type: 'image/jpeg',
    width: 800,
    height: 600,
    duration: null,
    display_order: 0,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  const mockMediaLibraryItem: DBMediaLibraryItem = {
    id: 'lib-1',
    site_id: siteId,
    type: 'image',
    url: '/media/library/test.jpg',
    thumbnail_url: null,
    filename: 'test.jpg',
    size: 1024,
    mime_type: 'image/jpeg',
    width: 800,
    height: 600,
    duration: null,
    used_count: 0,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('getProductMedia', () => {
    it('should get all product media scoped by site', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockProductMedia] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductMedia(mockDB, siteId, productId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, productId);
      expect(result).toEqual([mockProductMedia]);
    });

    it('should return empty array when results are undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductMedia(mockDB, siteId, productId);

      expect(result).toEqual([]);
    });
  });

  describe('getProductMediaById', () => {
    it('should get product media by ID', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockProductMedia);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductMediaById(mockDB, siteId, 'media-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM product_media WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('media-1', siteId);
      expect(result).toEqual(mockProductMedia);
    });

    it('should return null when media not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getProductMediaById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createProductMedia', () => {
    it('should create a new product media item with full data', async () => {
      const mockId = 'new-media-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateProductMediaData = {
        productId: productId,
        type: 'image',
        url: '/media/new.jpg',
        thumbnailUrl: '/media/new-thumb.jpg',
        filename: 'new.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        duration: undefined,
        displayOrder: 1
      };

      const expectedMedia: DBProductMedia = {
        id: mockId,
        site_id: siteId,
        product_id: productId,
        type: 'image',
        url: createData.url,
        thumbnail_url: createData.thumbnailUrl!,
        filename: createData.filename,
        size: createData.size,
        mime_type: createData.mimeType,
        width: createData.width!,
        height: createData.height!,
        duration: null,
        display_order: createData.displayOrder,
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(expectedMedia);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      const result = await createProductMedia(mockDB, siteId, createData);

      expect(mockBind).toHaveBeenCalledWith(
        mockId,
        siteId,
        productId,
        'image',
        createData.url,
        createData.thumbnailUrl,
        createData.filename,
        createData.size,
        createData.mimeType,
        createData.width,
        createData.height,
        null,
        createData.displayOrder,
        mockTimestamp,
        mockTimestamp
      );
      expect(result).toEqual(expectedMedia);
    });

    it('should create product media with minimal data (no optional fields)', async () => {
      const mockId = 'new-media-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateProductMediaData = {
        productId: productId,
        type: 'video',
        url: '/media/video.mp4',
        filename: 'video.mp4',
        size: 5000000,
        mimeType: 'video/mp4',
        displayOrder: 0
      };

      const expectedMedia: DBProductMedia = {
        id: mockId,
        site_id: siteId,
        product_id: productId,
        type: 'video',
        url: createData.url,
        thumbnail_url: null,
        filename: createData.filename,
        size: createData.size,
        mime_type: createData.mimeType,
        width: null,
        height: null,
        duration: null,
        display_order: createData.displayOrder,
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(expectedMedia);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      const result = await createProductMedia(mockDB, siteId, createData);

      expect(mockBind).toHaveBeenCalledWith(
        mockId,
        siteId,
        productId,
        'video',
        createData.url,
        null,
        createData.filename,
        createData.size,
        createData.mimeType,
        null,
        null,
        null,
        createData.displayOrder,
        mockTimestamp,
        mockTimestamp
      );
      expect(result).toEqual(expectedMedia);
    });

    it('should throw error if creation fails', async () => {
      const mockId = 'new-media-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateProductMediaData = {
        productId: productId,
        type: 'image',
        url: '/media/test.jpg',
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        displayOrder: 0
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      await expect(createProductMedia(mockDB, siteId, createData)).rejects.toThrow(
        'Failed to create product media'
      );
    });
  });

  describe('updateProductMediaOrder', () => {
    it('should update display order for existing media', async () => {
      const mockTimestamp = 1234567899;
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const updatedMedia = { ...mockProductMedia, display_order: 5, updated_at: mockTimestamp };

      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(mockProductMedia)
        .mockResolvedValueOnce(updatedMedia);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindForUpdate = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepareForUpdate = vi.fn().mockReturnValue({ bind: mockBindForUpdate });

      let _prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          _prepareCallCount++;
          if (sql.includes('UPDATE')) {
            return mockPrepareForUpdate(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      const result = await updateProductMediaOrder(mockDB, siteId, 'media-1', 5);

      expect(mockBindForUpdate).toHaveBeenCalledWith(5, mockTimestamp, 'media-1', siteId);
      expect(result).toEqual(updatedMedia);
    });

    it('should return null when media not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateProductMediaOrder(mockDB, siteId, 'nonexistent', 5);

      expect(result).toBeNull();
    });
  });

  describe('deleteProductMedia', () => {
    it('should delete product media by ID', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteProductMedia(mockDB, siteId, 'media-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM product_media WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('media-1', siteId);
      expect(result).toBe(true);
    });

    it('should return false when media not found', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteProductMedia(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getMediaLibrary', () => {
    it('should get all media library items', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockMediaLibraryItem] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getMediaLibrary(mockDB, siteId);

      // Owner-facing listing excludes customer design uploads by default.
      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM media_library WHERE site_id = ? AND source = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'library');
      expect(result).toEqual([mockMediaLibraryItem]);
    });

    it('should filter by type', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockMediaLibraryItem] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getMediaLibrary(mockDB, siteId, 'image');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM media_library WHERE site_id = ? AND source = ? AND type = ? ORDER BY created_at DESC'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'library', 'image');
      expect(result).toEqual([mockMediaLibraryItem]);
    });

    it('should return empty array when results are undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getMediaLibrary(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getMediaLibraryItemById', () => {
    it('should get media library item by ID', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockMediaLibraryItem);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getMediaLibraryItemById(mockDB, siteId, 'lib-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM media_library WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('lib-1', siteId);
      expect(result).toEqual(mockMediaLibraryItem);
    });

    it('should return null when item not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getMediaLibraryItemById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createMediaLibraryItem', () => {
    it('should create a new media library item with full data', async () => {
      const mockId = 'new-lib-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateMediaLibraryItemData = {
        type: 'image',
        url: '/media/library/new.jpg',
        thumbnailUrl: '/media/library/new-thumb.jpg',
        filename: 'new.jpg',
        size: 2048,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080
      };

      const expectedItem: DBMediaLibraryItem = {
        id: mockId,
        site_id: siteId,
        type: 'image',
        url: createData.url,
        thumbnail_url: createData.thumbnailUrl!,
        filename: createData.filename,
        size: createData.size,
        mime_type: createData.mimeType,
        width: createData.width!,
        height: createData.height!,
        duration: null,
        used_count: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(expectedItem);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      const result = await createMediaLibraryItem(mockDB, siteId, createData);

      expect(mockBind).toHaveBeenCalledWith(
        mockId,
        siteId,
        'image',
        createData.url,
        createData.thumbnailUrl,
        createData.filename,
        createData.size,
        createData.mimeType,
        createData.width,
        createData.height,
        null,
        0,
        mockTimestamp,
        mockTimestamp,
        'library'
      );
      expect(result).toEqual(expectedItem);
    });

    it('should create media library item with minimal data', async () => {
      const mockId = 'new-lib-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateMediaLibraryItemData = {
        type: 'video',
        url: '/media/library/video.mp4',
        filename: 'video.mp4',
        size: 5000000,
        mimeType: 'video/mp4',
        duration: 120
      };

      const expectedItem: DBMediaLibraryItem = {
        id: mockId,
        site_id: siteId,
        type: 'video',
        url: createData.url,
        thumbnail_url: null,
        filename: createData.filename,
        size: createData.size,
        mime_type: createData.mimeType,
        width: null,
        height: null,
        duration: 120,
        used_count: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(expectedItem);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      const result = await createMediaLibraryItem(mockDB, siteId, createData);

      expect(mockBind).toHaveBeenCalledWith(
        mockId,
        siteId,
        'video',
        createData.url,
        null,
        createData.filename,
        createData.size,
        createData.mimeType,
        null,
        null,
        createData.duration,
        0,
        mockTimestamp,
        mockTimestamp,
        'library'
      );
      expect(result).toEqual(expectedItem);
    });

    it('should throw error if creation fails', async () => {
      const mockId = 'new-lib-id';
      const mockTimestamp = 1234567890;

      vi.spyOn(connection, 'generateId').mockReturnValue(mockId);
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const createData: CreateMediaLibraryItemData = {
        type: 'image',
        url: '/media/library/test.jpg',
        filename: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindForSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareForSelect = vi.fn().mockReturnValue({ bind: mockBindForSelect });

      let prepareCallCount = 0;
      const mockDB = {
        prepare: vi.fn((sql: string) => {
          prepareCallCount++;
          if (prepareCallCount === 1) {
            return mockPrepare(sql);
          } else {
            return mockPrepareForSelect(sql);
          }
        })
      } as unknown as D1Database;

      await expect(createMediaLibraryItem(mockDB, siteId, createData)).rejects.toThrow(
        'Failed to create media library item'
      );
    });
  });

  describe('incrementMediaUsedCount', () => {
    it('should increment used count for media library item', async () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await incrementMediaUsedCount(mockDB, siteId, 'lib-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'UPDATE media_library SET used_count = used_count + 1, updated_at = ? WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith(mockTimestamp, 'lib-1', siteId);
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('decrementMediaUsedCount', () => {
    it('should decrement used count for media library item', async () => {
      const mockTimestamp = 1234567890;
      vi.spyOn(connection, 'getCurrentTimestamp').mockReturnValue(mockTimestamp);

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await decrementMediaUsedCount(mockDB, siteId, 'lib-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'UPDATE media_library SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END, updated_at = ? WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith(mockTimestamp, 'lib-1', siteId);
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('deleteMediaLibraryItem', () => {
    it('should delete media library item by ID', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteMediaLibraryItem(mockDB, siteId, 'lib-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM media_library WHERE id = ? AND site_id = ?'
      );
      expect(mockBind).toHaveBeenCalledWith('lib-1', siteId);
      expect(result).toBe(true);
    });

    it('should return false when item not found', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteMediaLibraryItem(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getFirstProductMediaUrl', () => {
    it('should return first media URL ordered by display_order', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ url: '/media/first.jpg' });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getFirstProductMediaUrl(mockDB, siteId, productId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT url FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC LIMIT 1'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, productId);
      expect(result).toBe('/media/first.jpg');
    });

    it('should return null when no media exists', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getFirstProductMediaUrl(mockDB, siteId, productId);

      expect(result).toBeNull();
    });
  });
});

describe('media library provenance filter', () => {
  const siteId = 'test-site';

  it('can list customer design uploads deliberately', async () => {
    const mockAll = vi.fn().mockResolvedValue({ results: [] });
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDB = { prepare: mockPrepare } as unknown as D1Database;

    await getMediaLibrary(mockDB, siteId, undefined, 'customer_design');

    expect(mockBind).toHaveBeenCalledWith(siteId, 'customer_design');
  });

  it('can opt out of the filter entirely', async () => {
    const mockAll = vi.fn().mockResolvedValue({ results: [] });
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDB = { prepare: mockPrepare } as unknown as D1Database;

    await getMediaLibrary(mockDB, siteId, undefined, 'all');

    expect(mockPrepare).toHaveBeenCalledWith(
      'SELECT * FROM media_library WHERE site_id = ? ORDER BY created_at DESC'
    );
    expect(mockBind).toHaveBeenCalledWith(siteId);
  });
});
