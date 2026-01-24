/**
 * Database operations for components (reusable components)
 */

import type { Component, ComponentWithWidgets, ComponentType } from '$lib/types/pages';
import { getComponentChildren, saveComponentChildren } from './componentChildren';
import { getDefaultConfig } from '$lib/utils/editor/componentDefaults';
import {
  createComponentRevision,
  publishComponentRevision,
  getCurrentComponentRevision
} from './component-revisions';

// Re-export deprecated aliases for backward compatibility
export { getComponentWidgets, saveComponentWidgets } from './componentChildren';

/**
 * Type alias for backward compatibility
 * @deprecated Use ComponentWithChildren instead
 */
export type ComponentWithWidgetsAlias = ComponentWithWidgets;

/**
 * Type alias for components with their child composition
 */
export type ComponentWithChildren = ComponentWithWidgets;

/**
 * Component with children count for sidebar display
 */
export interface ComponentWithChildrenCount extends Component {
  children_count: number;
}

/**
 * Get all components for a site (including global components)
 */
export async function getComponents(db: D1Database, siteId: string): Promise<Component[]> {
  try {
    const result = await db
      .prepare('SELECT * FROM components WHERE site_id = ? OR is_global = 1 ORDER BY name ASC')
      .bind(siteId)
      .all();

    const components = (result.results || []).map((component) => ({
      ...component,
      config:
        typeof component.config === 'string' ? JSON.parse(component.config) : component.config,
      is_global: Boolean(component.is_global),
      is_primitive: Boolean(component.is_primitive)
    })) as Component[];

    return components;
  } catch (error) {
    console.error('Failed to get components:', error);
    throw error;
  }
}

/**
 * Get all components for a site with children count
 * Useful for filtering out empty components in the builder sidebar
 *
 * Children can be stored in two places:
 * 1. component_widgets table (legacy)
 * 2. config.children array (new architecture)
 *
 * This function checks both and returns the maximum count to ensure
 * components with children are not incorrectly filtered out.
 */
export async function getComponentsWithChildrenCount(
  db: D1Database,
  siteId: string
): Promise<ComponentWithChildrenCount[]> {
  try {
    const result = await db
      .prepare(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM component_widgets cw WHERE cw.component_id = c.id) as children_count
         FROM components c 
         WHERE c.site_id = ? OR c.is_global = 1 
         ORDER BY c.name ASC`
      )
      .bind(siteId)
      .all();

    const components = (result.results || []).map((component) => {
      const config =
        typeof component.config === 'string' ? JSON.parse(component.config) : component.config;

      // Count children from config.children (new architecture)
      const configChildren = Array.isArray(config?.children) ? config.children.length : 0;

      // Use the maximum of widget table count and config children count
      // This ensures components using either architecture are counted correctly
      const widgetCount = Number(component.children_count) || 0;
      const effectiveChildrenCount = Math.max(widgetCount, configChildren);

      return {
        ...component,
        config,
        is_global: Boolean(component.is_global),
        is_primitive: Boolean(component.is_primitive),
        children_count: effectiveChildrenCount
      };
    }) as ComponentWithChildrenCount[];

    return components;
  } catch (error) {
    console.error('Failed to get components with children count:', error);
    throw error;
  }
}

/**
 * Get components by type
 */
export async function getComponentsByType(
  db: D1Database,
  siteId: string,
  type: string
): Promise<Component[]> {
  try {
    const result = await db
      .prepare(
        'SELECT * FROM components WHERE (site_id = ? OR is_global = 1) AND type = ? ORDER BY name ASC'
      )
      .bind(siteId, type)
      .all();

    const components = (result.results || []).map((component) => ({
      ...component,
      config:
        typeof component.config === 'string' ? JSON.parse(component.config) : component.config,
      is_global: Boolean(component.is_global),
      is_primitive: Boolean(component.is_primitive)
    })) as Component[];

    return components;
  } catch (error) {
    console.error('Failed to get components by type:', error);
    throw error;
  }
}

/**
 * Get a global component by name (e.g., "Navigation Bar", "Footer")
 * Used for loading built-in components for layouts
 */
export async function getGlobalComponentByName(
  db: D1Database,
  name: string
): Promise<Component | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM components WHERE name = ? AND is_global = 1')
      .bind(name)
      .first();

    if (!result) {
      return null;
    }

    return {
      ...result,
      config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config,
      is_global: Boolean(result.is_global),
      is_primitive: Boolean(result.is_primitive)
    } as Component;
  } catch (error) {
    console.error('Failed to get global component by name:', error);
    return null;
  }
}

/**
 * Get a single component by ID
 */
export async function getComponent(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<Component | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM components WHERE id = ? AND (site_id = ? OR is_global = 1)')
      .bind(componentId, siteId)
      .first();

    if (!result) {
      return null;
    }

    return {
      ...result,
      config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config,
      is_global: Boolean(result.is_global),
      is_primitive: Boolean(result.is_primitive)
    } as Component;
  } catch (error) {
    console.error('Failed to get component:', error);
    throw error;
  }
}

/**
 * Create a new component
 */
export async function createComponent(
  db: D1Database,
  siteId: string,
  data: {
    name: string;
    description?: string;
    type: string;
    config?: Record<string, unknown>;
    is_global?: boolean;
    is_primitive?: boolean;
    widgets?: Array<{
      id?: string;
      type: string;
      config: Record<string, unknown>;
      position: number;
      parent_id?: string;
    }>;
  }
): Promise<Component> {
  try {
    const result = await db
      .prepare(
        `INSERT INTO components (site_id, name, description, type, config, is_global, is_primitive)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .bind(
        siteId,
        data.name,
        data.description || null,
        data.type,
        JSON.stringify(data.config || {}),
        data.is_global ? 1 : 0,
        data.is_primitive ? 1 : 0
      )
      .first();

    if (!result) {
      throw new Error('Failed to create component');
    }

    const component = {
      ...result,
      config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config,
      is_global: Boolean(result.is_global),
      is_primitive: Boolean(result.is_primitive)
    } as Component;

    // If children were provided, save them
    if (data.widgets && data.widgets.length > 0) {
      const childrenWithIds = data.widgets.map((w, index) => ({
        id: w.id || `child-${Date.now()}-${index}`,
        type: w.type,
        config: w.config,
        position: w.position,
        parent_id: w.parent_id
      }));
      await saveComponentChildren(db, component.id, childrenWithIds);
    }

    return component;
  } catch (error) {
    console.error('Failed to create component:', error);
    throw error;
  }
}

