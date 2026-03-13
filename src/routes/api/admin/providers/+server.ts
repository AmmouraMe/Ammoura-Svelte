import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getDB,
  getAllFulfillmentProviders,
  createFulfillmentProvider,
  updateFulfillmentProvider,
  deleteFulfillmentProvider
} from '$lib/server/db';
import type { DBFulfillmentProvider } from '$lib/types/fulfillment';
import { isValidProviderType } from '$lib/server/fulfillment/providerCapabilities';

// GET all providers
export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const dbProviders = await getAllFulfillmentProviders(db, siteId);

    const providers = dbProviders.map((p: DBFulfillmentProvider) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      providerType: p.provider_type || 'manual',
      isDefault: p.is_default === 1,
      isActive: p.is_active === 1
    }));

    return json(providers);
  } catch (err) {
    console.error('Error fetching fulfillment providers:', err);
    throw error(500, 'Failed to fetch fulfillment providers');
  }
};

// POST create new provider
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const data = (await request.json()) as {
      name: string;
      description?: string;
      providerType?: string;
      config?: Record<string, string>;
      isActive?: boolean;
    };

    if (!data.name || data.name.trim().length === 0) {
      throw error(400, 'Provider name is required');
    }

    if (data.providerType && !isValidProviderType(data.providerType)) {
      throw error(400, 'Invalid provider type');
    }

    const providerData = {
      name: data.name.trim(),
      description: data.description?.trim(),
      providerType: data.providerType as 'manual' | 'printful' | undefined,
      config: data.config,
      isActive: data.isActive !== undefined ? data.isActive : true
    };

    const dbProvider = await createFulfillmentProvider(db, siteId, providerData);

    const provider = {
      id: dbProvider.id,
      name: dbProvider.name,
      description: dbProvider.description,
      providerType: dbProvider.provider_type || 'manual',
      isDefault: dbProvider.is_default === 1,
      isActive: dbProvider.is_active === 1
    };

    return json(provider, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error creating fulfillment provider:', err);
    throw error(500, 'Failed to create fulfillment provider');
  }
};

// PUT update provider
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
      description?: string;
      providerType?: string;
      config?: Record<string, string>;
      isActive?: boolean;
    };

    if (!data.id) {
      throw error(400, 'Provider ID is required');
    }

    const updateData: {
      name?: string;
      description?: string;
      providerType?: 'manual' | 'printful';
      config?: Record<string, string>;
      isActive?: boolean;
    } = {};

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw error(400, 'Provider name cannot be empty');
      }
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim();
    }
    if (data.providerType !== undefined) {
      if (!isValidProviderType(data.providerType)) {
        throw error(400, 'Invalid provider type');
      }
      updateData.providerType = data.providerType as 'manual' | 'printful';
    }
    if (data.config !== undefined) {
      updateData.config = data.config;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const dbProvider = await updateFulfillmentProvider(db, siteId, data.id, updateData);

    if (!dbProvider) {
      throw error(404, 'Provider not found');
    }

    const provider = {
      id: dbProvider.id,
      name: dbProvider.name,
      description: dbProvider.description,
      providerType: dbProvider.provider_type || 'manual',
      isDefault: dbProvider.is_default === 1,
      isActive: dbProvider.is_active === 1
    };

    return json(provider);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error updating fulfillment provider:', err);
    throw error(500, 'Failed to update fulfillment provider');
  }
};

// DELETE provider
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const data = (await request.json()) as { id: string };

    if (!data.id) {
      throw error(400, 'Provider ID is required');
    }

    const deleted = await deleteFulfillmentProvider(db, siteId, data.id);

    if (!deleted) {
      throw error(404, 'Provider not found');
    }

    return json({ success: true });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error deleting fulfillment provider:', err);
    throw error(500, 'Failed to delete fulfillment provider');
  }
};
