import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPageRevisions,
  getRevisionById,
  createRevision,
  publishRevision,
  markRevisionAsPublished,
  getPublishedRevision,
  getMostRecentDraftRevision,
  buildRevisionTree,
  getHeadRevisions,
  ensureInitialRevision
} from './revisions';
import type { D1Database } from '@cloudflare/workers-types';
import type { PageRevision, PageWidget } from '$lib/types/pages';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-' + Date.now()
}));

describe('Revisions Database Functions', () => {
  let mockDb: D1Database;
  const siteId = 'site-1';
  const pageId = 'page-1';
  const revisionId = 'revision-1';

  const mockWidget: PageWidget = {
    id: 'widget-1',
    page_id: pageId,
    type: 'hero',
    position: 0,
    config: { title: 'Test Hero' },
    created_at: 1234567890,
    updated_at: 1234567890
  };

  const mockRevisionData: PageRevision = {
    id: revisionId,
    page_id: pageId,
    revision_hash: 'abc12345',
    parent_revision_id: undefined,
    title: 'Test Page',
    slug: 'test-page',
    status: 'draft',
    color_theme: 'light',
    widgets_snapshot: JSON.stringify([mockWidget]),
    created_by: 'user-1',
    created_at: 1234567890,
    is_published: false,
    notes: 'Initial draft'
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;
  });

  describe('getPageRevisions', () => {
    it('should retrieve all revisions for a page', async () => {
      const mockRevisions = [mockRevisionData];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRevisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT pr.*'));
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, pageId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(revisionId);
      expect(result[0].components).toEqual([mockWidget]);
    });

    it('should parse widgets snapshot into array', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [mockRevisionData] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(result[0].components).toBeInstanceOf(Array);
      expect(result[0].components[0].id).toBe('widget-1');
    });

    it('should return empty array when no revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(result).toEqual([]);
    });

    it('should handle null results', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: null })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(result).toEqual([]);
    });
  });

  describe('getRevisionById', () => {
    it('should retrieve a specific revision', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevisionData)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionById(mockDb, siteId, pageId, revisionId);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT pr.*'));
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, pageId, revisionId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(revisionId);
      expect(result!.components).toEqual([mockWidget]);
    });

    it('should return null when revision not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionById(mockDb, siteId, pageId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createRevision', () => {
    const createData = {
      title: 'New Revision',
      slug: 'new-revision',
      status: 'draft' as const,
      colorTheme: 'dark',
      components: [mockWidget],
      notes: 'Test revision',
      created_by: 'user-1'
    };

    it('should create a new revision', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockUpdateStatement); // For draft_revision_id update

      const result = await createRevision(mockDb, siteId, pageId, createData);

      expect(result.page_id).toBe(pageId);
      expect(result.title).toBe(createData.title);
      expect(result.revision_hash).toBeDefined();
      expect(result.revision_hash.length).toBe(8);
      expect(result.components).toEqual(createData.components);
    });

    it('should generate unique revision hash', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [{ revision_hash: 'abc12345' }] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockUpdateStatement); // For draft_revision_id update

      const result = await createRevision(mockDb, siteId, pageId, createData);

      expect(result.revision_hash).toBeDefined();
      expect(result.revision_hash).not.toBe('abc12345'); // Should be different from existing
    });

    it('should throw error when page not found', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockPageStatement);

      await expect(createRevision(mockDb, siteId, pageId, createData)).rejects.toThrow(
        'Page not found'
      );
    });

    it('should mark published status correctly', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);

      const publishedData = { ...createData, status: 'published' as const };
      const result = await createRevision(mockDb, siteId, pageId, publishedData);

      expect(result.is_published).toBe(true);
    });

    it('should update draft_revision_id on pages when creating draft', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockUpdateStatement);

      const draftData = { ...createData, status: 'draft' as const };
      await createRevision(mockDb, siteId, pageId, draftData);

      // Verify the UPDATE was called to set draft_revision_id
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'UPDATE pages SET draft_revision_id = ? WHERE id = ?'
      );
    });

    it('should not update draft_revision_id when creating published revision', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);
      // No fourth call for UPDATE because it's published

      const publishedData = { ...createData, status: 'published' as const };
      await createRevision(mockDb, siteId, pageId, publishedData);

      // Should only have been called 3 times (page check, hashes check, insert)
      expect(mockDb.prepare).toHaveBeenCalledTimes(3);
    });

    it('should handle optional fields', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockUpdateStatement); // For draft_revision_id update

      const minimalData = {
        title: 'Minimal',
        slug: 'minimal',
        status: 'draft' as const,
        components: []
      };

      const result = await createRevision(mockDb, siteId, pageId, minimalData);

      expect(result.color_theme).toBeUndefined();
      expect(result.created_by).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe('publishRevision', () => {
    it('should publish a revision', async () => {
      const mockGetRevisionStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevisionData)
      };

      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      const mockPageUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
      };

      const mockBatchStatement = {
        bind: vi.fn().mockReturnThis()
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetRevisionStatement) // getRevisionById
        .mockReturnValueOnce(mockGetRevisionStatement) // getPublishedRevision
        .mockReturnValueOnce(mockPageStatement) // createRevision - check page exists
        .mockReturnValueOnce(mockHashesStatement) // createRevision - get existing hashes
        .mockReturnValueOnce(mockInsertStatement) // createRevision - insert
        .mockReturnValueOnce(mockPageUpdateStatement) // page UPDATE (runs separately)
        .mockReturnValue(mockBatchStatement); // All subsequent prepare calls for batch

      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await publishRevision(mockDb, siteId, pageId, revisionId);

      // Verify that a prepare call includes published_revision_id
      const prepareCalls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const pageUpdateCall = prepareCalls.find(
        (call: string[]) =>
          call[0] && call[0].includes('UPDATE pages') && call[0].includes('published_revision_id')
      );
      expect(pageUpdateCall).toBeDefined();
    });
  });

  describe('getPublishedRevision', () => {
    it('should retrieve the published revision', async () => {
      const publishedRevision = { ...mockRevisionData, is_published: 1 };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(publishedRevision)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPublishedRevision(mockDb, siteId, pageId);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('is_published = 1'));
      expect(result).not.toBeNull();
      expect(result!.is_published).toBe(1);
      expect(result!.components).toEqual([mockWidget]);
    });

    it('should return null when no published revision exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPublishedRevision(mockDb, siteId, pageId);

      expect(result).toBeNull();
    });
  });

  describe('getMostRecentDraftRevision', () => {
    it('should retrieve the most recent draft revision', async () => {
      const draftRevision = { ...mockRevisionData, status: 'draft' };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(draftRevision)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getMostRecentDraftRevision(mockDb, siteId, pageId);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'draft'"));
      expect(result).not.toBeNull();
      expect(result!.status).toBe('draft');
      expect(result!.components).toEqual([mockWidget]);
    });

    it('should return null when no draft revision exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getMostRecentDraftRevision(mockDb, siteId, pageId);

      expect(result).toBeNull();
    });
  });

  describe('buildRevisionTree', () => {
    it('should return empty array when no revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toEqual([]);
    });

    it('should build tree with single root revision', async () => {
      const singleRevision = {
        ...mockRevisionData,
        parent_revision_id: null
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [singleRevision] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(revisionId);
      expect(result[0].depth).toBe(0);
      expect(result[0].branch).toBe(0);
      expect(result[0].children).toEqual([]);
    });

    it('should build parent-child relationships', async () => {
      const parentRevision = {
        ...mockRevisionData,
        id: 'parent-1',
        parent_revision_id: null,
        created_at: 1000
      };

      const childRevision = {
        ...mockRevisionData,
        id: 'child-1',
        parent_revision_id: 'parent-1',
        created_at: 2000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [parentRevision, childRevision] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toHaveLength(2);
      const parent = result.find((r) => r.id === 'parent-1');
      const child = result.find((r) => r.id === 'child-1');
      expect(parent!.depth).toBe(0);
      expect(child!.depth).toBe(1);
    });

    it('should handle orphaned revisions by linking them as a chain', async () => {
      const root = {
        ...mockRevisionData,
        id: 'root',
        parent_revision_id: null,
        created_at: 1000
      };

      const orphan1 = {
        ...mockRevisionData,
        id: 'orphan-1',
        parent_revision_id: null,
        created_at: 2000
      };

      const orphan2 = {
        ...mockRevisionData,
        id: 'orphan-2',
        parent_revision_id: null,
        created_at: 3000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [root, orphan1, orphan2] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toHaveLength(3);
      // All nodes should be processed
      expect(result.every((r) => r.depth !== undefined)).toBe(true);
    });

    it('should handle revisions with missing parent (orphans)', async () => {
      const revision = {
        ...mockRevisionData,
        parent_revision_id: 'nonexistent-parent',
        created_at: 1000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [revision] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toHaveLength(1);
    });

    it('should create branches for multiple children', async () => {
      const parent = {
        ...mockRevisionData,
        id: 'parent',
        parent_revision_id: null,
        created_at: 1000
      };

      const child1 = {
        ...mockRevisionData,
        id: 'child-1',
        parent_revision_id: 'parent',
        created_at: 2000
      };

      const child2 = {
        ...mockRevisionData,
        id: 'child-2',
        parent_revision_id: 'parent',
        created_at: 3000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [parent, child1, child2] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, pageId);

      expect(result).toHaveLength(3);
      const parentNode = result.find((r) => r.id === 'parent');
      const child1Node = result.find((r) => r.id === 'child-1');
      const child2Node = result.find((r) => r.id === 'child-2');
      expect(parentNode!.branch).toBe(0);
      expect(child1Node!.branch).toBe(0); // First child stays on same branch
      expect(child2Node!.branch).toBe(1); // Second child gets new branch
    });
  });

  describe('getHeadRevisions', () => {
    it('should return head revisions (those without children)', async () => {
      const parent = {
        ...mockRevisionData,
        id: 'parent',
        parent_revision_id: null,
        created_at: 1000
      };

      const child = {
        ...mockRevisionData,
        id: 'child',
        parent_revision_id: 'parent',
        created_at: 2000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [parent, child] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getHeadRevisions(mockDb, siteId, pageId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('child');
    });

    it('should return all leaves in a branched tree', async () => {
      const root = {
        ...mockRevisionData,
        id: 'root',
        parent_revision_id: null,
        created_at: 1000
      };

      const branch1Head = {
        ...mockRevisionData,
        id: 'branch1-head',
        parent_revision_id: 'root',
        created_at: 2000
      };

      const branch2Head = {
        ...mockRevisionData,
        id: 'branch2-head',
        parent_revision_id: 'root',
        created_at: 3000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [root, branch1Head, branch2Head] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getHeadRevisions(mockDb, siteId, pageId);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual(['branch1-head', 'branch2-head']);
    });

    it('should return empty array when no revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getHeadRevisions(mockDb, siteId, pageId);

      expect(result).toEqual([]);
    });

    it('should return single revision when only root exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [mockRevisionData] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getHeadRevisions(mockDb, siteId, pageId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(revisionId);
    });
  });

  describe('ensureInitialRevision', () => {
    it('should return existing revisions if they already exist', async () => {
      const existingRevision = { ...mockRevisionData };
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [existingRevision] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await ensureInitialRevision(
        mockDb,
        siteId,
        pageId,
        {
          title: 'Test Page',
          slug: 'test-page',
          status: 'draft'
        },
        []
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(revisionId);
    });

    it('should create initial revision when no revisions exist', async () => {
      let allCallCount = 0;
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockImplementation(() => {
          // Page existence check returns the page
          return Promise.resolve({ id: pageId });
        }),
        all: vi.fn().mockImplementation(() => {
          allCallCount++;
          // First call: getPageRevisions - return empty (no existing revisions)
          if (allCallCount === 1) {
            return Promise.resolve({ results: [] });
          }
          // Second call: get existing revision hashes - return empty
          if (allCallCount === 2) {
            return Promise.resolve({ results: [] });
          }
          // Third call: getPageRevisions in buildRevisionTree - return the new revision
          return Promise.resolve({
            results: [
              {
                ...mockRevisionData,
                id: 'new-initial-revision',
                notes: 'Initial revision'
              }
            ]
          });
        }),
        run: vi.fn().mockResolvedValue({ success: true })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await ensureInitialRevision(
        mockDb,
        siteId,
        pageId,
        {
          title: 'New Page',
          slug: 'new-page',
          status: 'draft'
        },
        [mockWidget]
      );

      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Initial revision');
    });

    it('should mark initial revision as published if page is published', async () => {
      let allCallCount = 0;
      const mockRunFn = vi.fn().mockResolvedValue({ success: true });
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockImplementation(() => {
          // Page existence check returns the page
          return Promise.resolve({ id: pageId });
        }),
        all: vi.fn().mockImplementation(() => {
          allCallCount++;
          // First call: getPageRevisions - return empty
          if (allCallCount === 1) {
            return Promise.resolve({ results: [] });
          }
          // Second call: get existing revision hashes - return empty
          if (allCallCount === 2) {
            return Promise.resolve({ results: [] });
          }
          // Third call: getPageRevisions in buildRevisionTree - return the new revision
          return Promise.resolve({
            results: [
              {
                ...mockRevisionData,
                id: 'new-initial-revision',
                status: 'published',
                is_published: true,
                notes: 'Initial revision'
              }
            ]
          });
        }),
        run: mockRunFn
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await ensureInitialRevision(
        mockDb,
        siteId,
        pageId,
        {
          title: 'Published Page',
          slug: 'published-page',
          status: 'published'
        },
        []
      );

      // Should have called UPDATE to mark as published
      const updateCalls = mockRunFn.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
      expect(result).toHaveLength(1);
    });
  });

  describe('markRevisionAsPublished', () => {
    it('should update page and sync widgets', async () => {
      const mockRunFn = vi.fn().mockResolvedValue({ success: true });
      const mockBatchFn = vi.fn().mockResolvedValue([
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } }
      ]);
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: mockRunFn
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);
      (mockDb.batch as ReturnType<typeof vi.fn>).mockImplementation(mockBatchFn);

      await markRevisionAsPublished(mockDb, pageId, revisionId, {
        title: 'Published Page',
        slug: 'published-page',
        colorTheme: 'light',
        components: [mockWidget]
      });

      // Should have updated the page
      expect(mockRunFn).toHaveBeenCalled();
      // Should have run batch operations
      expect(mockBatchFn).toHaveBeenCalled();
    });

    it('should handle components with temp IDs', async () => {
      const tempWidget = {
        ...mockWidget,
        id: 'temp-widget-123'
      };

      const mockRunFn = vi.fn().mockResolvedValue({ success: true });
      const mockBatchFn = vi.fn().mockResolvedValue([{ success: true, meta: { changes: 1 } }]);
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: mockRunFn
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);
      (mockDb.batch as ReturnType<typeof vi.fn>).mockImplementation(mockBatchFn);

      await markRevisionAsPublished(mockDb, pageId, revisionId, {
        title: 'Published Page',
        slug: 'published-page',
        components: [tempWidget]
      });

      expect(mockBatchFn).toHaveBeenCalled();
    });

    it('should handle empty components list', async () => {
      const mockRunFn = vi.fn().mockResolvedValue({ success: true });
      const mockBatchFn = vi.fn().mockResolvedValue([{ success: true, meta: { changes: 1 } }]);
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: mockRunFn
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);
      (mockDb.batch as ReturnType<typeof vi.fn>).mockImplementation(mockBatchFn);

      await markRevisionAsPublished(mockDb, pageId, revisionId, {
        title: 'Empty Page',
        slug: 'empty-page',
        components: []
      });

      expect(mockBatchFn).toHaveBeenCalled();
    });

    it('should handle colorTheme being undefined', async () => {
      const mockRunFn = vi.fn().mockResolvedValue({ success: true });
      const mockBatchFn = vi.fn().mockResolvedValue([]);
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: mockRunFn
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);
      (mockDb.batch as ReturnType<typeof vi.fn>).mockImplementation(mockBatchFn);

      await markRevisionAsPublished(mockDb, pageId, revisionId, {
        title: 'No Theme',
        slug: 'no-theme',
        components: []
      });

      // Should have bound colorTheme as null
      expect(mockRunFn).toHaveBeenCalled();
    });
  });

  describe('getPageRevisions - page_properties parsing', () => {
    it('should handle null page_properties', async () => {
      const revisionWithoutProps = {
        ...mockRevisionData,
        page_properties: null
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [revisionWithoutProps] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(result[0].pageProperties).toBeUndefined();
    });

    it('should parse page_properties when present', async () => {
      const props = { layout: 'full-width', showHeader: true };
      const revisionWithProps = {
        ...mockRevisionData,
        page_properties: JSON.stringify(props)
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [revisionWithProps] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPageRevisions(mockDb, siteId, pageId);

      expect(result[0].pageProperties).toEqual(props);
    });
  });

  describe('getRevisionById - page_properties parsing', () => {
    it('should handle null page_properties in single revision', async () => {
      const revisionWithoutProps = {
        ...mockRevisionData,
        page_properties: null
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(revisionWithoutProps)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionById(mockDb, siteId, pageId, revisionId);

      expect(result).not.toBeNull();
      expect(result!.pageProperties).toBeUndefined();
    });
  });

  describe('getPublishedRevision page_properties branch', () => {
    it('should return undefined pageProperties when page_properties is null', async () => {
      const revisionRow = {
        id: 'rev-1',
        page_id: pageId,
        site_id: siteId,
        hash: 'abc12345',
        widgets_snapshot: JSON.stringify([mockWidget]),
        page_properties: null,
        parent_id: null,
        status: 'published',
        created_by: 'user-1',
        created_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(revisionRow)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPublishedRevision(mockDb, siteId, pageId);

      expect(result).not.toBeNull();
      expect(result!.pageProperties).toBeUndefined();
    });

    it('should parse page_properties when present', async () => {
      const pageProps = { title: 'Test', description: 'Desc' };
      const revisionRow = {
        id: 'rev-1',
        page_id: pageId,
        site_id: siteId,
        hash: 'abc12345',
        widgets_snapshot: JSON.stringify([mockWidget]),
        page_properties: JSON.stringify(pageProps),
        parent_id: null,
        status: 'published',
        created_by: 'user-1',
        created_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(revisionRow)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getPublishedRevision(mockDb, siteId, pageId);

      expect(result).not.toBeNull();
      expect(result!.pageProperties).toEqual(pageProps);
    });
  });

  describe('getMostRecentDraftRevision page_properties branch', () => {
    it('should return undefined pageProperties when page_properties is null', async () => {
      const revisionRow = {
        id: 'rev-1',
        page_id: pageId,
        site_id: siteId,
        hash: 'abc12345',
        widgets_snapshot: JSON.stringify([mockWidget]),
        page_properties: null,
        parent_id: null,
        status: 'draft',
        created_by: 'user-1',
        created_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(revisionRow)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getMostRecentDraftRevision(mockDb, siteId, pageId);

      expect(result).not.toBeNull();
      expect(result!.pageProperties).toBeUndefined();
    });

    it('should parse page_properties when present', async () => {
      const pageProps = { layout: 'full-width' };
      const revisionRow = {
        id: 'rev-1',
        page_id: pageId,
        site_id: siteId,
        hash: 'abc12345',
        widgets_snapshot: JSON.stringify([mockWidget]),
        page_properties: JSON.stringify(pageProps),
        parent_id: null,
        status: 'draft',
        created_by: 'user-1',
        created_at: 1234567890
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(revisionRow)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getMostRecentDraftRevision(mockDb, siteId, pageId);

      expect(result).not.toBeNull();
      expect(result!.pageProperties).toEqual(pageProps);
    });
  });

  describe('publishRevision - null revision', () => {
    it('should throw when revision is not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await expect(publishRevision(mockDb, siteId, pageId, 'nonexistent-id')).rejects.toThrow(
        'Revision not found'
      );
    });
  });

  describe('publishRevision - batch results with meta', () => {
    it('should log batch results including meta?.changes', async () => {
      const mockGetRevisionStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevisionData)
      };
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };
      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };
      const mockPageUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
      };
      const mockBatchStatement = {
        bind: vi.fn().mockReturnThis()
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetRevisionStatement)
        .mockReturnValueOnce(mockGetRevisionStatement)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockPageUpdateStatement)
        .mockReturnValue(mockBatchStatement);

      // Return batch results with meta: undefined on some items
      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([
        { success: true, meta: { changes: 3 } },
        { success: true, meta: undefined },
        { success: true }
      ]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await publishRevision(mockDb, siteId, pageId, revisionId);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createRevision - hash collision', () => {
    it('should handle existingHashes results being null', async () => {
      const mockPageStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: pageId })
      };
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: null })
      };
      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };
      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockPageStatement)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement)
        .mockReturnValueOnce(mockUpdateStatement);

      const result = await createRevision(mockDb, siteId, pageId, {
        title: 'Test',
        slug: 'test',
        status: 'draft',
        components: [],
        created_by: 'user-1'
      });

      expect(result.revision_hash).toBeDefined();
    });
  });
});
