/**
 * Tests for component children database operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getComponentChildren,
  getComponentChild,
  createComponentChild,
  updateComponentChild,
  deleteComponentChild,
  deleteComponentChildren,
  saveComponentChildren,
  // Deprecated aliases
  getComponentWidgets,
  getComponentWidget,
  createComponentWidget,
  updateComponentWidget,
  deleteComponentWidget,
  deleteComponentWidgets,
  saveComponentWidgets
} from './componentChildren';

// Mock D1Database
function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(),
    first: vi.fn(),
    run: vi.fn()
  };
}

describe('componentChildren database operations', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('getComponentChildren', () => {
    it('returns all children for a component ordered by position', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          component_id: 1,
          type: 'text',
          position: 0,
          config: '{"content":"Hello"}',
          parent_id: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'child-2',
          component_id: 1,
          type: 'image',
          position: 1,
          config: '{"src":"/test.jpg"}',
          parent_id: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockChildren });

      const result = await getComponentChildren(mockDb as unknown as D1Database, 1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM component_widgets WHERE component_id = ? ORDER BY position ASC'
      );
      expect(mockDb.bind).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('child-1');
      expect(result[0].config).toEqual({ content: 'Hello' });
      expect(result[1].id).toBe('child-2');
      expect(result[1].config).toEqual({ src: '/test.jpg' });
    });

    it('parses config that is already an object', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          component_id: 1,
          type: 'text',
          position: 0,
          config: { content: 'Already parsed' },
          parent_id: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockChildren });

      const result = await getComponentChildren(mockDb as unknown as D1Database, 1);

      expect(result[0].config).toEqual({ content: 'Already parsed' });
    });

    it('returns empty array when no children exist', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const result = await getComponentChildren(mockDb as unknown as D1Database, 999);

      expect(result).toEqual([]);
    });

    it('returns empty array when results is undefined', async () => {
      mockDb.all.mockResolvedValue({});

      const result = await getComponentChildren(mockDb as unknown as D1Database, 1);

      expect(result).toEqual([]);
    });

    it('throws error when database query fails', async () => {
      const error = new Error('Database error');
      mockDb.all.mockRejectedValue(error);

      await expect(getComponentChildren(mockDb as unknown as D1Database, 1)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getComponentChild', () => {
    it('returns a single child by ID', async () => {
      const mockChild = {
        id: 'child-1',
        component_id: 1,
        type: 'text',
        position: 0,
        config: '{"content":"Hello"}',
        parent_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockDb.first.mockResolvedValue(mockChild);

      const result = await getComponentChild(mockDb as unknown as D1Database, 'child-1');

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM component_widgets WHERE id = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('child-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('child-1');
      expect(result?.config).toEqual({ content: 'Hello' });
    });

    it('parses config that is already an object', async () => {
      const mockChild = {
        id: 'child-1',
        component_id: 1,
        type: 'text',
        position: 0,
        config: { content: 'Already parsed' },
        parent_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockDb.first.mockResolvedValue(mockChild);

      const result = await getComponentChild(mockDb as unknown as D1Database, 'child-1');

      expect(result?.config).toEqual({ content: 'Already parsed' });
    });

    it('returns null when child is not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await getComponentChild(mockDb as unknown as D1Database, 'nonexistent');

      expect(result).toBeNull();
    });

    it('throws error when database query fails', async () => {
      const error = new Error('Database error');
      mockDb.first.mockRejectedValue(error);

      await expect(getComponentChild(mockDb as unknown as D1Database, 'child-1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('createComponentChild', () => {
    it('creates a new child with all fields', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      const childData = {
        id: 'child-1',
        component_id: 1,
        type: 'text',
        position: 0,
        config: { content: 'Hello' },
        parent_id: 'parent-1'
      };

      const result = await createComponentChild(mockDb as unknown as D1Database, childData);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO component_widgets')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(
        'child-1',
        1,
        'text',
        0,
        '{"content":"Hello"}',
        'parent-1',
        expect.any(String),
        expect.any(String)
      );
      expect(result.id).toBe('child-1');
      expect(result.component_id).toBe(1);
      expect(result.type).toBe('text');
      expect(result.position).toBe(0);
      expect(result.config).toEqual({ content: 'Hello' });
      expect(result.parent_id).toBe('parent-1');
    });

    it('creates a child without parent_id', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      const childData = {
        id: 'child-1',
        component_id: 1,
        type: 'text',
        position: 0,
        config: { content: 'Hello' }
      };

      const result = await createComponentChild(mockDb as unknown as D1Database, childData);

      expect(mockDb.bind).toHaveBeenCalledWith(
        'child-1',
        1,
        'text',
        0,
        '{"content":"Hello"}',
        null,
        expect.any(String),
        expect.any(String)
      );
      expect(result.parent_id).toBeUndefined();
    });

    it('sets created_at and updated_at timestamps', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      const childData = {
        id: 'child-1',
        component_id: 1,
        type: 'text',
        position: 0,
        config: {}
      };

      const result = await createComponentChild(mockDb as unknown as D1Database, childData);

      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(result.created_at).toBe(result.updated_at);
    });

    it('throws error when database insert fails', async () => {
      const error = new Error('Insert failed');
      mockDb.run.mockRejectedValue(error);

      await expect(
        createComponentChild(mockDb as unknown as D1Database, {
          id: 'child-1',
          component_id: 1,
          type: 'text',
          position: 0,
          config: {}
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updateComponentChild', () => {
    it('updates type field', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        type: 'image'
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE component_widgets SET')
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('type = ?'));
      expect(mockDb.bind).toHaveBeenCalledWith('image', expect.any(String), 'child-1');
    });

    it('updates position field', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        position: 5
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('position = ?'));
      expect(mockDb.bind).toHaveBeenCalledWith(5, expect.any(String), 'child-1');
    });

    it('updates config field as JSON string', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        config: { newContent: 'Updated' }
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('config = ?'));
      expect(mockDb.bind).toHaveBeenCalledWith(
        '{"newContent":"Updated"}',
        expect.any(String),
        'child-1'
      );
    });

    it('updates parent_id field', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        parent_id: 'new-parent'
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('parent_id = ?'));
      expect(mockDb.bind).toHaveBeenCalledWith('new-parent', expect.any(String), 'child-1');
    });

    it('sets parent_id to null when empty string', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        parent_id: ''
      });

      expect(mockDb.bind).toHaveBeenCalledWith(null, expect.any(String), 'child-1');
    });

    it('updates multiple fields at once', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        type: 'video',
        position: 3,
        config: { src: '/video.mp4' },
        parent_id: 'container-1'
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('type = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('position = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('config = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('parent_id = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('updated_at = ?'));
    });

    it('always updates the updated_at timestamp', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await updateComponentChild(mockDb as unknown as D1Database, 'child-1', {
        type: 'text'
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('updated_at = ?'));
    });

    it('throws error when database update fails', async () => {
      const error = new Error('Update failed');
      mockDb.run.mockRejectedValue(error);

      await expect(
        updateComponentChild(mockDb as unknown as D1Database, 'child-1', { type: 'text' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteComponentChild', () => {
    it('deletes a single child by ID', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await deleteComponentChild(mockDb as unknown as D1Database, 'child-1');

      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM component_widgets WHERE id = ?');
      expect(mockDb.bind).toHaveBeenCalledWith('child-1');
    });

    it('throws error when database delete fails', async () => {
      const error = new Error('Delete failed');
      mockDb.run.mockRejectedValue(error);

      await expect(
        deleteComponentChild(mockDb as unknown as D1Database, 'child-1')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteComponentChildren', () => {
    it('deletes all children for a component', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await deleteComponentChildren(mockDb as unknown as D1Database, 1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );
      expect(mockDb.bind).toHaveBeenCalledWith(1);
    });

    it('throws error when database delete fails', async () => {
      const error = new Error('Delete failed');
      mockDb.run.mockRejectedValue(error);

      await expect(deleteComponentChildren(mockDb as unknown as D1Database, 1)).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('saveComponentChildren', () => {
    it('deletes existing children and creates new ones', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      const children = [
        { id: 'new-1', type: 'text', position: 0, config: { content: 'First' } },
        { id: 'new-2', type: 'image', position: 1, config: { src: '/img.jpg' } }
      ];

      await saveComponentChildren(mockDb as unknown as D1Database, 1, children);

      // Should delete first
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );

      // Should create new children
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO component_widgets')
      );
    });

    it('saves children with parent_id', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      const children = [
        { id: 'child-1', type: 'text', position: 0, config: {}, parent_id: 'container-1' }
      ];

      await saveComponentChildren(mockDb as unknown as D1Database, 1, children);

      expect(mockDb.bind).toHaveBeenCalledWith(
        'child-1',
        1,
        'text',
        0,
        '{}',
        'container-1',
        expect.any(String),
        expect.any(String)
      );
    });

    it('handles empty children array', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await saveComponentChildren(mockDb as unknown as D1Database, 1, []);

      // Should still delete existing children
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );
    });

    it('throws error when delete fails', async () => {
      const error = new Error('Delete failed');
      mockDb.run.mockRejectedValueOnce(error);

      await expect(saveComponentChildren(mockDb as unknown as D1Database, 1, [])).rejects.toThrow(
        'Delete failed'
      );
    });

    it('throws error when create fails', async () => {
      mockDb.run
        .mockResolvedValueOnce({ success: true }) // delete succeeds
        .mockRejectedValueOnce(new Error('Create failed')); // create fails

      const children = [{ id: 'child-1', type: 'text', position: 0, config: {} }];

      await expect(
        saveComponentChildren(mockDb as unknown as D1Database, 1, children)
      ).rejects.toThrow('Create failed');
    });

    it('deduplicates children by ID, keeping the last occurrence', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      // Duplicate IDs - should only insert the last one
      const children = [
        { id: 'child-1', type: 'text', position: 0, config: { content: 'First' } },
        { id: 'child-2', type: 'image', position: 1, config: { src: '/img.jpg' } },
        { id: 'child-1', type: 'text', position: 2, config: { content: 'Updated' } } // duplicate
      ];

      await saveComponentChildren(mockDb as unknown as D1Database, 1, children);

      // Should delete existing children first
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );

      // Count the number of INSERT OR REPLACE calls (should be 2, not 3)
      const insertCalls = mockDb.prepare.mock.calls.filter((call: string[]) =>
        call[0]?.includes('INSERT OR REPLACE INTO component_widgets')
      );
      expect(insertCalls.length).toBe(2);

      // Verify the last occurrence of child-1 is used (with 'Updated' content)
      const bindCalls = mockDb.bind.mock.calls;
      const child1BindCall = bindCalls.find((call: unknown[]) => call[0] === 'child-1');
      expect(child1BindCall).toBeDefined();
      expect(child1BindCall?.[4]).toBe(JSON.stringify({ content: 'Updated' }));
    });
  });

  describe('deprecated aliases', () => {
    it('getComponentWidgets is alias for getComponentChildren', () => {
      expect(getComponentWidgets).toBe(getComponentChildren);
    });

    it('getComponentWidget is alias for getComponentChild', () => {
      expect(getComponentWidget).toBe(getComponentChild);
    });

    it('createComponentWidget is alias for createComponentChild', () => {
      expect(createComponentWidget).toBe(createComponentChild);
    });

    it('updateComponentWidget is alias for updateComponentChild', () => {
      expect(updateComponentWidget).toBe(updateComponentChild);
    });

    it('deleteComponentWidget is alias for deleteComponentChild', () => {
      expect(deleteComponentWidget).toBe(deleteComponentChild);
    });

    it('deleteComponentWidgets is alias for deleteComponentChildren', () => {
      expect(deleteComponentWidgets).toBe(deleteComponentChildren);
    });

    it('saveComponentWidgets is alias for saveComponentChildren', () => {
      expect(saveComponentWidgets).toBe(saveComponentChildren);
    });
  });
});
