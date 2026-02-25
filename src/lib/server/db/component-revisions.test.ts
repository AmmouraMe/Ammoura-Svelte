import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  getOriginalComponentRevision,
  getComponentRevisions,
  getCurrentComponentRevision,
  createComponentRevision,
  publishComponentRevision,
  createInitialComponentRevision,
  resetComponentToOriginal,
  componentToRevisionData,
  revisionDataToComponent,
  getComponentRevisionById,
  buildComponentRevisionTree,
  ensureComponentHasRevision
} from './component-revisions';
import type { ComponentRevisionData } from '$lib/types/revisions';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-' + Math.random().toString(36).substring(7)
}));

describe('Component Revisions', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  const siteId = 'site-1';
  const componentId = 1;

  function createMockDb() {
    return {
      prepare: vi.fn(),
      batch: vi.fn()
    } as unknown as D1Database & {
      prepare: ReturnType<typeof vi.fn>;
      batch: ReturnType<typeof vi.fn>;
    };
  }

  const mockRevisionData: ComponentRevisionData = {
    name: 'Test Component',
    description: 'A test component',
    type: 'container',
    config: {
      containerPadding: { desktop: { top: 20, right: 20, bottom: 20, left: 20 } },
      containerBackground: 'transparent'
    },
    children: [
      {
        id: 'child-1',
        type: 'text',
        position: 0,
        config: { text: 'Hello World' }
      }
    ]
  };

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('getOriginalComponentRevision', () => {
    it('should return the oldest revision for a component', async () => {
      const mockRevision = {
        id: 'rev-1',
        site_id: siteId,
        entity_type: 'component',
        entity_id: '1',
        revision_hash: 'abc1234',
        data: JSON.stringify(mockRevisionData),
        is_current: true,
        created_at: 1000000,
        message: 'Initial default'
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevision)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getOriginalComponentRevision(mockDb, siteId, componentId);

      expect(result).not.toBeNull();
      expect(result?.data.name).toBe('Test Component');
      expect(result?.data.type).toBe('container');
      expect(mockStatement.bind).toHaveBeenCalledWith(siteId, '1');
    });

    it('should return null if no revision exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getOriginalComponentRevision(mockDb, siteId, componentId);

      expect(result).toBeNull();
    });
  });

  describe('createComponentRevision', () => {
    it('should create a new revision for a component', async () => {
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      mockDb.prepare
        .mockReturnValueOnce(mockHashesStatement)
        .mockReturnValueOnce(mockInsertStatement);

      const result = await createComponentRevision(mockDb, siteId, componentId, mockRevisionData, {
        userId: 'user-1',
        message: 'Updated component'
      });

      expect(result.entity_type).toBe('component');
      expect(result.entity_id).toBe('1');
      expect(result.data).toEqual(mockRevisionData);
      expect(result.message).toBe('Updated component');
    });
  });

  describe('createInitialComponentRevision', () => {
    it('should create and publish an initial revision', async () => {
      // Mock for createRevision
      const mockHashesStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      };

      const mockInsertStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      // Mock for setCurrentRevision (batch)
      const mockUnmarkStatement = {
        bind: vi.fn().mockReturnThis()
      };
      const mockMarkStatement = {
        bind: vi.fn().mockReturnThis()
      };

      mockDb.prepare
        .mockReturnValueOnce(mockHashesStatement) // getExistingHashes
        .mockReturnValueOnce(mockInsertStatement) // insert revision
        .mockReturnValueOnce(mockUnmarkStatement) // unmark all
        .mockReturnValueOnce(mockMarkStatement); // mark current

      mockDb.batch.mockResolvedValue([]);

      const result = await createInitialComponentRevision(
        mockDb,
        siteId,
        componentId,
        mockRevisionData,
        { message: 'Initial default configuration' }
      );

      expect(result.is_current).toBe(true);
      expect(result.entity_type).toBe('component');
      expect(mockDb.batch).toHaveBeenCalled();
    });
  });

  describe('resetComponentToOriginal', () => {
    it('should restore component to original revision', async () => {
      const originalRevision = {
        id: 'rev-original',
        site_id: siteId,
        entity_type: 'component',
        entity_id: '1',
        revision_hash: 'orig123',
        data: JSON.stringify(mockRevisionData),
        is_current: false,
        created_at: 1000000,
        message: 'Initial default'
      };

      // Mock getOriginalComponentRevision
      const mockGetOriginalStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(originalRevision)
      };

      // Mock UPDATE components
      const mockUpdateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      // Mock DELETE component_widgets
      const mockDeleteStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({})
      };

      // Mock setCurrentRevision (batch)
      const mockUnmarkStatement = {
        bind: vi.fn().mockReturnThis()
      };
      const mockMarkStatement = {
        bind: vi.fn().mockReturnThis()
      };

      mockDb.prepare
        .mockReturnValueOnce(mockGetOriginalStatement) // getOriginalComponentRevision
        .mockReturnValueOnce(mockUpdateStatement) // UPDATE components
        .mockReturnValueOnce(mockDeleteStatement) // DELETE component_widgets
        .mockReturnValueOnce(mockUnmarkStatement) // unmark all revisions
        .mockReturnValueOnce(mockMarkStatement); // mark original as current

      mockDb.batch.mockResolvedValue([]);

      const result = await resetComponentToOriginal(mockDb, siteId, componentId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Component');
      expect(result?.type).toBe('container');
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it('should return null if no original revision exists', async () => {
      const mockGetOriginalStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };

      mockDb.prepare.mockReturnValue(mockGetOriginalStatement);

      const result = await resetComponentToOriginal(mockDb, siteId, componentId);

      expect(result).toBeNull();
    });
  });

  describe('componentToRevisionData', () => {
    it('should convert component to revision data format', () => {
      const component = {
        name: 'Test Navbar',
        description: 'Navigation bar',
        type: 'navbar',
        config: {
          position: 'sticky',
          children: [{ id: 'logo', type: 'heading', position: 0, config: { text: 'Logo' } }]
        }
      };

      const result = componentToRevisionData(component);

      expect(result.name).toBe('Test Navbar');
      expect(result.type).toBe('navbar');
      expect(result.children).toHaveLength(1);
      expect(result.children?.[0].id).toBe('logo');
      // Children should be extracted from config
      expect(result.config.children).toBeUndefined();
      expect(result.config.position).toBe('sticky');
    });

    it('should handle component without children', () => {
      const component = {
        name: 'Simple Text',
        type: 'text',
        config: { text: 'Hello', fontSize: 16 }
      };

      const result = componentToRevisionData(component);

      expect(result.name).toBe('Simple Text');
      expect(result.children).toBeUndefined();
      expect(result.config.text).toBe('Hello');
    });
  });

  describe('revisionDataToComponent', () => {
    it('should convert revision data back to component format', () => {
      const revisionData: ComponentRevisionData = {
        name: 'Test Navbar',
        description: 'Navigation bar',
        type: 'navbar',
        config: { position: 'sticky' },
        children: [{ id: 'logo', type: 'heading', position: 0, config: { text: 'Logo' } }]
      };

      const result = revisionDataToComponent(revisionData);

      expect(result.name).toBe('Test Navbar');
      expect(result.type).toBe('navbar');
      // Children should be merged back into config
      expect(result.config.children).toHaveLength(1);
      expect(result.config.position).toBe('sticky');
    });

    it('should handle revision data without children', () => {
      const revisionData: ComponentRevisionData = {
        name: 'Simple Text',
        type: 'text',
        config: { text: 'Hello', fontSize: 16 }
      };

      const result = revisionDataToComponent(revisionData);

      expect(result.name).toBe('Simple Text');
      expect(result.config.text).toBe('Hello');
      expect(result.config.children).toBeUndefined();
    });
  });

  describe('getComponentRevisions', () => {
    it('should return all revisions for a component', async () => {
      const mockRevisions = [
        {
          id: 'rev-2',
          site_id: siteId,
          entity_type: 'component',
          entity_id: '1',
          revision_hash: 'def5678',
          data: JSON.stringify({ ...mockRevisionData, name: 'Updated' }),
          is_current: true,
          created_at: 2000000
        },
        {
          id: 'rev-1',
          site_id: siteId,
          entity_type: 'component',
          entity_id: '1',
          revision_hash: 'abc1234',
          data: JSON.stringify(mockRevisionData),
          is_current: false,
          created_at: 1000000
        }
      ];

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRevisions })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getComponentRevisions(mockDb, siteId, componentId);

      expect(result).toHaveLength(2);
      expect(result[0].data.name).toBe('Updated');
      expect(result[1].data.name).toBe('Test Component');
    });
  });

  describe('getCurrentComponentRevision', () => {
    it('should return the current published revision', async () => {
      const mockRevision = {
        id: 'rev-current',
        site_id: siteId,
        entity_type: 'component',
        entity_id: '1',
        revision_hash: 'cur1234',
        data: JSON.stringify(mockRevisionData),
        is_current: true,
        created_at: 2000000
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRevision)
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getCurrentComponentRevision(mockDb, siteId, componentId);

      expect(result).not.toBeNull();
      expect(result?.is_current).toBe(true);
    });
  });

  describe('publishComponentRevision', () => {
    it('should mark a revision as current', async () => {
      const mockUnmarkStatement = {
        bind: vi.fn().mockReturnThis()
      };
      const mockMarkStatement = {
        bind: vi.fn().mockReturnThis()
      };

      mockDb.prepare
        .mockReturnValueOnce(mockUnmarkStatement)
        .mockReturnValueOnce(mockMarkStatement);
      mockDb.batch.mockResolvedValue([]);

      await publishComponentRevision(mockDb, siteId, componentId, 'rev-to-publish');

      expect(mockDb.batch).toHaveBeenCalled();
    });
  });

  describe('getComponentRevisionById', () => {
    it('should return a specific revision by ID', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 'rev-1',
            site_id: siteId,
            entity_type: 'component',
            entity_id: String(componentId),
            revision_hash: 'abc123',
            data: JSON.stringify(mockRevisionData),
            message: 'Test revision',
            user_id: null,
            parent_revision_id: null,
            is_current: 1,
            created_at: 12345
          })
        })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getComponentRevisionById(mockDb, siteId, 'rev-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('rev-1');
    });

    it('should return null when revision not found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await getComponentRevisionById(mockDb, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('buildComponentRevisionTree', () => {
    it('should build a tree from revisions', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: 'rev-1',
                site_id: siteId,
                entity_type: 'component',
                entity_id: String(componentId),
                revision_hash: 'abc123',
                data: JSON.stringify(mockRevisionData),
                message: 'Initial',
                user_id: null,
                parent_revision_id: null,
                is_current: 1,
                created_at: 12345
              }
            ]
          })
        })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const result = await buildComponentRevisionTree(mockDb, siteId, componentId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('ensureComponentHasRevision', () => {
    it('should return existing current revision if revisions exist', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: 'rev-existing',
                site_id: siteId,
                entity_type: 'component',
                entity_id: String(componentId),
                revision_hash: 'abc123',
                data: JSON.stringify(mockRevisionData),
                message: 'Existing',
                user_id: null,
                parent_revision_id: null,
                is_current: 1,
                created_at: 12345
              }
            ]
          })
        })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const component = {
        name: 'Test',
        type: 'container',
        config: { padding: 10 }
      };

      const result = await ensureComponentHasRevision(
        mockDb,
        siteId,
        componentId,
        component,
        'user-1'
      );

      expect(result).not.toBeNull();
      expect(result.id).toBe('rev-existing');
    });

    it('should return first revision if no current revision found', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: 'rev-first',
                site_id: siteId,
                entity_type: 'component',
                entity_id: String(componentId),
                revision_hash: 'abc123',
                data: JSON.stringify(mockRevisionData),
                message: 'First',
                user_id: null,
                parent_revision_id: null,
                is_current: 0,
                created_at: 12345
              }
            ]
          })
        })
      };
      mockDb.prepare.mockReturnValue(mockStatement);

      const component = {
        name: 'Test',
        type: 'container',
        config: { padding: 10 }
      };

      const result = await ensureComponentHasRevision(mockDb, siteId, componentId, component);

      expect(result).not.toBeNull();
      expect(result.id).toBe('rev-first');
    });

    it('should create initial revision when none exist', async () => {
      // First call: getComponentRevisions returns empty
      const mockAllEmpty = vi.fn().mockResolvedValue({ results: [] });
      // Create revision calls
      const mockInsertRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirstCreated = vi.fn().mockResolvedValue({
        id: 'rev-new',
        site_id: siteId,
        entity_type: 'component',
        entity_id: String(componentId),
        revision_hash: 'new123',
        data: JSON.stringify(mockRevisionData),
        message: 'Initial component configuration',
        user_id: 'user-1',
        parent_revision_id: null,
        is_current: 0,
        created_at: 12345
      });

      let prepareCallCount = 0;
      mockDb.prepare.mockImplementation(() => {
        prepareCallCount++;
        if (prepareCallCount === 1) {
          // getComponentRevisions query
          return {
            bind: vi.fn().mockReturnValue({ all: mockAllEmpty })
          };
        }
        // Subsequent queries for createRevision, etc.
        return {
          bind: vi.fn().mockReturnValue({
            run: mockInsertRun,
            first: mockFirstCreated,
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        };
      });

      // Mock batch for publishComponentRevision
      mockDb.batch.mockResolvedValue([]);

      const component = {
        name: 'Test',
        type: 'container',
        config: { padding: 10, children: [{ id: 'c1', type: 'text' }] }
      };

      const result = await ensureComponentHasRevision(
        mockDb,
        siteId,
        componentId,
        component,
        'user-1'
      );

      expect(result).not.toBeNull();
    });

    it('should return null when no original revision exists', async () => {
      const mockStatement = {
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      };
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStatement);

      const { resetComponentToOriginal } = await import('./component-revisions');
      const result = await resetComponentToOriginal(mockDb, siteId, componentId);

      expect(result).toBeNull();
    });

    it('should reset component when original revision exists', async () => {
      const originalRevisionRow = {
        id: 'rev-orig',
        component_id: componentId,
        site_id: siteId,
        revision_hash: 'orig1234',
        parent_revision_id: null,
        data: JSON.stringify({
          name: 'Original',
          config: { title: 'Original Title' },
          children: []
        }),
        status: 'draft',
        is_current: 0,
        created_by: 'user-1',
        created_at: 1000,
        notes: null
      };

      const mockFirst = vi.fn().mockResolvedValue(originalRevisionRow);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({
        first: mockFirst,
        run: mockRun
      });
      (mockDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
        bind: mockBind
      });

      const { resetComponentToOriginal } = await import('./component-revisions');
      const result = await resetComponentToOriginal(mockDb, siteId, componentId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Original');
    });
  });
});
