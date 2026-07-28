/**
 * POST /api/admin/products/from-template
 * Create a new product seeded from a curated template (with its print areas
 * materialized as customization zones), and return the new product id so the
 * client can redirect to the product editor.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, createProductFromTemplate } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const data = (await request.json()) as { templateId?: string };
  if (!data.templateId) {
    throw error(400, 'templateId is required');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const product = await createProductFromTemplate(db, siteId, data.templateId);
    return json({ productId: product.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Template not found') {
      throw error(404, 'Template not found');
    }
    console.error('Error creating product from template:', err);
    throw error(500, 'Failed to create product from template');
  }
};
