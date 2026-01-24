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
  revisionDataToComponent
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
});
