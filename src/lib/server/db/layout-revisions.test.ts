/**
 * Tests for layout revisions database operations
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  getLayoutRevisions,
  getLayoutRevisionById,
  getCurrentLayoutRevision,
  createLayoutRevision,
  publishLayoutRevision,
  createInitialLayoutRevision,
  buildLayoutRevisionTree,
  layoutToRevisionData,
  revisionDataToLayout,
  ensureLayoutHasRevision
} from './layout-revisions';

// Mock the revisions-service module
vi.mock('./revisions-service', () => ({
  createRevision: vi.fn(),
  getRevisions: vi.fn(),
  getRevisionById: vi.fn(),
  getCurrentRevision: vi.fn(),
  setCurrentRevision: vi.fn(),
  buildRevisionTree: vi.fn()
}));

import {
  createRevision,
  getRevisions,
  getRevisionById,
  getCurrentRevision,
  setCurrentRevision,
  buildRevisionTree
} from './revisions-service';

describe('layout-revisions database operations', () => {
  const mockDb = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  } as unknown as D1Database;

  const siteId = '1';
  const layoutId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLayoutRevisions', () => {
    it('should call getRevisions with correct parameters', async () => {
      const mockRevisions = [
        { id: 'rev1', data: { name: 'Layout 1' } },
        { id: 'rev2', data: { name: 'Layout 2' } }
      ];
      (getRevisions as Mock).mockResolvedValue(mockRevisions);

      const result = await getLayoutRevisions(mockDb, siteId, layoutId);

      expect(getRevisions).toHaveBeenCalledWith(mockDb, siteId, 'layout', '1');
      expect(result).toEqual(mockRevisions);
    });
  });

  describe('getLayoutRevisionById', () => {
    it('should call getRevisionById with correct parameters', async () => {
      const mockRevision = { id: 'rev1', data: { name: 'Layout 1' } };
      (getRevisionById as Mock).mockResolvedValue(mockRevision);

      const result = await getLayoutRevisionById(mockDb, siteId, 'rev1');

      expect(getRevisionById).toHaveBeenCalledWith(mockDb, siteId, 'rev1');
      expect(result).toEqual(mockRevision);
    });

    it('should return null when revision not found', async () => {
      (getRevisionById as Mock).mockResolvedValue(null);

      const result = await getLayoutRevisionById(mockDb, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentLayoutRevision', () => {
    it('should call getCurrentRevision with correct parameters', async () => {
      const mockRevision = { id: 'rev1', is_current: true };
      (getCurrentRevision as Mock).mockResolvedValue(mockRevision);

      const result = await getCurrentLayoutRevision(mockDb, siteId, layoutId);

      expect(getCurrentRevision).toHaveBeenCalledWith(mockDb, siteId, 'layout', '1');
      expect(result).toEqual(mockRevision);
    });
  });

  describe('createLayoutRevision', () => {
    it('should create revision with correct data', async () => {
      const revisionData = {
        name: 'Test Layout',
        description: 'A test layout',
        slug: 'test-layout',
        is_default: false,
        widgets: [{ id: 'w1', type: 'yield', position: 0, config: {} }]
      };
      const mockRevision = { id: 'rev1', data: revisionData };
      (createRevision as Mock).mockResolvedValue(mockRevision);

      const result = await createLayoutRevision(mockDb, siteId, layoutId, revisionData, {
        userId: 'user1',
        message: 'Test message'
      });

      expect(createRevision).toHaveBeenCalledWith(mockDb, siteId, {
        entity_type: 'layout',
        entity_id: '1',
        data: revisionData,
        user_id: 'user1',
        message: 'Test message',
        parent_revision_id: undefined
      });
      expect(result).toEqual(mockRevision);
    });
  });

  describe('publishLayoutRevision', () => {
    it('should call setCurrentRevision with correct parameters', async () => {
      (setCurrentRevision as Mock).mockResolvedValue(undefined);

      await publishLayoutRevision(mockDb, siteId, layoutId, 'rev1');

      expect(setCurrentRevision).toHaveBeenCalledWith(mockDb, siteId, 'layout', '1', 'rev1');
    });
  });

  describe('createInitialLayoutRevision', () => {
    it('should create and publish initial revision', async () => {
      const revisionData = {
        name: 'Initial Layout',
        slug: 'initial',
        is_default: true,
        widgets: []
      };
      const mockRevision = { id: 'rev1', data: revisionData, is_current: false };
      (createRevision as Mock).mockResolvedValue(mockRevision);
      (setCurrentRevision as Mock).mockResolvedValue(undefined);

      const result = await createInitialLayoutRevision(mockDb, siteId, layoutId, revisionData);

      expect(createRevision).toHaveBeenCalled();
      expect(setCurrentRevision).toHaveBeenCalledWith(mockDb, siteId, 'layout', '1', 'rev1');
      expect(result.is_current).toBe(true);
    });
  });

  describe('buildLayoutRevisionTree', () => {
    it('should call buildRevisionTree with correct parameters', async () => {
      const mockTree = [{ id: 'rev1', children: [] }];
      (buildRevisionTree as Mock).mockResolvedValue(mockTree);

      const result = await buildLayoutRevisionTree(mockDb, siteId, layoutId);

      expect(buildRevisionTree).toHaveBeenCalledWith(mockDb, siteId, 'layout', '1');
      expect(result).toEqual(mockTree);
    });
  });

  describe('layoutToRevisionData', () => {
    it('should convert layout and widgets to revision data format', () => {
      const layout = {
        name: 'Test Layout',
        description: 'Description',
        slug: 'test',
        is_default: true
      };
      const widgets = [
        { id: 'w1', type: 'yield', position: 0, config: { key: 'value' } },
        { id: 'w2', type: 'navbar', position: 1, config: '{"text":"hello"}' }
      ];

      const result = layoutToRevisionData(layout, widgets);

      expect(result).toEqual({
        name: 'Test Layout',
        description: 'Description',
        slug: 'test',
        is_default: true,
        widgets: [
          { id: 'w1', type: 'yield', position: 0, config: { key: 'value' } },
          { id: 'w2', type: 'navbar', position: 1, config: { text: 'hello' } }
        ]
      });
    });

    it('should handle widgets with JSON string config', () => {
      const layout = {
        name: 'Layout',
        slug: 'layout',
        is_default: false
      };
      const widgets = [{ id: 'w1', type: 'text', position: 0, config: '{"content":"test"}' }];

      const result = layoutToRevisionData(layout, widgets);

      expect(result.widgets[0].config).toEqual({ content: 'test' });
    });
  });

  describe('revisionDataToLayout', () => {
    it('should convert revision data back to layout format', () => {
      const revisionData = {
        name: 'Test Layout',
        description: 'Description',
        slug: 'test',
        is_default: true,
        widgets: [{ id: 'w1', type: 'yield', position: 0, config: {} }]
      };

      const result = revisionDataToLayout(revisionData);

      expect(result).toEqual({
        layout: {
          name: 'Test Layout',
          description: 'Description',
          slug: 'test',
          is_default: true
        },
        widgets: [{ id: 'w1', type: 'yield', position: 0, config: {} }]
      });
    });
  });

  describe('ensureLayoutHasRevision', () => {
    it('should return existing revision if one exists', async () => {
      const existingRevision = { id: 'rev1', is_current: true };
      (getRevisions as Mock).mockResolvedValue([existingRevision]);

      const result = await ensureLayoutHasRevision(
        mockDb,
        siteId,
        layoutId,
        { name: 'Layout', slug: 'layout', is_default: false },
        []
      );

      expect(result).toEqual(existingRevision);
      expect(createRevision).not.toHaveBeenCalled();
    });

    it('should create initial revision if none exist', async () => {
      const mockRevision = { id: 'rev1', is_current: false };
      (getRevisions as Mock).mockResolvedValue([]);
      (createRevision as Mock).mockResolvedValue(mockRevision);
      (setCurrentRevision as Mock).mockResolvedValue(undefined);

      const result = await ensureLayoutHasRevision(
        mockDb,
        siteId,
        layoutId,
        { name: 'New Layout', slug: 'new', is_default: false },
        [{ id: 'w1', type: 'yield', position: 0, config: {} }],
        'user1'
      );

      expect(createRevision).toHaveBeenCalled();
      expect(result.is_current).toBe(true);
    });

    it('should return most recent revision when no current revision exists', async () => {
      const revisions = [
        { id: 'rev2', is_current: false, created_at: 200 },
        { id: 'rev1', is_current: false, created_at: 100 }
      ];
      (getRevisions as Mock).mockResolvedValue(revisions);

      const result = await ensureLayoutHasRevision(
        mockDb,
        siteId,
        layoutId,
        { name: 'Layout', slug: 'layout', is_default: false },
        []
      );

      expect(result.id).toBe('rev2');
    });
  });
});
