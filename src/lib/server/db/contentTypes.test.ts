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
  getContentTypeCount,
  resolveContentRoute
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

    it('should throw when re-fetch after create returns null', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(null);
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

      await expect(createContentType(mockDB, siteId, data)).rejects.toThrow(
        'Failed to create content type'
      );
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

  describe('resolveContentRoute', () => {
    it('should return null when no content types match slug', async () => {
      const mockDB = createMockDB({ allResults: [] });

      const result = await resolveContentRoute(mockDB, siteId, '/unknown');

      expect(result).toBeNull();
    });

    it('should return listing page for exact match', async () => {
      const mockDB = createMockDB({ allResults: [mockDBContentType] });

      const result = await resolveContentRoute(mockDB, siteId, '/blog');

      expect(result).not.toBeNull();
      expect(result?.contentType.name).toBe('Blog');
      expect(result?.entrySlug).toBeNull();
    });

    it('should return entry slug for valid entry route', async () => {
      const mockDB = createMockDB({ allResults: [mockDBContentType] });

      const result = await resolveContentRoute(mockDB, siteId, '/blog/my-post');

      expect(result).not.toBeNull();
      expect(result?.contentType.name).toBe('Blog');
      expect(result?.entrySlug).toBe('my-post');
    });

    it('should return null when remainder does not start with slash', async () => {
      const mockDB = createMockDB({ allResults: [mockDBContentType] });

      const result = await resolveContentRoute(mockDB, siteId, '/blogging');

      expect(result).toBeNull();
    });

    it('should return null when entry slug is empty', async () => {
      const mockDB = createMockDB({ allResults: [mockDBContentType] });

      const result = await resolveContentRoute(mockDB, siteId, '/blog/');

      expect(result).toBeNull();
    });

    it('should match most specific path first', async () => {
      const generalType: DBContentType = {
        ...mockDBContentType,
        id: 'ct-general',
        name: 'Content',
        base_path: '/content'
      };
      const specificType: DBContentType = {
        ...mockDBContentType,
        id: 'ct-specific',
        name: 'Deep Content',
        base_path: '/content/blog'
      };
      const mockDB = createMockDB({ allResults: [generalType, specificType] });

      const result = await resolveContentRoute(mockDB, siteId, '/content/blog');

      expect(result).not.toBeNull();
      expect(result?.contentType.name).toBe('Deep Content');
    });
  });

  describe('updateContentType - additional field branches', () => {
    it('should update listingPageId', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        listingPageId: 'page-123'
      });

      expect(result).toBeDefined();
    });

    it('should update entryTemplatePageId', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        entryTemplatePageId: 'page-456'
      });

      expect(result).toBeDefined();
    });

    it('should update basePath field', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        basePath: '/new-path'
      });

      expect(result).toBeDefined();
    });

    it('should update icon field', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        icon: 'new-icon'
      });

      expect(result).toBeDefined();
    });

    it('should update basePath and icon together', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        basePath: '/articles',
        icon: '📚'
      });

      expect(result).toBeDefined();
    });

    it('should update slug field', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        slug: 'new-slug'
      });

      expect(result).toBeDefined();
    });

    it('should update description field', async () => {
      const mockDB = createMockDB({
        firstResult: mockDBContentType
      });

      const result = await updateContentType(mockDB, siteId, 'ct-1', {
        description: 'New description'
      });

      expect(result).toBeDefined();
    });

    it('should throw when re-fetch after create returns null', async () => {
      const mockFirst = vi.fn().mockResolvedValueOnce({ id: 'ct-new' }).mockResolvedValueOnce(null);
      const mockDB = createMockDB({ firstResult: null });
      (mockDB.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
          first: mockFirst
        })
      });

      await expect(
        createContentType(mockDB, siteId, {
          name: 'Posts',
          slug: 'posts',
          basePath: '/posts',
          fieldsSchema: []
        })
      ).rejects.toThrow();
    });
  });

  describe('null results fallbacks', () => {
    it('getContentTypes should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getContentTypes(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getAllContentTypes should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllContentTypes(mockDB, siteId);
      expect(result).toEqual([]);
    });

    it('getContentTypeByBasePath should return null when row is null', async () => {
      const mockDB = createMockDB({ firstResult: null });
      const result = await getContentTypeByBasePath(mockDB, siteId, '/nonexistent');
      expect(result).toBeNull();
    });

    it('resolveContentRoute should return null when no matching types', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await resolveContentRoute(mockDB, siteId, '/nonexistent/slug');
      expect(result).toBeNull();
    });
  });
});
