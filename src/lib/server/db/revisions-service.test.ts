import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRevision,
  getRevisions,
  getRevisionById,
  getRevisionByHash,
  getCurrentRevision,
  setCurrentRevision,
  restoreRevision,
  buildRevisionTree,
  getHeadRevisions,
  deleteOldRevisions
} from './revisions-service';
import type { D1Database } from '@cloudflare/workers-types';
import type { Revision } from '$lib/types/revisions';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-' + Date.now()
}));

describe('Generic Revision Service', () => {
  let mockDb: D1Database;
  const siteId = 'site-1';
  const entityId = 'entity-1';

  const mockRevisionData: Revision = {
    id: 'revision-1',
    site_id: siteId,
    entity_type: 'product',
    entity_id: entityId,
    revision_hash: 'abc12345',
    parent_revision_id: undefined,
    data: JSON.stringify({ name: 'Test Product', price: 100 }),
    user_id: 'user-1',
    created_at: 1234567890,
    is_current: false,
    message: 'Initial revision'
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database;
  });

  describe('createRevision', () => {
    it('should create a new revision', async () => {
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);

      const result = await createRevision(mockDb, siteId, {
        entity_type: 'product',
        entity_id: entityId,
        data: { name: 'Test Product', price: 100 },
        user_id: 'user-1',
        message: 'Initial revision'
      });

      expect(result.entity_type).toBe('product');
      expect(result.entity_id).toBe(entityId);
      expect(result.revision_hash).toBeDefined();
      expect(result.revision_hash.length).toBe(8);
      expect(result.data).toEqual({ name: 'Test Product', price: 100 });
    });

    it('should generate unique revision hash', async () => {
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [{ revision_hash: 'abc12345' }]
        })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);

      const result = await createRevision(mockDb, siteId, {
        entity_type: 'product',
        entity_id: entityId,
        data: { name: 'Test Product', price: 100 }
      });

      expect(result.revision_hash).toBeDefined();
      expect(result.revision_hash).not.toBe('abc12345');
    });

    it('should handle optional fields', async () => {
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);

      const result = await createRevision(mockDb, siteId, {
        entity_type: 'product',
        entity_id: entityId,
        data: { name: 'Test Product' }
      });

      expect(result.user_id).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.parent_revision_id).toBeUndefined();
    });
  });

  describe('getRevisions', () => {
    it('should retrieve all revisions for an entity', async () => {
      const mockRevisions = [mockRevisionData];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRevisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisions(mockDb, siteId, 'product', entityId);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe('product');
      expect(result[0].data).toEqual({ name: 'Test Product', price: 100 });
    });

    it('should apply limit option', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await getRevisions(mockDb, siteId, 'product', entityId, { limit: 10 });

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('LIMIT');
    });

    it('should filter by is_current when specified', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await getRevisions(mockDb, siteId, 'product', entityId, { include_current_only: true });

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('is_current = 1');
    });

    it('should apply offset option', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await getRevisions(mockDb, siteId, 'product', entityId, { offset: 20 });

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('OFFSET');
    });

    it('should apply limit and offset together', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await getRevisions(mockDb, siteId, 'product', entityId, { limit: 10, offset: 5 });

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('LIMIT');
      expect(prepareCall).toContain('OFFSET');
    });

    it('should return empty array when no revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisions(mockDb, siteId, 'product', entityId);

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

      const result = await getRevisionById(mockDb, siteId, 'revision-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('revision-1');
      expect(result!.data).toEqual({ name: 'Test Product', price: 100 });
    });

    it('should return null when revision not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionById(mockDb, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRevisionByHash', () => {
    it('should retrieve a revision by hash', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevisionData)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionByHash(mockDb, siteId, 'product', entityId, 'abc12345');

      expect(result).not.toBeNull();
      expect(result!.revision_hash).toBe('abc12345');
    });

    it('should return null when hash not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getRevisionByHash(mockDb, siteId, 'product', entityId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentRevision', () => {
    it('should retrieve the current revision', async () => {
      const currentRevision = { ...mockRevisionData, is_current: true };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(currentRevision)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getCurrentRevision(mockDb, siteId, 'product', entityId);

      expect(result).not.toBeNull();
      expect(result!.is_current).toBe(true);
    });

    it('should return null when no current revision exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getCurrentRevision(mockDb, siteId, 'product', entityId);

      expect(result).toBeNull();
    });
  });

  describe('setCurrentRevision', () => {
    it('should mark a revision as current', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis()
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);
      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await setCurrentRevision(mockDb, siteId, 'product', entityId, 'revision-1');

      expect(mockDb.batch).toHaveBeenCalled();
      const batchCalls = (mockDb.batch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(batchCalls).toHaveLength(2);
    });
  });

  describe('restoreRevision', () => {
    it('should restore a revision', async () => {
      const mockGetStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevisionData)
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

      (mockDb.prepare as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetStatement) // getRevisionById
        .mockReturnValueOnce(mockGetStatement) // getCurrentRevision
        .mockReturnValueOnce(mockHashesStatement) // createRevision - get hashes
        .mockReturnValueOnce(mockInsertStatement) // createRevision - insert
        .mockReturnValue(mockBatchStatement); // setCurrentRevision - batch

      (mockDb.batch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await restoreRevision(mockDb, siteId, 'revision-1', 'user-2');

      expect(result.data).toEqual({ name: 'Test Product', price: 100 });
      expect(result.message).toContain('Restored from revision');
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should throw error when revision not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await expect(restoreRevision(mockDb, siteId, 'nonexistent')).rejects.toThrow(
        'Revision not found'
      );
    });
  });

  describe('buildRevisionTree', () => {
    it('should build a revision tree', async () => {
      const revisions = [
        { ...mockRevisionData, id: 'rev-1', parent_revision_id: undefined },
        {
          ...mockRevisionData,
          id: 'rev-2',
          parent_revision_id: 'rev-1',
          created_at: 1234567891
        },
        {
          ...mockRevisionData,
          id: 'rev-3',
          parent_revision_id: 'rev-2',
          created_at: 1234567892
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      expect(result).toHaveLength(3);
      expect(result[0].depth).toBeDefined();
      expect(result[0].branch).toBeDefined();
      expect(result[0].children).toBeDefined();
    });

    it('should handle orphaned revisions', async () => {
      const revisions = [
        { ...mockRevisionData, id: 'rev-1', parent_revision_id: undefined },
        { ...mockRevisionData, id: 'rev-2', parent_revision_id: undefined }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      expect(result).toEqual([]);
    });

    it('should handle branching revisions with multiple children', async () => {
      // rev-1 has two children (rev-2 and rev-3), creating a branch
      const revisions = [
        { ...mockRevisionData, id: 'rev-1', parent_revision_id: undefined, created_at: 1000 },
        { ...mockRevisionData, id: 'rev-2', parent_revision_id: 'rev-1', created_at: 2000 },
        { ...mockRevisionData, id: 'rev-3', parent_revision_id: 'rev-1', created_at: 3000 }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      expect(result).toHaveLength(3);
      // First child continues on same branch, second child creates new branch
      const branches = new Set(result.map((r) => r.branch));
      expect(branches.size).toBeGreaterThanOrEqual(2);
    });

    it('should sort by created_at when depths are equal', async () => {
      // Two root revisions at same depth
      const revisions = [
        { ...mockRevisionData, id: 'rev-1', parent_revision_id: undefined, created_at: 5000 },
        { ...mockRevisionData, id: 'rev-2', parent_revision_id: undefined, created_at: 1000 }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      expect(result).toHaveLength(2);
      // Both at depth 0, sorted by created_at ascending
      expect(result[0].created_at).toBeLessThanOrEqual(result[1].created_at);
    });
  });

  describe('getHeadRevisions', () => {
    it('should return revisions without children', async () => {
      const revisions = [
        { ...mockRevisionData, id: 'rev-1', parent_revision_id: undefined },
        { ...mockRevisionData, id: 'rev-2', parent_revision_id: 'rev-1' }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await getHeadRevisions(mockDb, siteId, 'product', entityId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rev-2');
    });
  });

  describe('deleteOldRevisions', () => {
    it('should delete old revisions', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 5 } })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await deleteOldRevisions(
        mockDb,
        siteId,
        'product',
        entityId,
        90 * 24 * 60 * 60
      );

      expect(result).toBe(5);
    });

    it('should not delete current revisions', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      await deleteOldRevisions(mockDb, siteId, 'product', entityId, 1);

      const prepareCall = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prepareCall).toContain('is_current = 0');
    });
  });

  describe('buildRevisionTree parent not found', () => {
    it('should treat revision as parentless when parent is not in nodeMap', async () => {
      // Revision references a parent that doesn't exist in the result set
      const revisions = [
        {
          ...mockRevisionData,
          id: 'rev-1',
          parent_revision_id: 'nonexistent-parent',
          created_at: 1000
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: revisions })
      };

      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const result = await buildRevisionTree(mockDb, siteId, 'product', entityId);

      // Should still return the revision, treated as parentless
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rev-1');
    });
  });
});
