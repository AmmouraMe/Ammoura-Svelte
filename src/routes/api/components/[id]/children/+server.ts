import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getComponentChildren } from '$lib/server/db/componentChildren';
import { getComponent } from '$lib/server/db/components';

interface InlineChild {
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}

/**
 * GET /api/components/[id]/children
 * Get all child components for a saved component
 * Checks both:
 * 1. component_widgets table (for components created through the old system)
 * 2. config.children (for components using inline children architecture)
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
    // Get the component
    const component = await getComponent(db, siteId, componentId);
    if (!component) {
      throw error(404, 'Component not found');
    }

    // First, check for children in the component_widgets table (old system)
    const dbChildren = await getComponentChildren(db, componentId);

    // If we have database children, use those
    if (dbChildren.length > 0) {
      return json({ children: dbChildren });
    }

    // Otherwise, check for inline children in config.children (new architecture)
    const config = component.config as Record<string, unknown> | undefined;
    const inlineChildren = config?.children as InlineChild[] | undefined;

    if (inlineChildren && Array.isArray(inlineChildren)) {
      // Convert inline children to the expected format
      const now = new Date().toISOString();
      const formattedChildren = inlineChildren.map((child, index) => ({
        id: child.id || `inline-${componentId}-${index}`,
        component_id: componentId,
        type: child.type,
        position: child.position ?? index,
        config: child.config || {},
        parent_id: child.parent_id || null,
        created_at: now,
        updated_at: now
      }));

      return json({ children: formattedChildren });
    }

    // No children found in either location
    return json({ children: [] });
  } catch (err) {
    console.error('Failed to get component children:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to get component children');
  }
};
