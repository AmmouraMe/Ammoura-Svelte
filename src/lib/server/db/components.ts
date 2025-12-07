/**
 * Database operations for components (reusable components)
 */

import type { Component, ComponentWithWidgets } from '$lib/types/pages';
import { getComponentChildren, saveComponentChildren } from './componentChildren';

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

    const components = (result.results || []).map((component) => ({
      ...component,
      config:
        typeof component.config === 'string' ? JSON.parse(component.config) : component.config,
      is_global: Boolean(component.is_global),
      is_primitive: Boolean(component.is_primitive),
      children_count: Number(component.children_count) || 0
    })) as ComponentWithChildrenCount[];

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

    // Update component metadata and config
    const component = await updateComponent(db, siteId, componentId, {
      name: data.name,
      description: data.description,
      type: data.type,
      config: configToSync
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
 * Uses the hardcoded defaults which represent the canonical state for built-in components.
 */
export async function resetBuiltInComponent(
  db: D1Database,
  siteId: string,
  componentId: number,
  componentType: string
): Promise<void> {
  try {
    // Use hardcoded defaults - this is the canonical state for built-in components
    const defaultConfig = getDefaultComponentConfig(componentType);

    // Update the component config to defaults
    await db
      .prepare(
        `UPDATE components SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_global = 1`
      )
      .bind(JSON.stringify(defaultConfig), componentId)
      .run();

    // Delete any existing component children (reset to clean state)
    // For navbar/footer, the children are now stored inside config.children (container-based architecture)
    // So we just clear the component_widgets table
    await db
      .prepare('DELETE FROM component_widgets WHERE component_id = ?')
      .bind(componentId)
      .run();

    // Note: Navbar children are now stored inline in config.children (matching migration 0049)
    // No need to create component_widgets entries for navbar anymore
  } catch (error) {
    console.error('Failed to reset built-in component:', error);
    throw error;
  }
}

/**
 * Get the default configuration for a component type
 */
function getDefaultComponentConfig(type: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    navbar: {
      // Container-based architecture matching migration 0051
      // Component wrapper has minimal styling - main styling is on main-container child
      containerPadding: {
        desktop: { top: 0, right: 0, bottom: 0, left: 0 },
        tablet: { top: 0, right: 0, bottom: 0, left: 0 },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerMargin: {
        desktop: { top: 0, right: 0, bottom: 0, left: 0 },
        tablet: { top: 0, right: 0, bottom: 0, left: 0 },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'transparent',
      containerBorderRadius: 0,
      containerMaxWidth: '100%',
      containerDisplay: { desktop: 'block', tablet: 'block', mobile: 'block' },
      containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
      visibilityRule: 'always',
      position: 'sticky',
      positionType: 'sticky',
      children: [
        {
          id: 'main-container',
          type: 'container',
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
            containerBackground: 'theme:secondary',
            containerBorderRadius: 0,
            containerMaxWidth: '1400px',
            containerJustifyContent: 'space-between',
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
            containerAlignItems: 'stretch',
            containerWrap: 'nowrap',
            containerGap: { desktop: 16, tablet: 16, mobile: 16 },
            containerWidth: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
            containerGridCols: { desktop: 3, tablet: 2, mobile: 1 },
            containerGridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
            containerPlaceItems: null,
            children: [
              {
                id: 'logo-container',
                type: 'container',
                config: {
                  containerPadding: {
                    desktop: { top: 40, right: 40, bottom: 40, left: 40 },
                    tablet: { top: 30, right: 30, bottom: 30, left: 30 },
                    mobile: { top: 20, right: 20, bottom: 20, left: 20 }
                  },
                  containerMargin: {
                    desktop: { top: 0, right: 0, bottom: 0, left: 0 },
                    tablet: { top: 0, right: 0, bottom: 0, left: 0 },
                    mobile: { top: 0, right: 0, bottom: 0, left: 0 }
                  },
                  containerBackground: 'transparent',
                  containerBorderRadius: 0,
                  containerMaxWidth: '1200px',
                  containerGap: { desktop: 16, tablet: 12, mobile: 8 },
                  containerJustifyContent: 'flex-start',
                  containerAlignItems: 'center',
                  containerWrap: 'wrap',
                  children: [
                    {
                      id: 'site-name-heading',
                      type: 'heading',
                      config: {
                        heading: '${site.name}',
                        level: 2,
                        textColor: 'theme:text',
                        link: '/'
                      },
                      position: 0
                    }
                  ]
                },
                position: 0
              },
              {
                id: 'nav-links-container',
                type: 'container',
                config: {
                  containerPadding: {
                    desktop: { top: 0, right: 40, bottom: 0, left: 40 },
                    tablet: { top: 30, right: 30, bottom: 30, left: 30 },
                    mobile: { top: 20, right: 20, bottom: 20, left: 20 }
                  },
                  containerMargin: {
                    desktop: { top: 0, right: 0, bottom: 0, left: 0 },
                    tablet: { top: 0, right: 0, bottom: 0, left: 0 },
                    mobile: { top: 0, right: 0, bottom: 0, left: 0 }
                  },
                  containerBackground: 'transparent',
                  containerBorderRadius: 0,
                  containerMaxWidth: '1200px',
                  containerGap: { desktop: 16, tablet: 12, mobile: 8 },
                  containerJustifyContent: 'flex-end',
                  containerAlignItems: 'center',
                  containerWrap: 'wrap',
                  containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
                  containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                  containerWidth: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
                  containerGridCols: { desktop: 3, tablet: 2, mobile: 1 },
                  containerGridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
                  children: [
                    {
                      id: 'products-link',
                      type: 'button',
                      config: {
                        label: 'Products',
                        url: '/#products',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true }
                      },
                      position: 0
                    },
                    {
                      id: 'pricing-link',
                      type: 'button',
                      config: {
                        label: 'Pricing',
                        url: '/#pricing',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true }
                      },
                      position: 1
                    },
                    {
                      id: 'login-button',
                      type: 'button',
                      config: {
                        label: 'Login',
                        url: '/auth/login',
                        variant: 'outline',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true },
                        icon: 'LogIn',
                        visibilityRule: 'unauthenticated'
                      },
                      position: 2
                    },
                    {
                      id: 'user-dropdown',
                      type: 'dropdown',
                      config: {
                        label: 'Select Option',
                        placeholder: 'Choose...',
                        options: [
                          { value: 'option1', label: 'Option 1' },
                          { value: 'option2', label: 'Option 2' },
                          { value: 'option3', label: 'Option 3' }
                        ],
                        required: false,
                        searchable: false,
                        size: 'medium',
                        defaultValue: '',
                        triggerIcon: '',
                        triggerVariant: 'text',
                        menuAlign: 'left',
                        triggerLabel: '${user.display_name}',
                        visibilityRule: 'authenticated',
                        children: [
                          {
                            id: 'admin-dashboard-link',
                            type: 'button',
                            config: {
                              label: 'Admin Dashboard',
                              url: '/admin/dashboard',
                              variant: 'text',
                              size: 'medium',
                              fullWidth: { desktop: false, tablet: false, mobile: true },
                              visibilityRule: 'role',
                              requiredRoles: ['admin']
                            },
                            position: 0
                          },
                          {
                            id: 'dropdown-divider',
                            type: 'divider',
                            config: {
                              thickness: 1,
                              dividerColor: 'theme:border',
                              dividerStyle: 'solid',
                              spacing: { desktop: 20, tablet: 15, mobile: 10 }
                            },
                            position: 1
                          },
                          {
                            id: 'logout-button',
                            type: 'button',
                            config: {
                              label: 'Logout',
                              url: '/auth/logout',
                              variant: 'text',
                              size: 'medium',
                              fullWidth: { desktop: false, tablet: false, mobile: true }
                            },
                            position: 2
                          },
                          {
                            id: 'profile-button',
                            type: 'button',
                            config: {
                              label: 'Profile',
                              url: '#',
                              variant: 'text',
                              size: 'medium',
                              fullWidth: { desktop: false, tablet: false, mobile: true }
                            },
                            position: 3
                          }
                        ]
                      },
                      position: 3
                    },
                    {
                      id: 'cart-button',
                      type: 'button',
                      config: {
                        label: 'Cart',
                        url: '/cart',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true },
                        icon: 'ShoppingCart'
                      },
                      position: 4
                    }
                  ]
                },
                position: 1
              }
            ]
          },
          position: 0
        }
      ]
    },
    footer: {
      // Container-based architecture matching Navigation Bar pattern
      // Component wrapper provides the outer footer styling
      containerPadding: {
        desktop: { top: 0, right: 0, bottom: 0, left: 0 },
        tablet: { top: 0, right: 0, bottom: 0, left: 0 },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerMargin: {
        desktop: { top: 0, right: 0, bottom: 0, left: 0 },
        tablet: { top: 0, right: 0, bottom: 0, left: 0 },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'transparent',
      containerBorderRadius: 0,
      containerMaxWidth: '100%',
      containerDisplay: { desktop: 'block', tablet: 'block', mobile: 'block' },
      containerWidth: { desktop: '100%', tablet: '100%', mobile: '100%' },
      visibilityRule: 'always',
      // Footer-specific styling
      footerBackground: 'theme:surface',
      footerTextColor: 'theme:textSecondary',
      footerHoverColor: 'theme:primary',
      footerBorderColor: 'theme:border',
      footerShadow: false,
      copyright: '© 2025 ${site.name}. All rights reserved.',
      columnsPerRow: { desktop: 4, tablet: 2, mobile: 1 },
      // Logo and tagline
      logo: {
        text: '${site.name}',
        url: '/',
        image: '',
        imageHeight: 32
      },
      tagline: '${site.tagline}',
      // Link sections for multi-column footer
      linkSections: [
        {
          title: 'Company',
          links: [
            { text: 'About', url: '/about' },
            { text: 'Careers', url: '/careers' },
            { text: 'Blog', url: '/blog' }
          ]
        },
        {
          title: 'Support',
          links: [
            { text: 'Help Center', url: '/help' },
            { text: 'Contact Us', url: '/contact' },
            { text: 'FAQ', url: '/faq' }
          ]
        },
        {
          title: 'Legal',
          links: [
            { text: 'Privacy Policy', url: '/privacy' },
            { text: 'Terms of Service', url: '/terms' },
            { text: 'Cookie Policy', url: '/cookies' }
          ]
        }
      ],
      // Social links
      socialLinks: [
        { platform: 'facebook', url: '#' },
        { platform: 'twitter', url: '#' },
        { platform: 'instagram', url: '#' },
        { platform: 'linkedin', url: '#' }
      ],
      // Legacy footer links for backward compatibility
      footerLinks: [],
      // Children structure for Container-based composition
      children: [
        {
          id: 'main-container',
          type: 'container',
          config: {
            containerPadding: {
              desktop: { top: 48, right: 24, bottom: 48, left: 24 },
              tablet: { top: 40, right: 20, bottom: 40, left: 20 },
              mobile: { top: 32, right: 16, bottom: 32, left: 16 }
            },
            containerMargin: {
              desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
              tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
              mobile: { top: 0, right: 0, bottom: 0, left: 0 }
            },
            containerBackground: 'transparent',
            containerBorderRadius: 0,
            containerMaxWidth: '1200px',
            containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
            containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
            containerAlignItems: 'stretch',
            containerWrap: 'nowrap',
            containerGap: { desktop: 32, tablet: 24, mobile: 16 },
            children: [
              {
                id: 'footer-content-row',
                type: 'container',
                config: {
                  containerPadding: {
                    desktop: { top: 0, right: 0, bottom: 0, left: 0 }
                  },
                  containerDisplay: { desktop: 'flex', tablet: 'grid', mobile: 'grid' },
                  containerGridCols: { desktop: 4, tablet: 2, mobile: 1 },
                  containerGap: { desktop: 32, tablet: 24, mobile: 24 },
                  containerFlexDirection: { desktop: 'row', tablet: 'row', mobile: 'column' },
                  containerJustifyContent: 'space-around',
                  containerAlignItems: 'stretch',
                  containerWrap: 'nowrap',
                  containerMaxWidth: '1200px',
                  containerWidth: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
                  containerGridAutoFlow: { desktop: 'row', tablet: 'row', mobile: 'row' },
                  containerPlaceItems: '',
                  children: [
                    {
                      id: 'footer-about-btn',
                      type: 'button',
                      position: 0,
                      config: {
                        label: 'About',
                        url: '/about',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true }
                      }
                    },
                    {
                      id: 'footer-products-btn',
                      type: 'button',
                      position: 1,
                      config: {
                        label: 'Products',
                        url: '/#products',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true }
                      }
                    },
                    {
                      id: 'footer-admin-btn',
                      type: 'button',
                      position: 2,
                      config: {
                        label: 'Admin Dashboard',
                        url: '/admin/dashboard',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true },
                        icon: 'Settings',
                        visibilityRule: 'role',
                        requiredRoles: ['admin']
                      }
                    },
                    {
                      id: 'footer-login-btn',
                      type: 'button',
                      position: 3,
                      config: {
                        label: 'Login',
                        url: '/auth/login',
                        variant: 'text',
                        size: 'medium',
                        fullWidth: { desktop: false, tablet: false, mobile: true },
                        icon: 'LogIn',
                        visibilityRule: 'unauthenticated'
                      }
                    }
                  ]
                },
                position: 0
              },
              {
                id: 'footer-copyright',
                type: 'text',
                config: {
                  text: '© 2025 ${site.name}. All rights reserved.',
                  alignment: 'center',
                  fontSize: { desktop: 14, tablet: 14, mobile: 12 },
                  color: 'theme:textSecondary'
                },
                position: 1
              }
            ]
          },
          position: 0
        }
      ]
    },
    container: {
      containerPadding: {
        desktop: { top: 40, right: 40, bottom: 40, left: 40 },
        tablet: { top: 30, right: 30, bottom: 30, left: 30 },
        mobile: { top: 20, right: 20, bottom: 20, left: 20 }
      },
      containerMargin: {
        desktop: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        tablet: { top: 0, right: 'auto', bottom: 0, left: 'auto' },
        mobile: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      containerBackground: 'transparent',
      containerBorderRadius: 0,
      containerMaxWidth: '1200px',
      children: []
    },
    hero: {
      title: 'Welcome to Our Site',
      subtitle: 'Discover amazing products and services',
      ctaText: 'Get Started',
      ctaLink: '#',
      backgroundColor: 'theme:primary',
      contentAlign: 'center',
      heroHeight: { desktop: '500px', tablet: '400px', mobile: '300px' },
      titleColor: 'theme:text',
      subtitleColor: 'theme:textSecondary'
    },
    columns: {
      columnCount: { desktop: 3, tablet: 2, mobile: 1 },
      columnGap: { desktop: 20, tablet: 16, mobile: 12 },
      columns: []
    },
    spacer: {
      space: { desktop: 40, tablet: 30, mobile: 20 }
    },
    divider: {
      thickness: 1,
      color: 'theme:border',
      dividerWidth: '100%',
      dividerSpacing: { desktop: 32, tablet: 24, mobile: 16 }
    },
    heading: {
      heading: 'Heading',
      level: 2,
      alignment: 'left',
      color: 'var(--color-text-primary)'
    },
    text: {
      text: 'Enter your text here',
      alignment: 'left',
      fontSize: { desktop: 16, tablet: 16, mobile: 14 },
      color: 'var(--color-text-primary)'
    },
    button: {
      label: 'Click Me',
      url: '#',
      variant: 'primary',
      openInNewTab: false,
      fullWidth: { desktop: false, tablet: false, mobile: false },
      buttonAlign: 'left'
    },
    image: {
      src: '',
      alt: 'Image',
      imageWidth: '100%',
      borderRadius: 0,
      objectFit: 'cover'
    },
    single_product: {
      productId: '',
      layout: 'card',
      showPrice: true,
      showDescription: true
    },
    product_list: {
      category: '',
      limit: 12,
      sortBy: 'created_at',
      productListColumns: { desktop: 3, tablet: 2, mobile: 1 },
      productGap: { desktop: 24, tablet: 20, mobile: 16 }
    },
    features: {
      title: 'Features',
      subtitle: '',
      features: [
        { icon: '🎯', title: 'Feature One', description: 'Describe what makes this feature great' },
        { icon: '✨', title: 'Feature Two', description: 'Explain the benefits of this feature' },
        { icon: '🚀', title: 'Feature Three', description: 'Tell users why they need this' }
      ],
      featuresColumns: { desktop: 3, tablet: 2, mobile: 1 },
      featuresGap: { desktop: 32, tablet: 24, mobile: 16 }
    },
    cta: {
      heading: 'Ready to Get Started?',
      subheading: 'Join thousands of satisfied customers',
      buttonText: 'Get Started',
      buttonUrl: '#',
      backgroundColor: 'var(--color-bg-secondary)',
      textColor: 'var(--color-text-primary)'
    },
    pricing: {
      title: 'Pricing',
      subtitle: 'Choose the plan that fits your needs',
      plans: []
    }
  };

  return defaults[type] || {};
}
