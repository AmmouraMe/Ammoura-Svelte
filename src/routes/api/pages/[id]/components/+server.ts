import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import type { RequestHandler } from './$types';

/**
 * GET /api/pages/[id]/components
 * Get all components for a page
 */
export const GET: RequestHandler = async ({ params, platform }) => {
  const db = getDB(platform);
  const pageId = params.id;

  try {
    const components = await pagesDb.getPageComponents(db, pageId);
    return json(components);
  } catch (err) {
    console.error('Error fetching page components:', err);
    throw error(500, 'Failed to fetch page components');
  }
};

/**
 * POST /api/pages/[id]/components
 * Create a new component for a page
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
  const db = getDB(platform);
  const pageId = params.id;

  try {
    const data = (await request.json()) as {
      type?: string;
      config?: object;
      position?: number;
    };

    // Validate required fields
    if (!data.type || !data.config || data.position === undefined) {
      throw error(400, 'Missing required fields');
    }

    const componentData: pagesDb.CreatePageComponentData = {
      type: data.type as
        | 'single_product'
        | 'product_list'
        | 'text'
        | 'image'
        | 'hero'
        | 'button'
        | 'spacer'
        | 'columns'
        | 'heading'
        | 'divider',
      config: data.config,
      position: data.position
    };

    const component = await pagesDb.createPageComponent(db, pageId, componentData);
    return json(component, { status: 201 });
  } catch (err) {
    console.error('Error creating page component:', err);
    throw error(500, 'Failed to create page component');
  }
};

/**
 * PUT /api/pages/[id]/components
 * Reorder components for a page
 */
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  const db = getDB(platform);
  const pageId = params.id;

  try {
    const data = (await request.json()) as {
      componentIds?: unknown;
    };

    // Validate required fields
    if (!Array.isArray(data.componentIds)) {
      throw error(400, 'componentIds must be an array');
    }

    await pagesDb.reorderPageComponents(db, pageId, data.componentIds);
    return json({ success: true });
  } catch (err) {
    console.error('Error reordering page components:', err);
    throw error(500, 'Failed to reorder page components');
  }
};
