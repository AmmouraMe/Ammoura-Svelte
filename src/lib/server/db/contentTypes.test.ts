/**
 * Tests for content types repository
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getContentTypes,
  getAllContentTypes,
  getContentTypeById,
  getContentTypeBySlug,
  getContentTypeByBasePath,
  createContentType,
  updateContentType,
  deleteContentType,
  archiveContentType,
  updateContentTypeSchema,
  getContentTypeCount
} from './contentTypes';
import type { DBContentType, CreateContentTypeData } from '../../types/contentTypes';

// ============================================================================
// Test Helpers
// ============================================================================

const siteId = 'test-site';

const mockDBContentType: DBContentType = {
  id: 'ct-1',
  site_id: siteId,
  name: 'Blog',
  slug: 'blog',
  description: 'Blog posts',
  base_path: '/blog',
  icon: 'article',
  fields_schema: JSON.stringify([
    { slug: 'body', name: 'Body', type: 'rich_text', required: true, position: 1 }
  ]),
  listing_page_id: null,
  entry_template_page_id: null,
  status: 'active',
  created_at: 1700000000,
  updated_at: 1700000000
};

function createMockDB(
  overrides: {
    firstResult?: unknown;
    allResults?: unknown[];
    runResult?: unknown;
  } = {}
): D1Database {
  const { firstResult = null, allResults = [], runResult = { success: true } } = overrides;

  const mockRun = vi.fn().mockResolvedValue(runResult);
  const mockFirst = vi.fn().mockResolvedValue(firstResult);
  const mockAll = vi.fn().mockResolvedValue({ results: allResults, success: true });
  const mockBind = vi.fn().mockReturnValue({
    first: mockFirst,
    all: mockAll,
    run: mockRun
  });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

  return { prepare: mockPrepare } as unknown as D1Database;
}

// ============================================================================
// Tests
// ============================================================================

describe('Content Types Repository', () => {
  describe('getContentTypes', () => {
    it('should get active content types for a site', async () => {
      const mockDB = createMockDB({ allResults: [mockDBContentType] });

      const result = await getContentTypes(mockDB, siteId);

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_types WHERE site_id = ? AND status = ? ORDER BY name ASC'
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blog');
      expect(result[0].siteId).toBe(siteId);
      expect(result[0].fieldsSchema).toEqual([
        { slug: 'body', name: 'Body', type: 'rich_text', required: true, position: 1 }
      ]);
    });

    it('should return empty array when no content types', async () => {
      const mockDB = createMockDB({ allResults: [] });

      const result = await getContentTypes(mockDB, siteId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllContentTypes', () => {
    it('should get all content types including archived', async () => {
      const archived: DBContentType = {
        ...mockDBContentType,
        id: 'ct-2',
        status: 'archived'
      };
      const mockDB = createMockDB({ allResults: [mockDBContentType, archived] });

      const result = await getAllContentTypes(mockDB, siteId);

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_types WHERE site_id = ? ORDER BY name ASC'
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getContentTypeById', () => {
    it('should get a content type by ID scoped by site', async () => {
      const mockDB = createMockDB({ firstResult: mockDBContentType });

      const result = await getContentTypeById(mockDB, siteId, 'ct-1');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_types WHERE id = ? AND site_id = ?'
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('ct-1');
      expect(result!.slug).toBe('blog');
    });

    it('should return null when not found', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await getContentTypeById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getContentTypeBySlug', () => {
    it('should get a content type by slug scoped by site', async () => {
      const mockDB = createMockDB({ firstResult: mockDBContentType });

      const result = await getContentTypeBySlug(mockDB, siteId, 'blog');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_types WHERE slug = ? AND site_id = ?'
      );
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('blog');
    });

    it('should return null when slug not found', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await getContentTypeBySlug(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getContentTypeByBasePath', () => {
    it('should get a content type by base path scoped by site', async () => {
      const mockDB = createMockDB({ firstResult: mockDBContentType });

      const result = await getContentTypeByBasePath(mockDB, siteId, '/blog');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_types WHERE base_path = ? AND site_id = ?'
      );
      expect(result).not.toBeNull();
      expect(result!.basePath).toBe('/blog');
    });
  });

  describe('createContentType', () => {
    it('should create a content type and return it', async () => {
      // The create function first runs INSERT then calls getContentTypeById
      // We need mock to return null first (for INSERT run), then the created record
      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        // First call is the INSERT (run), second is the SELECT (first)
        return Promise.resolve(callCount >= 1 ? mockDBContentType : null);
      });
      const mockAll = vi.fn().mockResolvedValue({ results: [], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const data: CreateContentTypeData = {
        name: 'Blog',
        slug: 'blog',
        basePath: '/blog',
        fieldsSchema: [
          { slug: 'body', name: 'Body', type: 'rich_text', required: true, position: 1 }
        ]
      };

      const result = await createContentType(mockDB, siteId, data);

      expect(result).not.toBeNull();
      expect(result.name).toBe('Blog');
    });
  });

  describe('updateContentType', () => {
    it('should return null when content type does not exist', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await updateContentType(mockDB, siteId, 'nonexistent', {
        name: 'Updated'
      });

      expect(result).toBeNull();
    });

    it('should update content type fields', async () => {
      const updatedRow: DBContentType = {
        ...mockDBContentType,
        name: 'Updated Blog',
        updated_at: 1700001000
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBContentType); // existing check
        return Promise.resolve(updatedRow); // re-fetch after update
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        name: 'Updated Blog'
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Blog');
    });
  });

  describe('deleteContentType', () => {
    it('should delete a content type and return true', async () => {
      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? mockDBContentType : null);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteContentType(mockDB, siteId, 'ct-1');

      expect(result).toBe(true);
    });

    it('should return false when content type does not exist', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await deleteContentType(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('archiveContentType', () => {
    it('should archive a content type by setting status', async () => {
      const archivedRow: DBContentType = {
        ...mockDBContentType,
        status: 'archived'
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBContentType);
        return Promise.resolve(archivedRow);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await archiveContentType(mockDB, siteId, 'ct-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('archived');
    });
  });

  describe('updateContentTypeSchema', () => {
    it('should update the fields schema', async () => {
      const newSchema = [
        { slug: 'title', name: 'Title', type: 'text' as const, required: true, position: 1 },
        { slug: 'body', name: 'Body', type: 'rich_text' as const, required: true, position: 2 }
      ];
      const updatedRow: DBContentType = {
        ...mockDBContentType,
        fields_schema: JSON.stringify(newSchema)
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBContentType);
        return Promise.resolve(updatedRow);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateContentTypeSchema(mockDB, siteId, 'ct-1', newSchema);

      expect(result).not.toBeNull();
      expect(result!.fieldsSchema).toHaveLength(2);
    });
  });

  describe('getContentTypeCount', () => {
    it('should return count of active content types', async () => {
      const mockDB = createMockDB({ firstResult: { count: 5 } });

      const result = await getContentTypeCount(mockDB, siteId);

      expect(result).toBe(5);
    });

    it('should return 0 when no content types', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await getContentTypeCount(mockDB, siteId);

      expect(result).toBe(0);
    });
  });
});
