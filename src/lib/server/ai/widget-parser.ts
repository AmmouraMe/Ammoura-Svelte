/**
 * Widget Changes Parser
 * Parses AI responses for widget manipulation commands (add, remove, update, reorder)
 */

import type { PageWidget } from '$lib/types/pages';

export interface WidgetChange {
  type: 'widget_changes';
  changes: {
    action: 'add' | 'remove' | 'update' | 'reorder';
    widgets?: PageWidget[];
    widgetIds?: string[];
    parentId?: string; // Parent container ID for nested widget additions
    targetId?: string; // ID of the widget to insert after (within parent)
    position?: number;
  };
}

/**
 * Parse AI response for widget change commands
 */
export function parseWidgetChanges(aiResponse: string): WidgetChange | null {
  try {
    // Look for JSON blocks in the response
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try to parse the entire response as JSON
      const parsed = JSON.parse(aiResponse.trim());
      if (parsed.type === 'widget_changes') {
        return validateWidgetChange(parsed);
      }
      return null;
    }

    const jsonStr = jsonMatch[1];
    const parsed = JSON.parse(jsonStr);

    if (parsed.type === 'widget_changes') {
      return validateWidgetChange(parsed);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse widget changes:', error);
    return null;
  }
}

/**
 * Validate widget change structure
 */
function validateWidgetChange(data: unknown): WidgetChange | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'widget_changes') {
    return null;
  }

  const changes = obj.changes as Record<string, unknown>;
  if (!changes || typeof changes !== 'object') {
    return null;
  }

  const action = changes.action as string;
  if (!['add', 'remove', 'update', 'reorder'].includes(action)) {
    return null;
  }

  return data as WidgetChange;
}

/**
 * Apply widget changes to widget array
 */
export function applyWidgetChanges(
  currentWidgets: PageWidget[],
  change: WidgetChange
): PageWidget[] {
  const { action, widgets, widgetIds, position } = change.changes;

  switch (action) {
    case 'add':
      return handleAddWidgets(currentWidgets, widgets || [], position);
    case 'remove':
      return handleRemoveWidgets(currentWidgets, widgetIds || []);
    case 'update':
      return handleUpdateWidgets(currentWidgets, widgets || []);
    case 'reorder':
      return handleReorderWidgets(currentWidgets, widgets || []);
    default:
      return currentWidgets;
  }
}

/**
 * Add new widgets to the array
 */
function handleAddWidgets(
  current: PageWidget[],
  newWidgets: PageWidget[],
  position?: number
): PageWidget[] {
  const result = [...current];
  const now = Date.now();

  // Ensure new widgets have all required fields
  const processedWidgets = newWidgets.map((widget) => {
    // Generate ID if not present or if it doesn't start with 'temp-'
    const id =
      widget.id && (widget.id.startsWith('temp-') || widget.id.match(/^[0-9]+$/))
        ? widget.id
        : generateWidgetId();

    // Get page_id from existing widgets or use empty string (will be set on save)
    const pageId = widget.page_id || current[0]?.page_id || '';

    return {
      ...widget,
      id,
      page_id: pageId,
      created_at: widget.created_at || now,
      updated_at: widget.updated_at || now,
      position: widget.position ?? 0 // Will be reindexed below
    } as PageWidget;
  });

  if (position !== undefined && position >= 0 && position <= result.length) {
    // Insert at specific position
    result.splice(position, 0, ...processedWidgets);
  } else {
    // Add at the end
    result.push(...processedWidgets);
  }

  // Reindex positions
  return result.map((w, idx) => ({ ...w, position: idx }));
}

/**
 * Remove widgets by ID
 */
function handleRemoveWidgets(current: PageWidget[], widgetIds: string[]): PageWidget[] {
  const result = current.filter((w) => !widgetIds.includes(w.id));
  // Reindex positions
  return result.map((w, idx) => ({ ...w, position: idx }));
}

/**
 * Update existing widgets
 */
function handleUpdateWidgets(current: PageWidget[], updates: PageWidget[]): PageWidget[] {
  const updateMap = new Map(updates.map((w) => [w.id, w]));

  return current.map((w) => {
    const update = updateMap.get(w.id);
    if (update) {
      return {
        ...w,
        ...update,
        config: { ...w.config, ...update.config }
      };
    }
    return w;
  });
}

/**
 * Reorder widgets based on provided array
 */
function handleReorderWidgets(current: PageWidget[], orderedWidgets: PageWidget[]): PageWidget[] {
  // Create a map of widgets by ID for quick lookup
  const widgetMap = new Map(current.map((w) => [w.id, w]));

  // Build new array with provided order
  const result = orderedWidgets
    .map((w) => widgetMap.get(w.id))
    .filter((w): w is PageWidget => w !== undefined);

  // Reindex positions
  return result.map((w, idx) => ({ ...w, position: idx }));
}

/**
 * Generate a unique temporary ID for new widgets
 */
export function generateWidgetId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default widget of a given type
 */
export function createDefaultWidget(
  type: PageWidget['type'],
  position: number,
  pageId: string
): PageWidget {
  const id = generateWidgetId();
  const now = Date.now();

  const baseWidget: PageWidget = {
    id,
    page_id: pageId,
    type,
    position,
    config: {} as Record<string, unknown>,
    created_at: now,
    updated_at: now
  };

  // Set default configs based on type (using Record<string, unknown> to avoid type errors)
  const configs: Record<string, Record<string, unknown>> = {
    hero: {
      heading: 'Welcome',
      subheading: 'Your subtitle here',
      ctaText: 'Get Started',
      ctaLink: '#',
      backgroundImage: '',
      alignment: 'center'
    },
    text: {
      content: '<p>Your text content here</p>'
    },
    image: {
      src: '',
      alt: 'Image description',
      caption: ''
    },
    single_product: {
      productId: null
    },
    product_list: {
      products: [],
      columns: { desktop: 3, tablet: 2, mobile: 1 },
      layout: 'card'
    },
    button: {
      text: 'Click Me',
      url: '#',
      variant: 'primary'
    },
    navbar: {
      brand: 'Brand',
      links: [
        { text: 'Home', url: '/' },
        { text: 'Shop', url: '/products' }
      ]
    },
    container: {
      padding: { desktop: 32, tablet: 24, mobile: 16 },
      backgroundColor: 'transparent',
      children: []
    }
  };

  baseWidget.config = (configs[type] || {}) as PageWidget['config'];

  return baseWidget;
}
