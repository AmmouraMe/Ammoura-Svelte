import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDB,
  getCustomizationZones,
  createCustomizationZone,
  updateCustomizationZone,
  deleteCustomizationZone
} from '$lib/server/db';

// GET zones for a product
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const productId = url.searchParams.get('productId');
  if (!productId) {
    throw error(400, 'productId query parameter is required');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const zones = await getCustomizationZones(db, siteId, productId);
    return json(zones);
  } catch (err) {
    console.error('Error fetching customization zones:', err);
    throw error(500, 'Failed to fetch customization zones');
  }
};

// POST create new zone
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const data = (await request.json()) as {
      productId: string;
      mediaId?: string | null;
      name: string;
      xPercent: number;
      yPercent: number;
      widthPercent: number;
      heightPercent: number;
      maxFileSize?: number;
      allowedTypes?: string[];
      sortOrder?: number;
    };

    if (!data.productId) {
      throw error(400, 'productId is required');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw error(400, 'Zone name is required');
    }
    if (
      data.xPercent == null ||
      data.yPercent == null ||
      data.widthPercent == null ||
      data.heightPercent == null
    ) {
      throw error(
        400,
        'Zone position (xPercent, yPercent, widthPercent, heightPercent) is required'
      );
    }

    const zone = await createCustomizationZone(db, siteId, {
      productId: data.productId,
      mediaId: data.mediaId ?? null,
      name: data.name.trim(),
      xPercent: data.xPercent,
      yPercent: data.yPercent,
      widthPercent: data.widthPercent,
      heightPercent: data.heightPercent,
      maxFileSize: data.maxFileSize,
      allowedTypes: data.allowedTypes,
      sortOrder: data.sortOrder
    });

    return json(zone, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error creating customization zone:', err);
    throw error(500, 'Failed to create customization zone');
  }
};

// PUT update zone
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const data = (await request.json()) as {
      id: string;
      name?: string;
      mediaId?: string | null;
      xPercent?: number;
      yPercent?: number;
      widthPercent?: number;
      heightPercent?: number;
      maxFileSize?: number;
      allowedTypes?: string[];
      sortOrder?: number;
    };

    if (!data.id) {
      throw error(400, 'Zone ID is required');
    }

    const { id, ...updateData } = data;
    if (updateData.name !== undefined) {
      updateData.name = updateData.name.trim();
      if (updateData.name.length === 0) {
        throw error(400, 'Zone name cannot be empty');
      }
    }

    const zone = await updateCustomizationZone(db, siteId, id, updateData);

    if (!zone) {
      throw error(404, 'Customization zone not found');
    }

    return json(zone);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error updating customization zone:', err);
    throw error(500, 'Failed to update customization zone');
  }
};

// DELETE zone
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const data = (await request.json()) as { id: string };

    if (!data.id) {
      throw error(400, 'Zone ID is required');
    }

    const deleted = await deleteCustomizationZone(db, siteId, data.id);

    if (!deleted) {
      throw error(404, 'Customization zone not found');
    }

    return json({ success: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error deleting customization zone:', err);
    throw error(500, 'Failed to delete customization zone');
  }
};