/**
 * Update a component
 */
export async function updateComponent(
  db: D1Database,
  siteId: string,
  componentId: number,
  data: {
    name?: string;
    description?: string;
    type?: string;
    config?: Record<string, unknown>;
    is_global?: boolean;
  }
): Promise<Component> {
  try {
    // Don't allow updating global components unless it's a system operation
    const component = await getComponent(db, siteId, componentId);
    if (!component) {
      throw new Error('Component not found');
    }

    if (component.is_global && String(component.site_id) !== siteId) {
      throw new Error('Cannot update global components from other sites');
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(data.config));
    }
    if (data.is_global !== undefined) {
      updates.push('is_global = ?');
      values.push(data.is_global ? 1 : 0);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(componentId, siteId);

    // For global components (is_global = 1), allow update even if site_id doesn't match exactly
    // This matches the getComponent query pattern: (site_id = ? OR is_global = 1)
    // But we still verify ownership through the earlier check
    const result = await db
      .prepare(
        `UPDATE components SET ${updates.join(', ')}
         WHERE id = ? AND (site_id = ? OR is_global = 1)
         RETURNING *`
      )
      .bind(...values)
      .first();

    if (!result) {
      throw new Error('Component not found or update failed');
    }

    return {
      ...result,
      config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config,
      is_global: Boolean(result.is_global),
      is_primitive: Boolean(result.is_primitive)
    } as Component;
  } catch (error) {
    console.error('Failed to update component:', error);
    throw error;
  }
}

/**
 * Delete a component
 */
export async function deleteComponent(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<void> {
  try {
    // Don't allow deleting global components
    const component = await getComponent(db, siteId, componentId);
    if (component?.is_global) {
      throw new Error('Cannot delete global components');
    }

    await db
      .prepare('DELETE FROM components WHERE id = ? AND site_id = ?')
      .bind(componentId, siteId)
      .run();
  } catch (error) {
    console.error('Failed to delete component:', error);
    throw error;
  }
}

/**
 * Check if a component is in use by any layout widgets, page widgets, or layout widgets
 */
export async function isComponentInUse(
  db: D1Database,
  componentId: number
): Promise<{ inUse: boolean; count: number }> {
  try {
    // Check layout_widgets for component references
    const layoutResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM layout_widgets 
         WHERE type = 'component_ref' AND json_extract(config, '$.componentId') = ?`
      )
      .bind(componentId)
      .first<{ count: number }>();

    // Check page_widgets for component references
    const pageResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM page_widgets 
         WHERE type = 'component_ref' AND json_extract(config, '$.componentId') = ?`
      )
      .bind(componentId)
      .first<{ count: number }>();

    const totalCount = (layoutResult?.count || 0) + (pageResult?.count || 0);

    return {
      inUse: totalCount > 0,
      count: totalCount
    };
  } catch (error) {
    console.error('Failed to check if component is in use:', error);
    throw error;
  }
}

/**
 * Get a component with its child composition
 */
