import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import type { RequestHandler } from './$types';

/**
 * GET /api/pages
 * Get all pages for the current site
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const pages = await pagesDb.getAllPages(db, siteId);
    return json(pages);
  } catch (err) {
    console.error('Error fetching pages:', err);
    throw error(500, 'Failed to fetch pages');
  }
};

/**
 * POST /api/pages
 * Create a new page
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const data = (await request.json()) as {
      title?: string;
      slug?: string;
      status?: string;
      content?: string;
      colorTheme?: string;
      layout_id?: number;
    };

    // Validate required fields
    if (!data.title || !data.slug || !data.status) {
      throw error(400, 'Missing required fields');
    }

    const pageData: pagesDb.CreatePageData = {
      title: data.title,
      slug: data.slug,
      status: data.status as 'draft' | 'published',
      content: data.content,
      colorTheme: data.colorTheme,
      layout_id: data.layout_id
    };

    const page = await pagesDb.createPage(db, siteId, pageData);
    return json(page, { status: 201 });
  } catch (err) {
    console.error('Error creating page:', err);
    if (err instanceof Error && err.message.includes('already exists')) {
      throw error(409, err.message);
    }
    throw error(500, 'Failed to create page');
  }
};
