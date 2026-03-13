import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDB,
  getProductEquipment,
  addProductEquipment,
  removeProductEquipment
} from '$lib/server/db';

// GET equipment associations for a product
export const GET: RequestHandler = async ({ platform, locals, url }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const productId = url.searchParams.get('productId');

    if (!productId) {
      throw error(400, 'Product ID is required');
    }

    const associations = await getProductEquipment(db, siteId, productId);
    return json(associations);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching product equipment:', err);
    throw error(500, 'Failed to fetch product equipment');
  }
};

// POST add equipment to a product
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const data = (await request.json()) as {
      productId?: string;
      equipmentId?: string;
      sortOrder?: number;
    };

    if (!data.productId || !data.equipmentId) {
      throw error(400, 'Product ID and Equipment ID are required');
    }

    const association = await addProductEquipment(
      db,
      siteId,
      String(data.productId),
      String(data.equipmentId),
      typeof data.sortOrder === 'number' ? data.sortOrder : 0
    );

    return json(association, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error adding product equipment:', err);
    throw error(500, 'Failed to add equipment to product');
  }
};

// DELETE remove equipment from a product
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const data = (await request.json()) as { productId?: string; equipmentId?: string; };

    if (!data.productId || !data.equipmentId) {
      throw error(400, 'Product ID and Equipment ID are required');
    }

    const deleted = await removeProductEquipment(
      db,
      siteId,
      String(data.productId),
      String(data.equipmentId)
    );

    if (!deleted) {
      throw error(404, 'Product equipment association not found');
    }

    return json({ success: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error removing product equipment:', err);
    throw error(500, 'Failed to remove equipment from product');
  }
};