export async function getComponentWithChildren(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<ComponentWithChildren | null> {
  try {
    const component = await getComponent(db, siteId, componentId);
    if (!component) {
      return null;
    }

    const children = await getComponentChildren(db, componentId);

    return {
      ...component,
      children,
      widgets: children // Backward compatibility
    };
  } catch (error) {
    console.error('Failed to get component with children:', error);
    throw error;
  }
}

/**
 * @deprecated Use getComponentWithChildren instead
 */
export const getComponentWithWidgets = getComponentWithChildren;

/**
 * Save a component with its child composition
 *
 * For navbar/footer components, we also sync the primary widget's config to the
 * component's config field. This ensures backward compatibility with the frontend
 * layout rendering which reads from component.config directly.
 */
/**
 * Reconstruct nested children structure from flat array with parent_id references.
 * This is needed because the builder saves widgets in a flat structure with parent_id,
 * but the frontend expects nested config.children arrays.
 */
function reconstructNestedChildren(
  flatChildren: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }>,
  parentId?: string
): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
}> {
  // Find all children that belong to this parent
  const directChildren = flatChildren
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.position - b.position);

  return directChildren.map((child) => {
    // Recursively get nested children for this widget
    const nestedChildren = reconstructNestedChildren(flatChildren, child.id);

    // Clone the config and add children if any exist
    const configWithChildren = { ...child.config };
    if (nestedChildren.length > 0) {
      configWithChildren.children = nestedChildren;
    }

    return {
      id: child.id,
      type: child.type,
      position: child.position,
      config: configWithChildren
    };
  });
}

export async function saveComponentWithChildren(
  db: D1Database,
  siteId: string,
  componentId: number,
  data: {
    name?: string;
    description?: string;
    type?: string;
    config?: Record<string, unknown>;
    children: Array<{
      id: string;
      type: string;
      position: number;
      config: Record<string, unknown>;
      parent_id?: string;
    }>;
  }
): Promise<ComponentWithChildren> {
  try {
    // Handle empty children array
    if (!data.children || data.children.length === 0) {
      // No children - just update component metadata, preserve existing config
      const existingComponent = await getComponent(db, siteId, componentId);
      const existingConfig = (existingComponent?.config as Record<string, unknown>) || {};

      const component = await updateComponent(db, siteId, componentId, {
        name: data.name,
        description: data.description,
        type: data.type,
        config: { ...existingConfig, children: [] }
      });

      return {
        ...component,
        children: [],
        widgets: []
      };
    }

    // Check if there's a component wrapper widget (special ID: __component_wrapper__)
    // This represents the component's own container config (used in layout builder mode)
    const wrapperWidget = data.children.find((c) => c.id === '__component_wrapper__');
    const wrapperWidgetId = wrapperWidget?.id;

    let configToSync: Record<string, unknown>;

    if (wrapperWidget && wrapperWidgetId) {
      // The wrapper widget's config becomes the component's config
      // Its children (widgets with parent_id === wrapperWidgetId) become config.children
      const wrapperChildren = reconstructNestedChildren(data.children, wrapperWidgetId);

      configToSync = {
        ...wrapperWidget.config,
        children: wrapperChildren
      };

      // Filter out the wrapper and remap parent_ids for saving to component_widgets table
      // Children with parent_id === wrapperWidgetId should have parent_id: undefined
      // since the wrapper is not stored as a widget
      const childrenToSave = data.children
        .filter((c) => c.id !== wrapperWidgetId)
        .map((c) => ({
          ...c,
          parent_id: c.parent_id === wrapperWidgetId ? undefined : c.parent_id
        }));
      await saveComponentChildren(db, componentId, childrenToSave);
    } else {
      // No wrapper widget - use existing logic for backward compatibility
      const existingComponent = await getComponent(db, siteId, componentId);
      const existingConfig = (existingComponent?.config as Record<string, unknown>) || {};

      // Reconstruct from root-level widgets (parent_id: undefined)
      const nestedChildren = reconstructNestedChildren(data.children, undefined);

      configToSync = {
        ...existingConfig,
        children: nestedChildren
      };

      await saveComponentChildren(db, componentId, data.children);
    }

    // Merge the incoming config (backgroundColor, etc.) with the assembled configToSync
    // The incoming config takes precedence for top-level properties, but children comes from configToSync
    const finalConfig: Record<string, unknown> = {
      ...configToSync,
      ...(data.config || {}),
      children: configToSync.children // Always preserve children from the sync
    };

    // Update component metadata and config
    const component = await updateComponent(db, siteId, componentId, {
      name: data.name,
      description: data.description,
      type: data.type,
      config: finalConfig
    });

    // Get updated children
    const children = await getComponentChildren(db, componentId);

    return {
      ...component,
      children,
      widgets: children // Backward compatibility
    };
  } catch (error) {
    console.error('Failed to save component with children:', error);
    throw error;
  }
}

