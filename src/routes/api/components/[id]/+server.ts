import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getComponent,
  updateComponent,
  deleteComponent,
  saveComponentWithChildren
} from '$lib/server/db/components';
import { getComponentChildren } from '$lib/server/db/componentChildren';

/**
 * GET /api/components/[id]
 * Get a single component by ID
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
  const db = platform?.env?.DB;
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  if (!siteId) {
    throw error(400, 'Site ID not available');
  }

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    const component = await getComponent(db, siteId, componentId);

    if (!component) {
      throw error(404, 'Component not found');
    }

    return json({ component });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Failed to get component:', err);
    throw error(500, 'Failed to get component');
  }
};

/**
 * Check if adding a component reference would create a circular dependency
 * @param db Database connection
 * @param componentId The component being edited
 * @param referencedId The component being added as a child
 * @param visited Set of visited component IDs to detect cycles
 */
async function wouldCreateCircularReference(
  db: D1Database,
  componentId: number,
  referencedId: number,
  visited: Set<number> = new Set()
): Promise<boolean> {
  // If we're trying to add ourselves, that's a direct circular reference
  if (componentId === referencedId) {
    return true;
  }

  // If we've already visited this component, we've found a cycle
  if (visited.has(referencedId)) {
    return false; // This path doesn't lead back to componentId
  }

  visited.add(referencedId);

  // Get the children of the referenced component
  const children = await getComponentChildren(db, referencedId);

  // Check each child for component_ref types
  for (const child of children) {
    if (child.type === 'component_ref' && child.config?.componentId) {
      const childRefId = child.config.componentId as number;

      // If this child references the original component, we have a cycle
      if (childRefId === componentId) {
        return true;
      }

      // Recursively check this referenced component
      const hasCircular = await wouldCreateCircularReference(db, componentId, childRefId, visited);
      if (hasCircular) {
        return true;
      }
    }
  }

  return false;
}

/**
 * PUT /api/components/[id]
 * Update an existing component
 */
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  const db = platform?.env?.DB;
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  if (!siteId) {
    throw error(400, 'Site ID not available');
  }

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    const data = (await request.json()) as {
      name?: string;
      description?: string;
      type?: string;
      config?: Record<string, unknown>;
      is_global?: boolean;
      children?: Array<{
        id: string;
        type: string;
        position: number;
        config: Record<string, unknown>;
        parent_id?: string;
      }>;
    };

    // Validate for circular references if children include component_ref types
    if (data.children) {
      for (const child of data.children) {
        if (child.type === 'component_ref' && child.config?.componentId) {
          const referencedId = child.config.componentId as number;

          // Check for direct self-reference
          if (referencedId === componentId) {
            throw error(400, 'Cannot add a component to itself');
          }

          // Check for indirect circular references
          const wouldCreateCycle = await wouldCreateCircularReference(
            db,
            componentId,
            referencedId
          );
          if (wouldCreateCycle) {
            throw error(400, 'Cannot add this component - it would create a circular reference');
          }
        }
      }

      const componentWithChildren = await saveComponentWithChildren(db, siteId, componentId, {
        name: data.name,
        description: data.description,
        type: data.type,
        config: data.config,
        children: data.children
      });
      return json({ success: true, component: componentWithChildren });
    }

    // Otherwise, just update the component metadata
    const component = await updateComponent(db, siteId, componentId, data);

    return json({ success: true, component });
  } catch (err) {
    console.error('Failed to update component:', err);
    // Log the full error details for debugging
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(
      500,
      `Failed to update component: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

/**
 * DELETE /api/components/[id]
 * Delete a component
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  const db = platform?.env?.DB;
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  if (!siteId) {
    throw error(400, 'Site ID not available');
  }

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    await deleteComponent(db, siteId, componentId);

    return json({ success: true });
  } catch (err) {
    console.error('Failed to delete component:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to delete component');
  }
};
