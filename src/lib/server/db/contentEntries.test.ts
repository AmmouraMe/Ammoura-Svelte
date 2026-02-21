/**
 * Tests for content entries repository
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getContentEntries,
  getContentEntryById,
  getContentEntryBySlug,
  createContentEntry,
  updateContentEntry,
  deleteContentEntry,
  publishContentEntry,
  unpublishContentEntry,
  archiveContentEntry,
  getPublishedEntries,
  getContentEntryCount,
  getEntryTags,
  setEntryTags,
  getContentTypeTags
} from './contentEntries';
import type { DBContentEntry, DBContentEntryTag } from '../../types/contentTypes';

// ============================================================================
// Test Helpers
// ============================================================================

const siteId = 'test-site';
const contentTypeId = 'ct-1';

const mockDBEntry: DBContentEntry = {
  id: 'entry-1',
  site_id: siteId,
  content_type_id: contentTypeId,
  title: 'Test Entry',
  slug: 'test-entry',
  field_values: JSON.stringify({ body: '<p>Hello</p>', author: 'Alice' }),
  page_id: null,
  status: 'draft',
  published_at: null,
  author_id: 'user-1',
  sort_order: 0,
  created_at: 1700000000,
  updated_at: 1700000000
};

const mockDBTag: DBContentEntryTag = {
  id: 'tag-1',
  site_id: siteId,
  content_type_id: contentTypeId,
  entry_id: 'entry-1',
  tag_name: 'javascript',
  tag_category: 'tag',
  created_at: 1700000000
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

describe('Content Entries Repository', () => {
  describe('getContentEntries', () => {
    it('should get entries with defaults', async () => {
      // Need to handle both count query (first) and entries query (all)
      let _callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        _callCount++;
        return Promise.resolve({ count: 1 });
      });
      const mockAll = vi.fn().mockResolvedValue({ results: [mockDBEntry], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getContentEntries(mockDB, siteId, contentTypeId);

      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('Test Entry');
      expect(result.entries[0].fieldValues).toEqual({ body: '<p>Hello</p>', author: 'Alice' });
    });

    it('should filter by status', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 0 });
      const mockAll = vi.fn().mockResolvedValue({ results: [], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getContentEntries(mockDB, siteId, contentTypeId, { status: 'published' });

      // Check that status filter was included in the query
      const prepareCall = mockPrepare.mock.calls[0][0];
      expect(prepareCall).toContain('ce.status = ?');
    });

    it('should handle search filter', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 0 });
      const mockAll = vi.fn().mockResolvedValue({ results: [], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getContentEntries(mockDB, siteId, contentTypeId, { search: 'test' });

      const prepareCall = mockPrepare.mock.calls[0][0];
      expect(prepareCall).toContain('ce.title LIKE ?');
    });

    it('should return empty results', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 0 });
      const mockAll = vi.fn().mockResolvedValue({ results: [], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getContentEntries(mockDB, siteId, contentTypeId);

      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe('getContentEntryById', () => {
    it('should get entry by ID scoped by site', async () => {
      const mockDB = createMockDB({ firstResult: mockDBEntry });

      const result = await getContentEntryById(mockDB, siteId, 'entry-1');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_entries WHERE id = ? AND site_id = ?'
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('entry-1');
      expect(result!.contentTypeId).toBe(contentTypeId);
    });

    it('should return null when not found', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await getContentEntryById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getContentEntryBySlug', () => {
    it('should get entry by slug within a content type', async () => {
      const mockDB = createMockDB({ firstResult: mockDBEntry });

      const result = await getContentEntryBySlug(mockDB, siteId, contentTypeId, 'test-entry');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_entries WHERE content_type_id = ? AND slug = ? AND site_id = ?'
      );
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-entry');
    });
  });

  describe('createContentEntry', () => {
    it('should create an entry with draft status by default', async () => {
      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount >= 1 ? mockDBEntry : null);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createContentEntry(mockDB, siteId, {
        contentTypeId,
        title: 'Test Entry',
        slug: 'test-entry',
        fieldValues: { body: '<p>Hello</p>', author: 'Alice' }
      });

      expect(result).not.toBeNull();
      expect(result.title).toBe('Test Entry');
    });

    it('should set published_at when created with published status', async () => {
      const publishedEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'published',
        published_at: 1700000000
      };
      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount >= 1 ? publishedEntry : null);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createContentEntry(mockDB, siteId, {
        contentTypeId,
        title: 'Test Entry',
        slug: 'test-entry',
        fieldValues: { body: '<p>Hello</p>' },
        status: 'published'
      });

      expect(result.status).toBe('published');
      expect(result.publishedAt).not.toBeNull();
    });
  });

  describe('updateContentEntry', () => {
    it('should return null when entry does not exist', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await updateContentEntry(mockDB, siteId, 'nonexistent', {
        title: 'Updated'
      });

      expect(result).toBeNull();
    });

    it('should update entry fields', async () => {
      const updatedEntry: DBContentEntry = {
        ...mockDBEntry,
        title: 'Updated Title'
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBEntry);
        return Promise.resolve(updatedEntry);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await updateContentEntry(mockDB, siteId, 'entry-1', {
        title: 'Updated Title'
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated Title');
    });
  });

  describe('deleteContentEntry', () => {
    it('should delete an entry and return true', async () => {
      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? mockDBEntry : null);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteContentEntry(mockDB, siteId, 'entry-1');

      expect(result).toBe(true);
    });

    it('should return false when entry does not exist', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await deleteContentEntry(mockDB, siteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('publishContentEntry', () => {
    it('should set status to published', async () => {
      const publishedEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'published',
        published_at: 1700001000
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBEntry);
        return Promise.resolve(publishedEntry);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await publishContentEntry(mockDB, siteId, 'entry-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('published');
    });
  });

  describe('unpublishContentEntry', () => {
    it('should revert to draft status', async () => {
      const draftEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'draft'
      };
      const publishedEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'published',
        published_at: 1700000000
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(publishedEntry);
        return Promise.resolve(draftEntry);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await unpublishContentEntry(mockDB, siteId, 'entry-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('draft');
    });
  });

  describe('archiveContentEntry', () => {
    it('should set status to archived', async () => {
      const archivedEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'archived'
      };

      let callCount = 0;
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockDBEntry);
        return Promise.resolve(archivedEntry);
      });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await archiveContentEntry(mockDB, siteId, 'entry-1');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('archived');
    });
  });

  describe('getPublishedEntries', () => {
    it('should get only published entries', async () => {
      const publishedEntry: DBContentEntry = {
        ...mockDBEntry,
        status: 'published',
        published_at: 1700000000
      };

      const mockFirst = vi.fn().mockResolvedValue({ count: 1 });
      const mockAll = vi.fn().mockResolvedValue({ results: [publishedEntry], success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        all: mockAll
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getPublishedEntries(mockDB, siteId, contentTypeId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('published');
    });
  });

  describe('getContentEntryCount', () => {
    it('should return total count without status filter', async () => {
      const mockDB = createMockDB({ firstResult: { count: 10 } });

      const result = await getContentEntryCount(mockDB, siteId, contentTypeId);

      expect(result).toBe(10);
    });

    it('should return count with status filter', async () => {
      const mockDB = createMockDB({ firstResult: { count: 3 } });

      const result = await getContentEntryCount(mockDB, siteId, contentTypeId, 'published');

      expect(result).toBe(3);
    });

    it('should return 0 when no entries', async () => {
      const mockDB = createMockDB({ firstResult: null });

      const result = await getContentEntryCount(mockDB, siteId, contentTypeId);

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // Tags
  // ============================================================================

  describe('getEntryTags', () => {
    it('should get tags for an entry', async () => {
      const mockDB = createMockDB({ allResults: [mockDBTag] });

      const result = await getEntryTags(mockDB, siteId, 'entry-1');

      expect(mockDB.prepare).toHaveBeenCalledWith(
        'SELECT * FROM content_entry_tags WHERE entry_id = ? AND site_id = ? ORDER BY tag_category, tag_name'
      );
      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('javascript');
      expect(result[0].tagCategory).toBe('tag');
    });

    it('should return empty array when no tags', async () => {
      const mockDB = createMockDB({ allResults: [] });

      const result = await getEntryTags(mockDB, siteId, 'entry-1');

      expect(result).toEqual([]);
    });
  });

  describe('setEntryTags', () => {
    it('should delete existing tags and insert new ones', async () => {
      const newTag: DBContentEntryTag = {
        ...mockDBTag,
        tag_name: 'typescript'
      };
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockAll = vi.fn().mockResolvedValue({ results: [newTag], success: true });
      const mockBind = vi.fn().mockReturnValue({
        run: mockRun,
        all: mockAll
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await setEntryTags(mockDB, siteId, contentTypeId, 'entry-1', [
        { tagName: 'typescript' }
      ]);

      // Should have called prepare for: delete + insert + select
      expect(mockPrepare).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
    });
  });

  describe('getContentTypeTags', () => {
    it('should get unique tags for a content type', async () => {
      const tagResult = {
        tag_name: 'javascript',
        tag_category: 'tag',
        count: 5
      };
      const mockDB = createMockDB({ allResults: [tagResult] });

      const result = await getContentTypeTags(mockDB, siteId, contentTypeId);

      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('javascript');
      expect(result[0].count).toBe(5);
    });

    it('should filter by category when provided', async () => {
      const mockDB = createMockDB({ allResults: [] });

      await getContentTypeTags(mockDB, siteId, contentTypeId, 'category');

      const prepareCall = (mockDB.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('tag_category = ?');
    });
  });
});
