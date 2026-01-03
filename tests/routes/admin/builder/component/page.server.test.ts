import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('$lib/server/db/color-themes', () => ({
  getAllColorThemes: vi.fn().mockResolvedValue([])
}));

vi.mock('$lib/server/db/components', () => ({
  getComponentsWithChildrenCount: vi.fn().mockResolvedValue([]),
  getComponentWithWidgets: vi.fn()
}));

import { load } from '../../../../../src/routes/admin/builder/component/[[id]]/+page.server';
import { getComponentWithWidgets } from '$lib/server/db/components';

describe('Component Builder Page Load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New Component (no id)', () => {
    it('should return empty state for new component creation', async () => {
      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      };

      const mockPlatform = {
        env: {
          DB: {}
        }
      };

      const result = await load({
        params: {},
        locals: mockLocals,
        platform: mockPlatform
      } as unknown as Parameters<typeof load>[0]);

      // Type assertion since we know load returns data in this case
      const data = result as {
        component: unknown;
        widgets: unknown[];
        isNewComponent: boolean;
        userName: string;
      };
      expect(data.component).toBeNull();
      expect(data.widgets).toEqual([]);
      expect(data.isNewComponent).toBe(true);
      expect(data.userName).toBe('Test User');
    });
  });

  describe('Existing Component', () => {
    it('should load component with inline config.children', async () => {
      const mockComponent = {
        id: 1,
        site_id: 'test-site-id',
        name: 'Test Hero',
        type: 'hero',
        config: {
          containerBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          children: [
            {
              id: 'hero-main-container',
              type: 'container',
              position: 0,
              config: {
                containerBackground: 'transparent',
                children: [
                  {
                    id: 'hero-title',
                    type: 'text',
                    position: 0,
                    config: {
                      text: 'Welcome',
                      textColor: '#ffffff'
                    }
                  }
                ]
              }
            }
          ]
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        widgets: []
      };

      vi.mocked(getComponentWithWidgets).mockResolvedValue(mockComponent as never);

      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      };

      const mockPlatform = {
        env: {
          DB: {}
        }
      };

      const result = await load({
        params: { id: '1' },
        locals: mockLocals,
        platform: mockPlatform
      } as unknown as Parameters<typeof load>[0]);

      // Type assertion since we know load returns data in this case
      const data = result as {
        component: unknown;
        isNewComponent: boolean;
        widgets: Array<{ id: string; parent_id?: string }>;
      };
      expect(data.component).toEqual(mockComponent);
      expect(data.isNewComponent).toBe(false);
      // Widgets should be flattened from config.children
      expect(data.widgets.length).toBe(2); // hero-main-container + hero-title
      expect(data.widgets[0].id).toBe('hero-main-container');
      expect(data.widgets[1].id).toBe('hero-title');
      expect(data.widgets[1].parent_id).toBe('hero-main-container');
    });

    it('should fallback to component_widgets table when no config.children', async () => {
      const mockComponent = {
        id: 1,
        site_id: 'test-site-id',
        name: 'Test Component',
        type: 'text',
        config: {
          text: 'Hello'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        widgets: [
          {
            id: 'widget-1',
            type: 'text',
            position: 0,
            config: { text: 'Widget Text' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            parent_id: undefined
          }
        ]
      };

      vi.mocked(getComponentWithWidgets).mockResolvedValue(mockComponent as never);

      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: null
      };

      const mockPlatform = {
        env: {
          DB: {}
        }
      };

      const result = await load({
        params: { id: '1' },
        locals: mockLocals,
        platform: mockPlatform
      } as unknown as Parameters<typeof load>[0]);

      // Type assertion since we know load returns data in this case
      const data = result as { widgets: Array<{ id: string }> };
      expect(data.widgets.length).toBe(1);
      expect(data.widgets[0].id).toBe('widget-1');
    });

    it('should create single widget from component config for legacy format', async () => {
      const mockComponent = {
        id: 1,
        site_id: 'test-site-id',
        name: 'Legacy Component',
        type: 'text',
        config: {
          text: 'Legacy text',
          alignment: 'center'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        widgets: []
      };

      vi.mocked(getComponentWithWidgets).mockResolvedValue(mockComponent as never);

      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: null
      };

      const mockPlatform = {
        env: {
          DB: {}
        }
      };

      const result = await load({
        params: { id: '1' },
        locals: mockLocals,
        platform: mockPlatform
      } as unknown as Parameters<typeof load>[0]);

      // Type assertion since we know load returns data in this case
      const data = result as { widgets: Array<{ id: string; type: string; config: unknown }> };
      expect(data.widgets.length).toBe(1);
      expect(data.widgets[0].id).toBe('component-1');
      expect(data.widgets[0].type).toBe('text');
      expect(data.widgets[0].config).toEqual({ text: 'Legacy text', alignment: 'center' });
    });
  });

  describe('Error Handling', () => {
    it('should throw 404 when component not found', async () => {
      vi.mocked(getComponentWithWidgets).mockResolvedValue(null);

      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: null
      };

      const mockPlatform = {
        env: {
          DB: {}
        }
      };

      await expect(
        load({
          params: { id: '999' },
          locals: mockLocals,
          platform: mockPlatform
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow();
    });

    it('should throw 500 when database not available', async () => {
      const mockLocals = {
        siteId: 'test-site-id',
        currentUser: null
      };

      await expect(
        load({
          params: { id: '1' },
          locals: mockLocals,
          platform: undefined
        } as unknown as Parameters<typeof load>[0])
      ).rejects.toThrow();
    });
  });
});
