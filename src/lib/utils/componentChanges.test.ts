import { describe, it, expect } from 'vitest';
import { applyComponentChanges } from './componentChanges';
import type { PageComponent } from '$lib/types/pages';

describe('applyComponentChanges', () => {
  const mockComponents: PageComponent[] = [
    {
      id: 'component-1',
      page_id: 'page-1',
      type: 'hero',
      position: 0,
      config: { heading: 'Original Hero' } as Record<string, unknown>,
      created_at: 1000,
      updated_at: 1000
    },
    {
      id: 'component-2',
      page_id: 'page-1',
      type: 'text',
      position: 1,
      config: { content: '<p>Text content</p>' } as Record<string, unknown>,
      created_at: 1000,
      updated_at: 1000
    }
  ];

  // Mock components with nested children (container with child widgets)
  const mockComponentsWithChildren: PageComponent[] = [
    {
      id: 'container-1',
      page_id: 'page-1',
      type: 'container',
      position: 0,
      config: {
        padding: 16,
        children: [
          {
            id: 'cart-btn',
            page_id: 'page-1',
            type: 'button',
            position: 0,
            config: { label: 'Cart', url: '/cart' },
            created_at: 1000,
            updated_at: 1000
          },
          {
            id: 'login-btn',
            page_id: 'page-1',
            type: 'button',
            position: 1,
            config: { label: 'Login', url: '/login' },
            created_at: 1000,
            updated_at: 1000
          }
        ]
      } as Record<string, unknown>,
      created_at: 1000,
      updated_at: 1000
    }
  ];

  describe('add action', () => {
    it('should add a new component at the end', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'add',
          components: [
            {
              id: 'temp-123',
              page_id: 'page-1',
              type: 'image',
              position: 2,
              config: { src: '/image.jpg' } as Record<string, unknown>,
              created_at: 1000,
              updated_at: 1000
            }
          ]
        }
      });

      expect(result).toHaveLength(3);
      expect(result[2].type).toBe('image');
      expect(result[2].position).toBe(2);
    });

    it('should add a new component at specific position', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'add',
          components: [
            {
              id: 'temp-456',
              page_id: 'page-1',
              type: 'button',
              position: 0,
              config: { text: 'Click Me', url: '#' } as Record<string, unknown>,
              created_at: 1000,
              updated_at: 1000
            }
          ],
          position: 1
        }
      });

      expect(result).toHaveLength(3);
      expect(result[1].type).toBe('button');
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(2);
    });

    it('should generate ID for components without ID', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'add',
          components: [
            {
              type: 'hero',
              config: { heading: 'New Hero' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(3);
      expect(result[2].id).toMatch(/^temp-/);
    });

    it('should populate missing fields with defaults', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'add',
          components: [
            {
              type: 'text',
              config: { content: '<p>New text</p>' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const newWidget = result[2];
      expect(newWidget.id).toBeDefined();
      expect(newWidget.page_id).toBe('page-1');
      expect(newWidget.created_at).toBeDefined();
      expect(newWidget.updated_at).toBeDefined();
    });
  });

  describe('remove action', () => {
    it('should remove components by ID', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'remove',
          componentIds: ['component-1']
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('component-2');
      expect(result[0].position).toBe(0);
    });

    it('should remove multiple components', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'remove',
          componentIds: ['component-1', 'component-2']
        }
      });

      expect(result).toHaveLength(0);
    });

    it('should reindex positions after removal', () => {
      const components: PageComponent[] = [
        { ...mockComponents[0], position: 0 },
        { ...mockComponents[1], position: 1 },
        {
          id: 'component-3',
          page_id: 'page-1',
          type: 'image',
          position: 2,
          config: {},
          created_at: 1000,
          updated_at: 1000
        }
      ];

      const result = applyComponentChanges(components, {
        type: 'component_changes',
        changes: {
          action: 'remove',
          componentIds: ['component-2']
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
    });
  });

  describe('update action', () => {
    it('should update component config', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'update',
          components: [
            {
              id: 'component-1',
              config: { heading: 'Updated Hero' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const config = result[0].config as Record<string, unknown>;
      expect(config.heading).toBe('Updated Hero');
    });

    it('should merge config instead of replacing', () => {
      const components: PageComponent[] = [
        {
          id: 'component-1',
          page_id: 'page-1',
          type: 'hero',
          position: 0,
          config: { heading: 'Hero', subheading: 'Subtitle', ctaText: 'Click' } as Record<
            string,
            unknown
          >,
          created_at: 1000,
          updated_at: 1000
        }
      ];

      const result = applyComponentChanges(components, {
        type: 'component_changes',
        changes: {
          action: 'update',
          components: [
            {
              id: 'component-1',
              config: { heading: 'New Heading' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const config = result[0].config as Record<string, unknown>;
      expect(config).toEqual({
        heading: 'New Heading',
        subheading: 'Subtitle',
        ctaText: 'Click'
      });
    });

    it('should update multiple components', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'update',
          components: [
            {
              id: 'component-1',
              config: { heading: 'New Hero' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent,
            {
              id: 'component-2',
              config: { content: '<p>New content</p>' } as Record<string, unknown>
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const config0 = result[0].config as Record<string, unknown>;
      const config1 = result[1].config as Record<string, unknown>;
      expect(config0.heading).toBe('New Hero');
      expect(config1.content).toBe('<p>New content</p>');
    });
  });

  describe('reorder action', () => {
    it('should reorder components', () => {
      const result = applyComponentChanges(mockComponents, {
        type: 'component_changes',
        changes: {
          action: 'reorder',
          components: [
            { id: 'component-2' } as Partial<PageComponent> as PageComponent,
            { id: 'component-1' } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('component-2');
      expect(result[0].position).toBe(0);
      expect(result[1].id).toBe('component-1');
      expect(result[1].position).toBe(1);
    });
  });

  describe('add with parentId (nested widget placement)', () => {
    it('should add a widget to a parent container at the end', () => {
      const result = applyComponentChanges(mockComponentsWithChildren, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'container-1',
          components: [
            {
              id: 'theme-toggle',
              type: 'theme_toggle',
              config: { showLabel: false }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(1);
      const container = result[0];
      const children = container.config.children as PageComponent[];
      expect(children).toHaveLength(3);
      expect(children[2].id).toBe('theme-toggle');
      expect(children[2].type).toBe('theme_toggle');
      expect(children[2].position).toBe(2);
    });

    it('should add a widget after a specific target widget using targetId', () => {
      const result = applyComponentChanges(mockComponentsWithChildren, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'container-1',
          targetId: 'cart-btn',
          components: [
            {
              id: 'theme-toggle',
              type: 'theme_toggle',
              config: { showLabel: false }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(1);
      const container = result[0];
      const children = container.config.children as PageComponent[];
      expect(children).toHaveLength(3);
      // Should be inserted after cart-btn (position 0), so at index 1
      expect(children[0].id).toBe('cart-btn');
      expect(children[1].id).toBe('theme-toggle');
      expect(children[2].id).toBe('login-btn');
      // Positions should be reindexed
      expect(children[0].position).toBe(0);
      expect(children[1].position).toBe(1);
      expect(children[2].position).toBe(2);
    });

    it('should add a widget at the beginning when targetId does not exist', () => {
      const result = applyComponentChanges(mockComponentsWithChildren, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'container-1',
          targetId: 'non-existent',
          components: [
            {
              id: 'new-widget',
              type: 'button',
              config: { label: 'New' }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const container = result[0];
      const children = container.config.children as PageComponent[];
      expect(children).toHaveLength(3);
      // When targetId not found, add at the end
      expect(children[2].id).toBe('new-widget');
    });

    it('should handle deeply nested containers', () => {
      const deeplyNested: PageComponent[] = [
        {
          id: 'outer-container',
          page_id: 'page-1',
          type: 'container',
          position: 0,
          config: {
            children: [
              {
                id: 'inner-container',
                page_id: 'page-1',
                type: 'container',
                position: 0,
                config: {
                  children: [
                    {
                      id: 'deep-btn',
                      page_id: 'page-1',
                      type: 'button',
                      position: 0,
                      config: { label: 'Deep' },
                      created_at: 1000,
                      updated_at: 1000
                    }
                  ]
                },
                created_at: 1000,
                updated_at: 1000
              }
            ]
          } as Record<string, unknown>,
          created_at: 1000,
          updated_at: 1000
        }
      ];

      const result = applyComponentChanges(deeplyNested, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'inner-container',
          targetId: 'deep-btn',
          components: [
            {
              id: 'new-deep-widget',
              type: 'text',
              config: { content: 'New deep widget' }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const outer = result[0];
      const outerChildren = outer.config.children as PageComponent[];
      const inner = outerChildren[0];
      const innerChildren = inner.config.children as PageComponent[];

      expect(innerChildren).toHaveLength(2);
      expect(innerChildren[0].id).toBe('deep-btn');
      expect(innerChildren[1].id).toBe('new-deep-widget');
    });

    it('should set parent_id on newly added widgets', () => {
      const result = applyComponentChanges(mockComponentsWithChildren, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'container-1',
          components: [
            {
              id: 'new-widget',
              type: 'button',
              config: { label: 'New' }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const container = result[0];
      const children = container.config.children as PageComponent[];
      const newWidget = children.find((c) => c.id === 'new-widget');

      expect(newWidget).toBeDefined();
      expect(newWidget?.parent_id).toBe('container-1');
    });

    it('should generate ID for widgets added to parent without ID', () => {
      const result = applyComponentChanges(mockComponentsWithChildren, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'container-1',
          components: [
            {
              type: 'theme_toggle',
              config: { showLabel: false }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      const container = result[0];
      const children = container.config.children as PageComponent[];
      expect(children[2].id).toMatch(/^temp-/);
    });
  });

  describe('add with parentId (flat structure)', () => {
    // Flat structure: all components in a flat array with parent_id references
    // This is how the builder stores components
    const flatStructure: PageComponent[] = [
      {
        id: 'nav-links-container',
        page_id: 'component-1',
        type: 'container',
        position: 0,
        parent_id: undefined,
        config: { containerGap: { desktop: 16, tablet: 12, mobile: 8 } } as Record<string, unknown>,
        created_at: 1000,
        updated_at: 1000
      },
      {
        id: 'shop-btn',
        page_id: 'component-1',
        type: 'button',
        position: 0,
        parent_id: 'nav-links-container',
        config: { label: 'Shop' },
        created_at: 1000,
        updated_at: 1000
      },
      {
        id: 'cart-button',
        page_id: 'component-1',
        type: 'button',
        position: 1,
        parent_id: 'nav-links-container',
        config: { label: 'Cart' },
        created_at: 1000,
        updated_at: 1000
      }
    ];

    it('should add a widget to flat structure at the end of parent', () => {
      const result = applyComponentChanges(flatStructure, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'nav-links-container',
          components: [
            {
              id: 'theme-toggle',
              type: 'theme_toggle',
              config: { showLabel: false }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      // Should have 4 components (original 3 + new one)
      expect(result).toHaveLength(4);

      // Find the new theme toggle
      const themeToggle = result.find((c) => c.id === 'theme-toggle');
      expect(themeToggle).toBeDefined();
      expect(themeToggle?.parent_id).toBe('nav-links-container');
      expect(themeToggle?.position).toBe(2); // After cart-button (position 1)
    });

    it('should add a widget after a specific target in flat structure', () => {
      const result = applyComponentChanges(flatStructure, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'nav-links-container',
          targetId: 'cart-button',
          components: [
            {
              id: 'theme-toggle',
              type: 'theme_toggle',
              config: { showLabel: false }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(4);

      // Find the new theme toggle
      const themeToggle = result.find((c) => c.id === 'theme-toggle');
      expect(themeToggle).toBeDefined();
      expect(themeToggle?.parent_id).toBe('nav-links-container');
      expect(themeToggle?.position).toBe(2); // After cart-button (position 1)
    });

    it('should insert widget in the middle of siblings in flat structure', () => {
      const result = applyComponentChanges(flatStructure, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'nav-links-container',
          targetId: 'shop-btn',
          components: [
            {
              id: 'pricing-btn',
              type: 'button',
              config: { label: 'Pricing' }
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      expect(result).toHaveLength(4);

      // Find all children of nav-links-container
      const children = result.filter((c) => c.parent_id === 'nav-links-container');
      expect(children).toHaveLength(3);

      // Sort by position
      children.sort((a, b) => a.position - b.position);

      expect(children[0].id).toBe('shop-btn');
      expect(children[0].position).toBe(0);
      expect(children[1].id).toBe('pricing-btn');
      expect(children[1].position).toBe(1);
      expect(children[2].id).toBe('cart-button');
      expect(children[2].position).toBe(2);
    });

    it('should preserve other components when adding to flat structure', () => {
      const result = applyComponentChanges(flatStructure, {
        type: 'component_changes',
        changes: {
          action: 'add',
          parentId: 'nav-links-container',
          components: [
            {
              id: 'new-widget',
              type: 'theme_toggle',
              config: {}
            } as Partial<PageComponent> as PageComponent
          ]
        }
      });

      // Original container should still exist
      const container = result.find((c) => c.id === 'nav-links-container');
      expect(container).toBeDefined();
      expect(container?.parent_id).toBeUndefined();
    });
  });
});
