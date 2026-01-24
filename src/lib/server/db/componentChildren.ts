/**
 * Database operations for component children (child composition of components)
 */

import type { ComponentWidget } from '$lib/types/pages';

// Type alias for clarity - ComponentWidget represents a child component in the database
type ComponentChild = ComponentWidget;

/**
 * Get all children for a component
 */
export async function getComponentChildren(
  db: D1Database,
  componentId: number
): Promise<ComponentChild[]> {
  try {
    const result = await db
      .prepare('SELECT * FROM component_widgets WHERE component_id = ? ORDER BY position ASC')
      .bind(componentId)
      .all();

    const children = (result.results || []).map((child) => ({
      ...child,
      config: typeof child.config === 'string' ? JSON.parse(child.config) : child.config
    })) as ComponentChild[];

    return children;
  } catch (error) {
    console.error('Failed to get component children:', error);
    throw error;
  }
}

/**
 * @deprecated Use getComponentChildren instead
 */
export const getComponentWidgets = getComponentChildren;

/**
 * Get a single component child by ID
 */
export async function getComponentChild(
  db: D1Database,
  childId: string
): Promise<ComponentChild | null> {
  try {
    const result = await db
      .prepare('SELECT * FROM component_widgets WHERE id = ?')
      .bind(childId)
      .first();

    if (!result) {
      return null;
    }

    return {
      ...result,
      config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config
    } as ComponentChild;
  } catch (error) {
    console.error('Failed to get component child:', error);
    throw error;
  }
}

/**
 * @deprecated Use getComponentChild instead
 */
export const getComponentWidget = getComponentChild;

/**
 * Create a new component child
 */
export async function createComponentChild(
  db: D1Database,
  data: {
    id: string;
    component_id: number;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }
): Promise<ComponentChild> {
  try {
    const now = new Date().toISOString();
    const configJson = JSON.stringify(data.config);

    // Use INSERT OR REPLACE to handle cases where the ID already exists
    // This can happen when re-saving components with the same widget IDs
    await db
      .prepare(
        `INSERT OR REPLACE INTO component_widgets (id, component_id, type, position, config, parent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.id,
        data.component_id,
        data.type,
        data.position,
        configJson,
        data.parent_id || null,
        now,
        now
      )
      .run();

    return {
      id: data.id,
      component_id: data.component_id,
      type: data.type as ComponentChild['type'],
      position: data.position,
      config: data.config,
      parent_id: data.parent_id,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Failed to create component child:', error);
    throw error;
  }
}

/**
 * @deprecated Use createComponentChild instead
 */
export const createComponentWidget = createComponentChild;

/**
 * Update a component child
 */
export async function updateComponentChild(
  db: D1Database,
  childId: string,
  data: {
    type?: string;
    position?: number;
    config?: Record<string, unknown>;
    parent_id?: string;
  }
): Promise<void> {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }

    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (data.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(data.config));
    }

    if (data.parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(data.parent_id || null);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(childId);

    await db
      .prepare(`UPDATE component_widgets SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  } catch (error) {
    console.error('Failed to update component child:', error);
    throw error;
  }
}

/**
 * @deprecated Use updateComponentChild instead
 */
export const updateComponentWidget = updateComponentChild;

/**
 * Delete a component child
 */
export async function deleteComponentChild(db: D1Database, childId: string): Promise<void> {
  try {
    await db.prepare('DELETE FROM component_widgets WHERE id = ?').bind(childId).run();
  } catch (error) {
    console.error('Failed to delete component child:', error);
    throw error;
  }
}

/**
 * @deprecated Use deleteComponentChild instead
 */
export const deleteComponentWidget = deleteComponentChild;

/**
 * Delete all children for a component
 */
export async function deleteComponentChildren(db: D1Database, componentId: number): Promise<void> {
  try {
    await db
      .prepare('DELETE FROM component_widgets WHERE component_id = ?')
      .bind(componentId)
      .run();
  } catch (error) {
    console.error('Failed to delete component children:', error);
    throw error;
  }
}

/**
 * @deprecated Use deleteComponentChildren instead
 */
export const deleteComponentWidgets = deleteComponentChildren;

/**
 * Bulk save component children (delete all existing and create new ones)
 * Children are sorted to ensure parents are inserted before their children
 * to satisfy the foreign key constraint on parent_id.
 */
export async function saveComponentChildren(
  db: D1Database,
  componentId: number,
  children: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }>
): Promise<void> {
  try {
    // Delete all existing children
    await deleteComponentChildren(db, componentId);

    // Deduplicate children by ID (keep the last occurrence if duplicates exist)
    const childrenMap = new Map<
      string,
      {
        id: string;
        type: string;
        position: number;
        config: Record<string, unknown>;
        parent_id?: string;
      }
    >();
    for (const child of children) {
      childrenMap.set(child.id, child);
    }
    const uniqueChildren = Array.from(childrenMap.values());

    // Sort children so parents are inserted before their children
    // This is necessary because of the foreign key constraint on parent_id
    const sortedChildren = sortChildrenByHierarchy(uniqueChildren);

    // Insert new children in the correct order
    for (const child of sortedChildren) {
      await createComponentChild(db, {
        ...child,
        component_id: componentId
      });
    }
  } catch (error) {
    console.error('Failed to save component children:', error);
    throw error;
  }
}

/**
 * Sort children so that parents come before their children.
 * This ensures we can insert them in order without violating the parent_id foreign key.
 */
function sortChildrenByHierarchy(
  children: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }>
): typeof children {
  const result: typeof children = [];
  const remaining = [...children];
  const insertedIds = new Set<string>();

  // First, add all root-level children (no parent_id)
  const rootChildren = remaining.filter((c) => !c.parent_id);
  for (const child of rootChildren) {
    result.push(child);
    insertedIds.add(child.id);
  }

  // Remove root children from remaining
  const withParents = remaining.filter((c) => c.parent_id);

  // Keep adding children whose parents have been inserted
  let iterations = 0;
  const maxIterations = withParents.length + 1; // Prevent infinite loop

  while (withParents.length > 0 && iterations < maxIterations) {
    iterations++;
    const toInsert: typeof children = [];

    for (let i = withParents.length - 1; i >= 0; i--) {
      const child = withParents[i];
      if (child.parent_id && insertedIds.has(child.parent_id)) {
        toInsert.push(child);
        insertedIds.add(child.id);
        withParents.splice(i, 1);
      }
    }

    // Add children whose parents are now inserted
    result.push(...toInsert);
  }

  // If there are still remaining children (orphans or circular references), add them anyway
  // The database will handle the constraint violation
  if (withParents.length > 0) {
    console.warn(
      'Some children have parent_ids that do not exist in the children list:',
      withParents.map((c) => ({ id: c.id, parent_id: c.parent_id }))
    );
    result.push(...withParents);
  }

  return result;
}

/**
 * @deprecated Use saveComponentChildren instead
 */
export const saveComponentWidgets = saveComponentChildren;