/**
 * @deprecated Use saveComponentWithChildren instead
 */
export const saveComponentWithWidgets = saveComponentWithChildren;

/**
 * Generate a unique ID for widget children
 */
function generateWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * @deprecated This function is no longer used.
 * Navbar children are now stored inline in the component config.children array
 * (container-based architecture matching migration 0049).
 * Kept for reference only.
 */
function _getDefaultNavbarChildren(): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}> {
  const containerId = generateWidgetId();

  return [
    {
      id: containerId,
      type: 'container',
      position: 0,
      config: {
        containerPadding: {
          desktop: { top: 16, right: 24, bottom: 16, left: 24 },
          tablet: { top: 12, right: 20, bottom: 12, left: 20 },
          mobile: { top: 12, right: 16, bottom: 12, left: 16 }
        },
        containerMargin: {
          desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
          tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
          mobile: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        containerBackground: 'transparent',
        containerBorderRadius: 0,
        containerMaxWidth: '1400px',
        containerJustifyContent: 'space-between',
        children: []
      },
      parent_id: undefined
    }
  ];
}

/**
 * Reset a built-in component to its original default configuration.
 * Uses getDefaultConfig from componentDefaults.ts as the single source of truth.
 * This ensures the database state matches what the reset button produces.
 * Creates a revision to track the reset in revision history.
 */
export async function resetBuiltInComponent(
  db: D1Database,
  siteId: string,
  componentId: number,
  componentType: string
): Promise<void> {
  try {
    // Use the single source of truth from componentDefaults.ts
    const defaultConfig = getDefaultConfig(componentType as ComponentType);

    // Get the current revision to use as parent for the reset revision
    const currentRevision = await getCurrentComponentRevision(db, siteId, componentId);

    // Update the component config AND type to defaults
    // The type must also be updated because it may have been incorrectly saved as 'composite'
    await db
      .prepare(
        `UPDATE components SET config = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_global = 1`
      )
      .bind(JSON.stringify(defaultConfig), componentType, componentId)
      .run();

    // Delete any existing component children (reset to clean state)
    // For navbar/footer, the children are now stored inside config.children (container-based architecture)
    // So we just clear the component_widgets table
    await db
      .prepare('DELETE FROM component_widgets WHERE component_id = ?')
      .bind(componentId)
      .run();

    // Get the component name for the revision data
    const component = await db
      .prepare('SELECT name, description FROM components WHERE id = ?')
      .bind(componentId)
      .first<{ name: string; description?: string }>();

    // Create a new revision to track the reset
    const revision = await createComponentRevision(
      db,
      siteId,
      componentId,
      {
        name: component?.name || componentType,
        description: component?.description,
        type: componentType,
        config: defaultConfig as unknown as Record<string, unknown>,
        children: defaultConfig.children as
          | Array<{
              id: string;
              type: string;
              position: number;
              config: Record<string, unknown>;
            }>
          | undefined
      },
      {
        message: 'Reset to defaults',
        parentRevisionId: currentRevision?.id
      }
    );

    // Publish the reset revision
    await publishComponentRevision(db, siteId, componentId, revision.id);

    // Note: Navbar children are now stored inline in config.children (matching migration 0049)
    // No need to create component_widgets entries for navbar anymore
  } catch (error) {
    console.error('Failed to reset built-in component:', error);
    throw error;
  }
}

/**
 * Resolve component_ref types in an array of page components
 * Replaces component_ref widgets with their actual component type and config
 *
 * @param db - Database connection
 * @param siteId - Site ID for component lookup
 * @param components - Array of page components that may contain component_ref types
 * @returns Array of components with component_ref resolved to actual component types
 */
export async function resolveComponentRefs<T extends { type: string; config: unknown }>(
  db: D1Database,
  siteId: string,
  components: T[]
): Promise<T[]> {
  const resolved: T[] = [];

  for (const comp of components) {
    const config = comp.config as Record<string, unknown> | undefined;
    if (comp.type === 'component_ref' && config?.componentId) {
      // Fetch the referenced component
      const componentId = config.componentId as number;
      const referencedComponent = await getComponent(db, siteId, componentId);

      if (referencedComponent) {
        // Replace component_ref with the actual component type and config
        resolved.push({
          ...comp,
          type: referencedComponent.type,
          config: {
            ...referencedComponent.config,
            // Preserve any overrides from the reference
            ...Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'componentId'))
          }
        } as T);
      } else {
        // Component not found - keep the original (will show error in frontend)
        console.warn(`Component ${componentId} not found for component_ref`);
        resolved.push(comp);
      }
    } else {
      // Not a component_ref, keep as-is
      resolved.push(comp);
    }
  }

  return resolved;
}
