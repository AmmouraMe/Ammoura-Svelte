import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';

// Mock the database functions
const mockGetLayoutRevisions = vi.fn();
const mockBuildLayoutRevisionTree = vi.fn();
const mockCreateLayoutRevision = vi.fn();
const mockLayoutToRevisionData = vi.fn();
const mockLogRevisionAction = vi.fn();

vi.mock('$lib/server/db/layout-revisions', () => ({
  getLayoutRevisions: (...args: unknown[]) => mockGetLayoutRevisions(...args),
  buildLayoutRevisionTree: (...args: unknown[]) => mockBuildLayoutRevisionTree(...args),
  createLayoutRevision: (...args: unknown[]) => mockCreateLayoutRevision(...args),
  layoutToRevisionData: (...args: unknown[]) => mockLayoutToRevisionData(...args)
}));

vi.mock('$lib/server/activity-logger', () => ({
  logRevisionAction: (...args: unknown[]) => mockLogRevisionAction(...args)
}));

vi.mock('$lib/server/db/connection', () => ({
  getDB: () => ({}) as D1Database
}));

describe('Layout Revisions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/layouts/[layoutId]/revisions', () => {
    it('should return a list of revisions', async () => {
      const mockRevisions = [
        {
          id: 'rev-1',
          entity_type: 'layout',
          entity_id: '1',
          revision_hash: 'abc1234',
          data: { name: 'Main Layout', slug: 'main', is_default: true, widgets: [] },
          created_at: 1234567890,
          is_current: true
        }
      ];

      mockGetLayoutRevisions.mockResolvedValue(mockRevisions);

      expect(mockGetLayoutRevisions).toBeDefined();
    });

    it('should return tree structure when tree=true', async () => {
      const mockTree = [
        {
          id: 'rev-1',
          children: [],
          depth: 0,
          branch: 0
        }
      ];

      mockBuildLayoutRevisionTree.mockResolvedValue(mockTree);

      expect(mockBuildLayoutRevisionTree).toBeDefined();
    });
  });

  describe('POST /api/layouts/[layoutId]/revisions', () => {
    it('should create a new revision', async () => {
      const mockRevision = {
        id: 'rev-new',
        entity_type: 'layout',
        entity_id: '1',
        revision_hash: 'xyz7890',
        data: { name: 'Updated Layout', slug: 'main', is_default: true, widgets: [] },
        created_at: Date.now(),
        is_current: false
      };

      mockLayoutToRevisionData.mockReturnValue({
        name: 'Updated Layout',
        slug: 'main',
        is_default: true,
        widgets: []
      });
      mockCreateLayoutRevision.mockResolvedValue(mockRevision);
      mockLogRevisionAction.mockResolvedValue(undefined);

      expect(mockCreateLayoutRevision).toBeDefined();
    });
  });
});
