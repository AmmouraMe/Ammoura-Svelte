import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createComponent } from '$lib/server/db/components';
import { saveComponentChildren } from '$lib/server/db/componentChildren';

/**
 * POST /api/components
 * Create a new component
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const db = platform?.env?.DB;
  const siteId = locals.siteId;

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  if (!siteId) {
    throw error(400, 'Site ID not available');
  }

  try {
    const data = (await request.json()) as {
      name: string;
      description?: string;
      type: string;
      config: Record<string, unknown>;
      is_global?: boolean;
      children?: Array<{
        id: string;
        type: string;
        position: number;
        config: Record<string, unknown>;
        parent_id?: string;
      }>;
    };

    // Validate required fields
    if (!data.name || !data.type) {
      throw error(400, 'Name and type are required');
    }

    // For navbar and footer components, sync the primary child's config to the component
    // This ensures the frontend layout rendering works correctly
    let configToUse = data.config || {};
    if (data.children && data.children.length > 0) {
      const sortedChildren = [...data.children].sort((a, b) => a.position - b.position);
      const primaryChild = sortedChildren[0];

      // If the primary child is a navbar or footer, use its config for the component
      if (primaryChild.type === 'navbar' || primaryChild.type === 'footer') {
        configToUse = primaryChild.config;
      }
      // If the component type is navbar/footer, we need to sync config for frontend rendering
      // First try to find a navbar/footer widget, otherwise use the primary child's config
      else if (data.type === 'navbar' || data.type === 'footer') {
        const navbarOrFooter = sortedChildren.find(
          (c) => c.type === 'navbar' || c.type === 'footer'
        );
        if (navbarOrFooter) {
          configToUse = navbarOrFooter.config;
        } else {
          // Fallback: use the primary child's config for navbar/footer components
          configToUse = primaryChild.config;
        }
      }
    }

    const component = await createComponent(db, siteId, {
      name: data.name,
      description: data.description,
      type: data.type,
      config: configToUse,
      is_global: data.is_global
    });

    // Save component children if provided
    if (data.children && data.children.length > 0) {
      await saveComponentChildren(db, component.id, data.children);
    }

    return json({ componentId: component.id, component });
  } catch (err) {
    console.error('Failed to create component:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to create component');
  }
};
