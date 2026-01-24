/**
 * Tests for component database functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getComponents,
  getComponentsWithChildrenCount,
  getComponentsByType,
  getComponent,
  getGlobalComponentByName,
  createComponent,
  updateComponent,
  deleteComponent,
  isComponentInUse,
  getComponentWithChildren,
  saveComponentWithChildren,
  resetBuiltInComponent,
  getComponentWithWidgets,
  saveComponentWithWidgets,
  resolveComponentRefs
} from './components';
import type { Component } from '$lib/types/pages';

// Mock componentChildren module
vi.mock('./componentChildren', () => ({
  getComponentChildren: vi.fn(),
  saveComponentChildren: vi.fn(),
  getComponentWidgets: vi.fn(),
  saveComponentWidgets: vi.fn()
}));

// Mock component-revisions module - provides mocks for revision tracking
vi.mock('./component-revisions', () => ({
  resetComponentToOriginal: vi.fn().mockResolvedValue(null),
  getCurrentComponentRevision: vi.fn().mockResolvedValue(null),
  createComponentRevision: vi.fn().mockResolvedValue({ id: 'mock-revision-id' }),
  publishComponentRevision: vi.fn().mockResolvedValue(undefined)
}));

import { getComponentChildren, saveComponentChildren } from './componentChildren';

describe('Component Database Functions', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
    first: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      bind: vi.fn(),
      all: vi.fn(),
      first: vi.fn(),
      run: vi.fn()
    };

    // Setup default mock chain
    mockDb.prepare.mockReturnValue(mockDb);
    mockDb.bind.mockReturnValue(mockDb);
    vi.clearAllMocks();
  });

  describe('getComponents', () => {
    it('should return components with is_primitive field', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Container',
          description: 'A container primitive',
          type: 'container',
          config: '{}',
          is_global: 1,
          is_primitive: 1,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 2,
          site_id: '1',
          name: 'Hero',
          description: 'A hero component',
          type: 'hero',
          config: '{"title":"Welcome"}',
          is_global: 1,
          is_primitive: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponents(mockDb as unknown as D1Database, '1');

      expect(components).toHaveLength(2);
      expect(components[0].is_primitive).toBe(true);
      expect(components[0].is_global).toBe(true);
      expect(components[1].is_primitive).toBe(false);
      expect(components[1].is_global).toBe(true);
    });

    it('should parse JSON config correctly', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Button',
          type: 'button',
          config: '{"text":"Click Me","color":"blue"}',
          is_global: 1,
          is_primitive: 1
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponents(mockDb as unknown as D1Database, '1');

      expect(components[0].config).toEqual({ text: 'Click Me', color: 'blue' });
    });

    it('should handle already parsed config objects', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Button',
          type: 'button',
          config: { text: 'Click Me' },
          is_global: 0,
          is_primitive: 0
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponents(mockDb as unknown as D1Database, '1');

      expect(components[0].config).toEqual({ text: 'Click Me' });
    });
  });

  describe('getComponentsWithChildrenCount', () => {
    it('should return components with children_count field', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Container',
          description: 'A container',
          type: 'container',
          config: '{}',
          is_global: 0,
          is_primitive: 0,
          children_count: 3,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: 2,
          site_id: '1',
          name: 'Empty Button',
          description: 'A button with no children',
          type: 'button',
          config: '{}',
          is_global: 0,
          is_primitive: 0,
          children_count: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponentsWithChildrenCount(mockDb as unknown as D1Database, '1');

      expect(components).toHaveLength(2);
      expect(components[0].children_count).toBe(3);
      expect(components[0].name).toBe('Container');
      expect(components[1].children_count).toBe(0);
      expect(components[1].name).toBe('Empty Button');
    });

    it('should default children_count to 0 if null', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Test',
          description: null,
          type: 'container',
          config: '{}',
          is_global: 0,
          is_primitive: 0,
          children_count: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponentsWithChildrenCount(mockDb as unknown as D1Database, '1');

      expect(components[0].children_count).toBe(0);
    });

    it('should count children from config.children when widget table count is 0', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Custom Component',
          description: 'A component with inline children',
          type: 'composite',
          config: JSON.stringify({
            children: [
              { id: 'child-1', type: 'text', config: {}, position: 0 },
              { id: 'child-2', type: 'button', config: {}, position: 1 }
            ]
          }),
          is_global: 0,
          is_primitive: 0,
          children_count: 0, // Legacy widget table count is 0
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponentsWithChildrenCount(mockDb as unknown as D1Database, '1');

      expect(components[0].children_count).toBe(2); // Should use config.children count
    });

    it('should use max of widget table count and config.children count', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Mixed Component',
          description: 'A component with both sources',
          type: 'container',
          config: JSON.stringify({
            children: [{ id: 'child-1', type: 'text', config: {}, position: 0 }]
          }),
          is_global: 0,
          is_primitive: 0,
          children_count: 5, // Legacy has more
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponentsWithChildrenCount(mockDb as unknown as D1Database, '1');

      expect(components[0].children_count).toBe(5); // Should use the larger value
    });
  });

  describe('getComponentsByType', () => {
    it('should return components of specific type with is_primitive field', async () => {
      const mockResults = [
        {
          id: 1,
          site_id: '1',
          name: 'Container',
          type: 'container',
          config: '{}',
          is_global: 1,
          is_primitive: 1
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponentsByType(
        mockDb as unknown as D1Database,
        '1',
        'container'
      );

      expect(components).toHaveLength(1);
      expect(components[0].type).toBe('container');
      expect(components[0].is_primitive).toBe(true);
    });
  });

  describe('getComponent', () => {
    it('should return a single component with is_primitive field', async () => {
      const mockResult = {
        id: 1,
        site_id: '1',
        name: 'Text',
        description: 'Text primitive',
        type: 'text',
        config: '{"content":"Hello"}',
        is_global: 1,
        is_primitive: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.first.mockResolvedValue(mockResult);

      const component = await getComponent(mockDb as unknown as D1Database, '1', 1);

      expect(component).not.toBeNull();
      expect(component?.is_primitive).toBe(true);
      expect(component?.is_global).toBe(true);
      expect(component?.config).toEqual({ content: 'Hello' });
    });

    it('should return null when component not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const component = await getComponent(mockDb as unknown as D1Database, '1', 999);

      expect(component).toBeNull();
    });
  });

  describe('getGlobalComponentByName', () => {
    it('should return a global component by name', async () => {
      const mockResult = {
        id: 1,
        site_id: 'global',
        name: 'Navigation Bar',
        description: 'Built-in navigation bar',
        type: 'navbar',
        config: '{"logo":{"text":"My Store"}}',
        is_global: 1,
        is_primitive: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.first.mockResolvedValue(mockResult);

      const component = await getGlobalComponentByName(
        mockDb as unknown as D1Database,
        'Navigation Bar'
      );

      expect(component).not.toBeNull();
      expect(component?.name).toBe('Navigation Bar');
      expect(component?.is_global).toBe(true);
      expect(component?.config).toEqual({ logo: { text: 'My Store' } });
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM components WHERE name = ? AND is_global = 1'
      );
    });

    it('should return null when global component not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const component = await getGlobalComponentByName(
        mockDb as unknown as D1Database,
        'NonExistent Component'
      );

      expect(component).toBeNull();
    });

    it('should return null on database error', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const component = await getGlobalComponentByName(
        mockDb as unknown as D1Database,
        'Navigation Bar'
      );

      expect(component).toBeNull();
    });
  });

  describe('createComponent', () => {
    it('should create a component with is_primitive flag', async () => {
      const mockResult = {
        id: 1,
        site_id: '1',
        name: 'New Primitive',
        description: 'A new primitive component',
        type: 'container',
        config: '{}',
        is_global: 1,
        is_primitive: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.first.mockResolvedValue(mockResult);

      const component = await createComponent(mockDb as unknown as D1Database, '1', {
        name: 'New Primitive',
        description: 'A new primitive component',
        type: 'container',
        config: {},
        is_global: true,
        is_primitive: true
      });

      expect(component.is_primitive).toBe(true);
      expect(component.is_global).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('is_primitive'));
    });

    it('should create a non-primitive component by default', async () => {
      const mockResult = {
        id: 2,
        site_id: '1',
        name: 'Custom Component',
        type: 'hero',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValue(mockResult);

      const component = await createComponent(mockDb as unknown as D1Database, '1', {
        name: 'Custom Component',
        type: 'hero'
      });

      expect(component.is_primitive).toBe(false);
      expect(component.is_global).toBe(false);
    });
  });

  describe('Primitive component filtering', () => {
    it('should allow filtering primitives from components list', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Container',
          type: 'container',
          is_global: 1,
          is_primitive: 1,
          config: '{}'
        },
        { id: 2, name: 'Button', type: 'button', is_global: 1, is_primitive: 1, config: '{}' },
        { id: 3, name: 'Hero', type: 'hero', is_global: 1, is_primitive: 0, config: '{}' },
        { id: 4, name: 'Custom Widget', type: 'text', is_global: 0, is_primitive: 0, config: '{}' }
      ];

      mockDb.all.mockResolvedValue({ results: mockResults });

      const components = await getComponents(mockDb as unknown as D1Database, '1');

      // Filter primitives
      const primitives = components.filter((c: Component) => c.is_primitive);
      const builtIn = components.filter((c: Component) => c.is_global && !c.is_primitive);
      const custom = components.filter((c: Component) => !c.is_global && !c.is_primitive);

      expect(primitives).toHaveLength(2);
      expect(builtIn).toHaveLength(1);
      expect(custom).toHaveLength(1);

      expect(primitives.map((c: Component) => c.name)).toEqual(['Container', 'Button']);
      expect(builtIn[0].name).toBe('Hero');
      expect(custom[0].name).toBe('Custom Widget');
    });
  });

  describe('getComponents error handling', () => {
    it('should throw error when database query fails', async () => {
      mockDb.all.mockRejectedValue(new Error('Database error'));

      await expect(getComponents(mockDb as unknown as D1Database, '1')).rejects.toThrow(
        'Database error'
      );
    });

    it('should return empty array when results is undefined', async () => {
      mockDb.all.mockResolvedValue({});

      const components = await getComponents(mockDb as unknown as D1Database, '1');

      expect(components).toEqual([]);
    });
  });

  describe('getComponentsByType error handling', () => {
    it('should throw error when database query fails', async () => {
      mockDb.all.mockRejectedValue(new Error('Database error'));

      await expect(
        getComponentsByType(mockDb as unknown as D1Database, '1', 'navbar')
      ).rejects.toThrow('Database error');
    });

    it('should return empty array when no components match', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const components = await getComponentsByType(
        mockDb as unknown as D1Database,
        '1',
        'nonexistent'
      );

      expect(components).toEqual([]);
    });
  });

  describe('getComponent error handling', () => {
    it('should throw error when database query fails', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      await expect(getComponent(mockDb as unknown as D1Database, '1', 1)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('createComponent error handling', () => {
    it('should throw error when insert returns null', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(
        createComponent(mockDb as unknown as D1Database, '1', {
          name: 'Test',
          type: 'text'
        })
      ).rejects.toThrow('Failed to create component');
    });

    it('should throw error when database insert fails', async () => {
      mockDb.first.mockRejectedValue(new Error('Insert failed'));

      await expect(
        createComponent(mockDb as unknown as D1Database, '1', {
          name: 'Test',
          type: 'text'
        })
      ).rejects.toThrow('Insert failed');
    });

    it('should create component with children when widgets provided', async () => {
      const mockResult = {
        id: 1,
        site_id: '1',
        name: 'With Children',
        type: 'container',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValue(mockResult);
      vi.mocked(saveComponentChildren).mockResolvedValue(undefined);

      await createComponent(mockDb as unknown as D1Database, '1', {
        name: 'With Children',
        type: 'container',
        widgets: [
          { type: 'text', config: { content: 'Hello' }, position: 0 },
          { type: 'button', config: { label: 'Click' }, position: 1 }
        ]
      });

      expect(saveComponentChildren).toHaveBeenCalledWith(
        mockDb,
        1,
        expect.arrayContaining([
          expect.objectContaining({ type: 'text', position: 0 }),
          expect.objectContaining({ type: 'button', position: 1 })
        ])
      );
    });
  });

  describe('updateComponent', () => {
    it('should update component name', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Original',
        type: 'text',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce({ ...mockComponent, name: 'Updated' });

      const result = await updateComponent(mockDb as unknown as D1Database, '1', 1, {
        name: 'Updated'
      });

      expect(result.name).toBe('Updated');
    });

    it('should update multiple fields', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Original',
        description: null,
        type: 'text',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      const updatedComponent = {
        ...mockComponent,
        name: 'Updated',
        description: 'New description',
        type: 'heading',
        config: '{"level":2}',
        is_global: 1
      };

      mockDb.first.mockResolvedValueOnce(mockComponent).mockResolvedValueOnce(updatedComponent);

      const result = await updateComponent(mockDb as unknown as D1Database, '1', 1, {
        name: 'Updated',
        description: 'New description',
        type: 'heading',
        config: { level: 2 },
        is_global: true
      });

      expect(result.name).toBe('Updated');
      expect(result.is_global).toBe(true);
    });

    it('should throw error when component not found', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await expect(
        updateComponent(mockDb as unknown as D1Database, '1', 999, { name: 'Test' })
      ).rejects.toThrow('Component not found');
    });

    it('should throw error when trying to update global component from another site', async () => {
      const globalComponent = {
        id: 1,
        site_id: '999',
        name: 'Global',
        type: 'navbar',
        config: '{}',
        is_global: 1,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValueOnce(globalComponent);

      await expect(
        updateComponent(mockDb as unknown as D1Database, '1', 1, { name: 'Test' })
      ).rejects.toThrow('Cannot update global components from other sites');
    });

    it('should throw error when update returns null', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Original',
        type: 'text',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValueOnce(mockComponent).mockResolvedValueOnce(null);

      await expect(
        updateComponent(mockDb as unknown as D1Database, '1', 1, { name: 'Test' })
      ).rejects.toThrow('Component not found or update failed');
    });
  });

  describe('deleteComponent', () => {
    it('should delete a component', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'To Delete',
        type: 'text',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValue(mockComponent);
      mockDb.run.mockResolvedValue({ success: true });

      await deleteComponent(mockDb as unknown as D1Database, '1', 1);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM components WHERE id = ? AND site_id = ?'
      );
    });

    it('should throw error when trying to delete global component', async () => {
      const globalComponent = {
        id: 1,
        site_id: '1',
        name: 'Global',
        type: 'navbar',
        config: '{}',
        is_global: 1,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValue(globalComponent);

      await expect(deleteComponent(mockDb as unknown as D1Database, '1', 1)).rejects.toThrow(
        'Cannot delete global components'
      );
    });

    it('should throw error when database delete fails', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Test',
        type: 'text',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      mockDb.first.mockResolvedValue(mockComponent);
      mockDb.run.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteComponent(mockDb as unknown as D1Database, '1', 1)).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('isComponentInUse', () => {
    it('should return false when component is not in use', async () => {
      mockDb.first.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 });

      const result = await isComponentInUse(mockDb as unknown as D1Database, 1);

      expect(result.inUse).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should return true when component is used in layout widgets', async () => {
      mockDb.first.mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce({ count: 0 });

      const result = await isComponentInUse(mockDb as unknown as D1Database, 1);

      expect(result.inUse).toBe(true);
      expect(result.count).toBe(3);
    });

    it('should return true when component is used in page widgets', async () => {
      mockDb.first.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 5 });

      const result = await isComponentInUse(mockDb as unknown as D1Database, 1);

      expect(result.inUse).toBe(true);
      expect(result.count).toBe(5);
    });

    it('should return combined count from both sources', async () => {
      mockDb.first.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 3 });

      const result = await isComponentInUse(mockDb as unknown as D1Database, 1);

      expect(result.inUse).toBe(true);
      expect(result.count).toBe(5);
    });

    it('should handle null count values', async () => {
      mockDb.first.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await isComponentInUse(mockDb as unknown as D1Database, 1);

      expect(result.inUse).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should throw error when database query fails', async () => {
      mockDb.first.mockRejectedValue(new Error('Query failed'));

      await expect(isComponentInUse(mockDb as unknown as D1Database, 1)).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('getComponentWithChildren', () => {
    it('should return component with its children', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Container',
        type: 'container',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      const mockChildren = [
        {
          id: 'child-1',
          component_id: 1,
          type: 'text' as const,
          position: 0,
          config: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'child-2',
          component_id: 1,
          type: 'button' as const,
          position: 1,
          config: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockDb.first.mockResolvedValue(mockComponent);
      vi.mocked(getComponentChildren).mockResolvedValue(mockChildren);

      const result = await getComponentWithChildren(mockDb as unknown as D1Database, '1', 1);

      expect(result).not.toBeNull();
      expect(result?.children).toHaveLength(2);
      expect(result?.widgets).toEqual(result?.children);
    });

    it('should return null when component not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await getComponentWithChildren(mockDb as unknown as D1Database, '1', 999);

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      mockDb.first.mockRejectedValue(new Error('Query failed'));

      await expect(
        getComponentWithChildren(mockDb as unknown as D1Database, '1', 1)
      ).rejects.toThrow('Query failed');
    });
  });

  describe('saveComponentWithChildren', () => {
    it('should update component and save children', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Original',
        type: 'container',
        config: '{}',
        is_global: 0,
        is_primitive: 0
      };

      const mockChildren = [
        {
          id: 'child-1',
          component_id: 1,
          type: 'text' as const,
          position: 0,
          config: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Need 3 .first() mocks: 1) getComponent in saveComponentWithChildren, 2) getComponent in updateComponent, 3) UPDATE RETURNING
      mockDb.first
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce({ ...mockComponent, name: 'Updated' });
      vi.mocked(saveComponentChildren).mockResolvedValue(undefined);
      vi.mocked(getComponentChildren).mockResolvedValue(mockChildren);

      const result = await saveComponentWithChildren(mockDb as unknown as D1Database, '1', 1, {
        name: 'Updated',
        children: mockChildren
      });

      expect(saveComponentChildren).toHaveBeenCalledWith(mockDb, 1, mockChildren);
      expect(result.children).toEqual(mockChildren);
      expect(result.widgets).toEqual(mockChildren);
    });

    it('should sync navbar widget config to component config', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Navigation Bar',
        type: 'navbar',
        config: '{}',
        is_global: 1,
        is_primitive: 0
      };

      const navbarConfig = {
        logo: { text: 'My Store', url: '/' },
        links: [{ text: 'Home', url: '/' }],
        showCart: true
      };

      const mockChildren = [
        {
          id: 'navbar-1',
          component_id: 1,
          type: 'navbar' as const,
          position: 0,
          config: navbarConfig,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Need 3 .first() mocks: 1) getComponent in saveComponentWithChildren, 2) getComponent in updateComponent, 3) UPDATE RETURNING
      mockDb.first
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce({ ...mockComponent, config: JSON.stringify(navbarConfig) });
      vi.mocked(saveComponentChildren).mockResolvedValue(undefined);
      vi.mocked(getComponentChildren).mockResolvedValue(mockChildren);

      await saveComponentWithChildren(mockDb as unknown as D1Database, '1', 1, {
        name: 'Navigation Bar',
        type: 'navbar',
        children: mockChildren
      });

      // Verify updateComponent was called with the navbar config
      expect(mockDb.bind).toHaveBeenCalled();
    });

    it('should sync footer widget config to component config', async () => {
      const mockComponent = {
        id: 2,
        site_id: '1',
        name: 'Footer',
        type: 'footer',
        config: '{}',
        is_global: 1,
        is_primitive: 0
      };

      const footerConfig = {
        copyright: '© 2025 My Store',
        footerLinks: [{ text: 'Privacy', url: '/privacy' }]
      };

      const mockChildren = [
        {
          id: 'footer-1',
          component_id: 2,
          type: 'footer' as const,
          position: 0,
          config: footerConfig,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Need 3 .first() mocks: 1) getComponent in saveComponentWithChildren, 2) getComponent in updateComponent, 3) UPDATE RETURNING
      mockDb.first
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce({ ...mockComponent, config: JSON.stringify(footerConfig) });
      vi.mocked(saveComponentChildren).mockResolvedValue(undefined);
      vi.mocked(getComponentChildren).mockResolvedValue(mockChildren);

      await saveComponentWithChildren(mockDb as unknown as D1Database, '1', 2, {
        name: 'Footer',
        type: 'footer',
        children: mockChildren
      });

      // Verify updateComponent was called with the footer config
      expect(mockDb.bind).toHaveBeenCalled();
    });

    it('should reconstruct nested children for navbar components with container children', async () => {
      const mockComponent = {
        id: 1,
        site_id: '1',
        name: 'Navigation Bar',
        type: 'navbar',
        config: '{}',
        is_global: 1,
        is_primitive: 0
      };

      // Flat structure with parent_id relationships (as sent by the builder)
      const mockChildren = [
        {
          id: 'root-container',
          component_id: 1,
          type: 'container' as const,
          position: 0,
          config: { containerBackground: 'theme:secondary' },
          parent_id: undefined,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'inner-container',
          component_id: 1,
          type: 'container' as const,
          position: 0,
          config: { containerJustifyContent: 'flex-end' as const },
          parent_id: 'root-container',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'theme-toggle',
          component_id: 1,
          type: 'theme_toggle' as const,
          position: 0,
          config: { size: 'medium' as const, visibilityRule: 'unauthenticated' as const },
          parent_id: 'inner-container',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Need 3 .first() mocks: 1) getComponent in saveComponentWithChildren, 2) getComponent in updateComponent, 3) UPDATE RETURNING
      mockDb.first
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce(mockComponent)
        .mockResolvedValueOnce(mockComponent);
      vi.mocked(saveComponentChildren).mockResolvedValue(undefined);
      vi.mocked(getComponentChildren).mockResolvedValue(mockChildren);

      await saveComponentWithChildren(mockDb as unknown as D1Database, '1', 1, {
        name: 'Navigation Bar',
        type: 'navbar',
        children: mockChildren
      });

      // Verify the config was reconstructed with nested children
      // The first bind call includes the config parameter for UPDATE
      const bindCalls = mockDb.bind.mock.calls;
      // Find the call that contains the JSON config (it will be a string with 'children')
      const configCall = bindCalls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('children')
      );

      if (configCall) {
        const parsedConfig = JSON.parse(configCall[0] as string);
        expect(parsedConfig.children).toBeDefined();
        expect(parsedConfig.children.length).toBe(1);

        // The inner container should be nested inside the root container's children
        const innerContainer = parsedConfig.children[0];
        expect(innerContainer.id).toBe('inner-container');
        expect(innerContainer.config.children).toBeDefined();
        expect(innerContainer.config.children.length).toBe(1);

        // The theme toggle should be nested inside the inner container
        const themeToggle = innerContainer.config.children[0];
        expect(themeToggle.id).toBe('theme-toggle');
        expect(themeToggle.config.visibilityRule).toBe('unauthenticated');
      }
    });

    it('should throw error when update fails', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await expect(
        saveComponentWithChildren(mockDb as unknown as D1Database, '1', 1, {
          children: []
        })
      ).rejects.toThrow();
    });
  });

  describe('resetBuiltInComponent', () => {
    const testSiteId = 'test-site-id';

    it('should reset component to default navbar config with main-container wrapper', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'navbar');

      // Should update component config
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE components SET config = ?')
      );
      const updateBindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(updateBindCall[0] as string);

      // New architecture: component wrapper has transparent background, main-container has styling
      expect(parsedConfig.containerPadding).toBeDefined();
      expect(parsedConfig.containerBackground).toBe('transparent');
      expect(parsedConfig.children).toBeDefined();
      expect(parsedConfig.children.length).toBe(1); // main-container

      // Verify main-container structure
      const mainContainer = parsedConfig.children[0];
      expect(mainContainer.id).toBe('main-container');
      expect(mainContainer.type).toBe('container');
      expect(mainContainer.config.containerBackground).toBe('transparent');
      expect(mainContainer.config.children).toBeDefined();
      expect(mainContainer.config.children.length).toBe(2); // logo-container and nav-links-container

      // Verify nested children inside main-container
      const logoContainer = mainContainer.config.children[0];
      expect(logoContainer.id).toBe('logo-container');
      expect(logoContainer.type).toBe('container');
      expect(logoContainer.config.children).toBeDefined();

      const navLinksContainer = mainContainer.config.children[1];
      expect(navLinksContainer.id).toBe('nav-links-container');
      expect(navLinksContainer.type).toBe('container');

      // Should delete existing children from component_widgets table
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );

      // Should NOT create component_widgets entries (children are now in config)
      const insertCalls = mockDb.bind.mock.calls.filter((call) => {
        // INSERT calls would have 8+ parameters
        return call.length >= 8;
      });
      expect(insertCalls.length).toBe(0);
    });

    it('should reset component to default footer config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'footer');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      expect(parsedConfig.copyright).toBeDefined();
    });

    it('should reset component to default hero config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'hero');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      // Hero now uses container-based architecture like Navbar and Footer
      expect(parsedConfig.children).toBeDefined();
      expect(Array.isArray(parsedConfig.children)).toBe(true);
      expect(parsedConfig.children.length).toBeGreaterThan(0);
      // First child should be the main container
      expect(parsedConfig.children[0].id).toBe('hero-main-container');
      expect(parsedConfig.children[0].type).toBe('container');
      // The main container should have nested children (title, subtitle, buttons, etc.)
      expect(parsedConfig.children[0].config.children).toBeDefined();
      expect(parsedConfig.children[0].config.children.length).toBeGreaterThan(0);
      expect(parsedConfig.containerBackground).toBe('transparent');
      expect(parsedConfig.containerMinHeight).toBeDefined();
    });

    it('should reset component to default container config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'container');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      expect(parsedConfig.containerPadding).toBeDefined();
    });

    it('should reset component to default text config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'text');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      expect(parsedConfig.text).toBe('Enter your text here');
    });

    it('should reset component to default button config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'button');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      expect(parsedConfig.label).toBe('Click Here');
    });

    it('should reset component to default image config', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'image');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      // Actual defaults from componentDefaults.ts: src, alt, imageWidth, imageHeight
      expect(parsedConfig.imageWidth).toBe('100%');
      expect(parsedConfig.imageHeight).toBe('auto');
    });

    it('should use empty config for unknown component type', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'unknown_type');

      const bindCall = mockDb.bind.mock.calls[0];
      const parsedConfig = JSON.parse(bindCall[0] as string);
      expect(parsedConfig).toEqual({});
    });

    it('should delete existing component children', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'navbar');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM component_widgets WHERE component_id = ?'
      );
    });

    it('should throw error when database operation fails', async () => {
      mockDb.run.mockRejectedValue(new Error('Update failed'));

      await expect(
        resetBuiltInComponent(mockDb as unknown as D1Database, testSiteId, 1, 'navbar')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deprecated aliases', () => {
    it('getComponentWithWidgets is alias for getComponentWithChildren', () => {
      expect(getComponentWithWidgets).toBe(getComponentWithChildren);
    });

    it('saveComponentWithWidgets is alias for saveComponentWithChildren', () => {
      expect(saveComponentWithWidgets).toBe(saveComponentWithChildren);
    });
  });

  describe('resolveComponentRefs', () => {
    const testSiteId = 'test-site-id';

    it('should return components unchanged if no component_ref types', async () => {
      const components = [
        { type: 'hero', config: { title: 'Test' } },
        { type: 'text', config: { text: 'Hello' } }
      ];

      const result = await resolveComponentRefs(
        mockDb as unknown as D1Database,
        testSiteId,
        components
      );

      expect(result).toEqual(components);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should resolve component_ref to actual component type', async () => {
      const mockComponent: Component = {
        id: 1,
        site_id: testSiteId,
        name: 'Hero',
        type: 'hero',
        config: { title: 'Hero Title', subtitle: 'Subtitle' },
        is_global: true,
        is_primitive: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.first.mockResolvedValue(mockComponent);

      const components = [
        { type: 'component_ref', config: { componentId: 1 } },
        { type: 'text', config: { text: 'Hello' } }
      ];

      const result = await resolveComponentRefs(
        mockDb as unknown as D1Database,
        testSiteId,
        components
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('hero');
      expect(result[0].config).toEqual({ title: 'Hero Title', subtitle: 'Subtitle' });
      expect(result[1].type).toBe('text');
    });

    it('should preserve component_ref if referenced component not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const components = [{ type: 'component_ref', config: { componentId: 999 } }];

      const result = await resolveComponentRefs(
        mockDb as unknown as D1Database,
        testSiteId,
        components
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('component_ref');
      expect(result[0].config).toEqual({ componentId: 999 });
    });

    it('should merge config overrides from component_ref', async () => {
      const mockComponent: Component = {
        id: 1,
        site_id: testSiteId,
        name: 'Hero',
        type: 'hero',
        config: { title: 'Default Title', subtitle: 'Default Subtitle' },
        is_global: true,
        is_primitive: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockDb.first.mockResolvedValue(mockComponent);

      const components = [
        {
          type: 'component_ref',
          config: { componentId: 1, title: 'Override Title' }
        }
      ];

      const result = await resolveComponentRefs(
        mockDb as unknown as D1Database,
        testSiteId,
        components
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('hero');
      // Override should be applied
      expect(result[0].config.title).toBe('Override Title');
      // Original property should be preserved
      const mergedConfig = result[0].config as unknown as { title: string; subtitle: string };
      expect(mergedConfig.subtitle).toBe('Default Subtitle');
    });
  });
});
