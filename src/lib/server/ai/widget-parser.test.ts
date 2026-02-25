import { describe, it, expect } from 'vitest';
import {
  parseWidgetChanges,
  applyWidgetChanges,
  generateWidgetId,
  createDefaultWidget,
  type WidgetChange
} from './widget-parser';
import type { PageWidget } from '$lib/types/pages';

describe('widget-parser', () => {
  describe('parseWidgetChanges', () => {
    it('should parse JSON block with widget_changes type', () => {
      const response = `
Here are the changes:
\`\`\`json
{
  "type": "widget_changes",
  "changes": {
    "action": "add",
    "widgets": [{"id": "test-1", "type": "text"}]
  }
}
\`\`\`
Done!
      `;

      const result = parseWidgetChanges(response);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('widget_changes');
      expect(result?.changes.action).toBe('add');
    });

    it('should parse direct JSON response', () => {
      const response = JSON.stringify({
        type: 'widget_changes',
        changes: {
          action: 'remove',
          widgetIds: ['widget-1', 'widget-2']
        }
      });

      const result = parseWidgetChanges(response);
      expect(result).not.toBeNull();
      expect(result?.changes.action).toBe('remove');
    });

    it('should return null for non-widget_changes type', () => {
      const response = `
\`\`\`json
{"type": "other_type", "data": {}}
\`\`\`
      `;

      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const response = 'This is not JSON at all';

      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null for malformed JSON in code block', () => {
      const response = `
\`\`\`json
{invalid json here}
\`\`\`
      `;

      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null for missing changes object', () => {
      const response = JSON.stringify({
        type: 'widget_changes'
      });

      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null for invalid action', () => {
      const response = JSON.stringify({
        type: 'widget_changes',
        changes: {
          action: 'invalid_action'
        }
      });

      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should parse update action', () => {
      const response = JSON.stringify({
        type: 'widget_changes',
        changes: {
          action: 'update',
          widgets: [{ id: 'widget-1', config: { title: 'Updated' } }]
        }
      });

      const result = parseWidgetChanges(response);
      expect(result?.changes.action).toBe('update');
    });

    it('should parse reorder action', () => {
      const response = JSON.stringify({
        type: 'widget_changes',
        changes: {
          action: 'reorder',
          widgets: [{ id: 'w3' }, { id: 'w1' }, { id: 'w2' }]
        }
      });

      const result = parseWidgetChanges(response);
      expect(result?.changes.action).toBe('reorder');
    });

    it('should parse parentId and targetId for nested widget placement', () => {
      const response = `
Here's the theme toggle:
\`\`\`json
{
  "type": "widget_changes",
  "changes": {
    "action": "add",
    "parentId": "nav-links-container",
    "targetId": "cart-button",
    "widgets": [{"id": "theme-toggle", "type": "theme_toggle"}]
  }
}
\`\`\`
Done!
      `;

      const result = parseWidgetChanges(response);
      expect(result).not.toBeNull();
      expect(result?.changes.action).toBe('add');
      expect(result?.changes.parentId).toBe('nav-links-container');
      expect(result?.changes.targetId).toBe('cart-button');
      expect(result?.changes.widgets?.[0].id).toBe('theme-toggle');
    });
  });

  describe('applyWidgetChanges', () => {
    const createTestWidget = (id: string, position: number): PageWidget => ({
      id,
      page_id: 'page-1',
      type: 'text',
      position,
      config: { text: `Widget ${id}` },
      created_at: Date.now(),
      updated_at: Date.now()
    });

    describe('add action', () => {
      it('should add widgets at the end', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: [
              {
                id: 'w3',
                type: 'hero',
                config: { title: 'New Hero' }
              } as PageWidget
            ]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(3);
        expect(result[2].type).toBe('hero');
        expect(result[2].position).toBe(2);
      });

      it('should add widgets at specific position', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: [{ id: 'temp-w3', type: 'text' } as PageWidget],
            position: 1
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(3);
        expect(result[1].id).toBe('temp-w3');
        expect(result[0].position).toBe(0);
        expect(result[1].position).toBe(1);
        expect(result[2].position).toBe(2);
      });

      it('should add widgets at position 0', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: [{ id: 'temp-new', type: 'hero' } as PageWidget],
            position: 0
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('temp-new');
      });

      it('should handle empty widgets array', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: []
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(1);
      });

      it('should generate ID for widgets without ID', () => {
        const current: PageWidget[] = [];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: [{ type: 'text', config: {} } as PageWidget]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].id).toMatch(/^temp-/);
      });

      it('should preserve page_id from existing widgets', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'add',
            widgets: [{ id: 'w2', type: 'text' } as PageWidget]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[1].page_id).toBe('page-1');
      });
    });

    describe('remove action', () => {
      it('should remove widgets by ID', () => {
        const current = [
          createTestWidget('w1', 0),
          createTestWidget('w2', 1),
          createTestWidget('w3', 2)
        ];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'remove',
            widgetIds: ['w2']
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(2);
        expect(result.find((w) => w.id === 'w2')).toBeUndefined();
      });

      it('should remove multiple widgets', () => {
        const current = [
          createTestWidget('w1', 0),
          createTestWidget('w2', 1),
          createTestWidget('w3', 2)
        ];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'remove',
            widgetIds: ['w1', 'w3']
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('w2');
        expect(result[0].position).toBe(0);
      });

      it('should reindex positions after removal', () => {
        const current = [
          createTestWidget('w1', 0),
          createTestWidget('w2', 1),
          createTestWidget('w3', 2)
        ];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'remove',
            widgetIds: ['w1']
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].position).toBe(0);
        expect(result[1].position).toBe(1);
      });

      it('should handle empty widgetIds array', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'remove',
            widgetIds: []
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(1);
      });

      it('should handle non-existent widget IDs', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'remove',
            widgetIds: ['non-existent']
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(1);
      });
    });

    describe('update action', () => {
      it('should update widget config', () => {
        const current = [createTestWidget('w1', 0)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'update',
            widgets: [
              {
                id: 'w1',
                config: { text: 'Updated content' }
              } as PageWidget
            ]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].config.text).toBe('Updated content');
      });

      it('should merge config objects', () => {
        const current: PageWidget[] = [
          {
            id: 'w1',
            page_id: 'page-1',
            type: 'hero',
            position: 0,
            config: { title: 'Original', subtitle: 'Keep this' },
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'update',
            widgets: [
              {
                id: 'w1',
                config: { title: 'Updated' }
              } as PageWidget
            ]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].config.title).toBe('Updated');
        expect(result[0].config.subtitle).toBe('Keep this');
      });

      it('should not modify widgets not in update list', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'update',
            widgets: [
              {
                id: 'w1',
                config: { text: 'Updated' }
              } as PageWidget
            ]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[1].config.text).toBe('Widget w2');
      });

      it('should preserve positions during update', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'update',
            widgets: [
              {
                id: 'w1',
                config: { text: 'Updated' }
              } as PageWidget
            ]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].position).toBe(0);
        expect(result[1].position).toBe(1);
      });
    });

    describe('reorder action', () => {
      it('should reorder widgets based on provided array', () => {
        const current = [
          createTestWidget('w1', 0),
          createTestWidget('w2', 1),
          createTestWidget('w3', 2)
        ];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'reorder',
            widgets: [{ id: 'w3' }, { id: 'w1' }, { id: 'w2' }] as PageWidget[]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].id).toBe('w3');
        expect(result[1].id).toBe('w1');
        expect(result[2].id).toBe('w2');
      });

      it('should update positions after reorder', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'reorder',
            widgets: [{ id: 'w2' }, { id: 'w1' }] as PageWidget[]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result[0].position).toBe(0);
        expect(result[1].position).toBe(1);
      });

      it('should filter out non-existent widget IDs', () => {
        const current = [createTestWidget('w1', 0), createTestWidget('w2', 1)];

        const change: WidgetChange = {
          type: 'widget_changes',
          changes: {
            action: 'reorder',
            widgets: [{ id: 'w1' }, { id: 'non-existent' }, { id: 'w2' }] as PageWidget[]
          }
        };

        const result = applyWidgetChanges(current, change);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('w1');
        expect(result[1].id).toBe('w2');
      });
    });

    describe('unknown action', () => {
      it('should return current widgets for unknown action', () => {
        const current = [createTestWidget('w1', 0)];

        const change = {
          type: 'widget_changes',
          changes: {
            action: 'unknown' as 'add'
          }
        } as WidgetChange;

        const result = applyWidgetChanges(current, change);
        expect(result).toEqual(current);
      });
    });
  });

  describe('generateWidgetId', () => {
    it('should generate ID starting with temp-', () => {
      const id = generateWidgetId();
      expect(id).toMatch(/^temp-/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateWidgetId();
      const id2 = generateWidgetId();
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp and random string', () => {
      const id = generateWidgetId();
      const parts = id.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('temp');
      expect(Number(parts[1])).toBeGreaterThan(0);
    });
  });

  describe('createDefaultWidget', () => {
    it('should create hero widget with default config', () => {
      const widget = createDefaultWidget('hero', 0, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('hero');
      expect(widget.position).toBe(0);
      expect(widget.page_id).toBe('page-1');
      expect(widget.id).toMatch(/^temp-/);
      expect(config.heading).toBe('Welcome');
      expect(config.subheading).toBe('Your subtitle here');
    });

    it('should create text widget with default config', () => {
      const widget = createDefaultWidget('text', 1, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('text');
      expect(config.content).toBe('<p>Your text content here</p>');
    });

    it('should create image widget with default config', () => {
      const widget = createDefaultWidget('image', 0, 'page-1');

      expect(widget.type).toBe('image');
      expect(widget.config.alt).toBe('Image description');
    });

    it('should create button widget with default config', () => {
      const widget = createDefaultWidget('button', 0, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('button');
      expect(widget.config.text).toBe('Click Me');
      expect(config.variant).toBe('primary');
    });

    it('should create navbar widget with default config', () => {
      const widget = createDefaultWidget('navbar', 0, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('navbar');
      expect(config.brand).toBe('Brand');
      expect(config.links).toHaveLength(2);
    });

    it('should create container widget with default config', () => {
      const widget = createDefaultWidget('container', 0, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('container');
      expect(config.children).toEqual([]);
      expect(config.padding).toEqual({ desktop: 32, tablet: 24, mobile: 16 });
    });

    it('should create single_product widget with default config', () => {
      const widget = createDefaultWidget('single_product', 0, 'page-1');

      expect(widget.type).toBe('single_product');
      expect(widget.config.productId).toBeNull();
    });

    it('should create product_list widget with default config', () => {
      const widget = createDefaultWidget('product_list', 0, 'page-1');
      const config = widget.config as Record<string, unknown>;

      expect(widget.type).toBe('product_list');
      expect(config.products).toEqual([]);
      expect(widget.config.columns).toEqual({ desktop: 3, tablet: 2, mobile: 1 });
    });

    it('should create unknown type with empty config', () => {
      const widget = createDefaultWidget('unknown_type' as PageWidget['type'], 0, 'page-1');

      expect(widget.type).toBe('unknown_type');
      expect(widget.config).toEqual({});
    });

    it('should set timestamps', () => {
      const before = Date.now();
      const widget = createDefaultWidget('text', 0, 'page-1');
      const after = Date.now();

      expect(widget.created_at).toBeGreaterThanOrEqual(before);
      expect(widget.created_at).toBeLessThanOrEqual(after);
      expect(widget.updated_at).toBe(widget.created_at);
    });
  });

  describe('parseWidgetChanges edge cases', () => {
    it('should return null for raw JSON where type is not widget_changes', () => {
      const response = JSON.stringify({ type: 'other_type', data: {} });
      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null when changes is null', () => {
      const response = JSON.stringify({ type: 'widget_changes', changes: null });
      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null when changes is not an object', () => {
      const response = JSON.stringify({ type: 'widget_changes', changes: 'invalid' });
      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null when action is invalid', () => {
      const response = JSON.stringify({
        type: 'widget_changes',
        changes: { action: 'invalid_action' }
      });
      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });

    it('should return null for JSON in code block with non-widget_changes type', () => {
      const response = '```json\n{"type": "something_else", "data": {}}\n```';
      const result = parseWidgetChanges(response);
      expect(result).toBeNull();
    });
  });

  describe('applyWidgetChanges edge cases', () => {
    it('should return current widgets for unknown action', () => {
      const widgets = [
        {
          id: 'w1',
          type: 'text' as PageWidget['type'],
          position: 0,
          page_id: 'p1',
          config: {},
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];
      const change: WidgetChange = {
        type: 'widget_changes',
        changes: { action: 'unknown' as 'add' }
      };
      const result = applyWidgetChanges(widgets, change);
      expect(result).toEqual(widgets);
    });
  });

  describe('validateWidgetChange edge cases', () => {
    it('should return null for non-object data (string)', () => {
      const result = parseWidgetChanges('"just a string"');
      expect(result).toBeNull();
    });

    it('should return null for null data', () => {
      const result = parseWidgetChanges('null');
      expect(result).toBeNull();
    });

    it('should return null for data with wrong type field', () => {
      const result = parseWidgetChanges(
        JSON.stringify({ type: 'not_widget_changes', changes: { action: 'add' } })
      );
      expect(result).toBeNull();
    });

    it('should return null when changes is not an object', () => {
      const result = parseWidgetChanges(
        JSON.stringify({ type: 'widget_changes', changes: 'not-object' })
      );
      expect(result).toBeNull();
    });

    it('should return null when changes is null', () => {
      const result = parseWidgetChanges(JSON.stringify({ type: 'widget_changes', changes: null }));
      expect(result).toBeNull();
    });
  });
});
