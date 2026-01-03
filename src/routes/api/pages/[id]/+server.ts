import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import type { RequestHandler } from './$types';

/**
 * GET /api/pages/[id]
 * Get a specific page by ID
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;

  try {
    const page = await pagesDb.getPageById(db, siteId, pageId);
    if (!page) {
      throw error(404, 'Page not found');
    }

    // Also fetch widgets for this page
    const widgets = await pagesDb.getPageWidgets(db, pageId);

    return json({ ...page, widgets });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching page:', err);
    throw error(500, 'Failed to fetch page');
  }
};

/**
 * PUT /api/pages/[id]
 * Update a page
 */
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;

  try {
    const data = (await request.json()) as {
      title?: string;
      slug?: string;
      status?: string;
      content?: string;
      colorTheme?: string;
      layout_id?: number;
    };

    const updateData: pagesDb.UpdatePageData = {
      title: data.title,
      slug: data.slug,
      status: data.status as 'draft' | 'published' | undefined,
      content: data.content,
      colorTheme: data.colorTheme,
      layout_id: data.layout_id
    };

    const page = await pagesDb.updatePage(db, siteId, pageId, updateData);
    if (!page) {
      throw error(404, 'Page not found');
    }

    return json(page);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error updating page:', err);
    if (err instanceof Error && err.message.includes('already exists')) {
      throw error(409, err.message);
    }
    throw error(500, 'Failed to update page');
  }
};

/**
 * DELETE /api/pages/[id]
 * Delete a page (cannot delete built-in pages)
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;

  try {
    // Check if page is built-in
    const page = await pagesDb.getPageById(db, siteId, pageId);
    if (!page) {
      throw error(404, 'Page not found');
    }

    if (page.is_builtin) {
      throw error(403, 'Built-in pages cannot be deleted');
    }

    const deleted = await pagesDb.deletePage(db, siteId, pageId);
    if (!deleted) {
      throw error(404, 'Page not found');
    }

    return json({ success: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error deleting page:', err);
    throw error(500, 'Failed to delete page');
  }
};
