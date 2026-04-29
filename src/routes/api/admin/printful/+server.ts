/**
 * API endpoint for Printful integration
 * POST /api/admin/printful/sync - Sync products from Printful
 * GET /api/admin/printful/status - Get Printful integration status
 * POST /api/admin/printful/test - Test Printful API connection
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getFulfillmentProviderById } from '$lib/server/db/fulfillment-providers';
import { PrintfulService } from '$lib/server/integrations/printful/service';
import { storePrintfulProduct } from '$lib/server/integrations/printful/db';

/**
 * POST /api/admin/printful/sync
 * Sync products from Printful to store
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    const body = (await request.json()) as { providerId?: string };
    const providerId = body.providerId;

    if (!providerId) {
      throw error(400, 'Provider ID is required');
    }

    // Get provider
    const provider = await getFulfillmentProviderById(db, siteId, providerId);
    if (!provider) {
      throw error(404, 'Provider not found');
    }

    if (provider.provider_type !== 'printful') {
      throw error(400, 'Provider is not Printful type');
    }

    // Initialize service
    const service = new PrintfulService(db, provider);

    // Sync products
    const products = await service.syncProducts();

    // Store product data
    for (const product of products) {
      await storePrintfulProduct(
        db,
        siteId,
        `printful-${product.id}`, // Temporary mapping
        product.id,
        JSON.stringify(product)
      );
    }

    return json(
      {
        success: true,
        message: `Synced ${products.length} products from Printful`,
        productsCount: products.length
      },
      { status: 200 }
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Printful sync error:', err);
    throw error(500, 'Failed to sync Printful products');
  }
};

/**
 * GET /api/admin/printful/status
 * Get Printful integration status
 */
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';
    const providerId = url.searchParams.get('providerId');

    if (!providerId) {
      throw error(400, 'Provider ID is required');
    }

    // Get provider
    const provider = await getFulfillmentProviderById(db, siteId, providerId);
    if (!provider) {
      throw error(404, 'Provider not found');
    }

    if (provider.provider_type !== 'printful') {
      throw error(400, 'Provider is not Printful type');
    }

    // Initialize service
    const service = new PrintfulService(db, provider);

    // Get store info to verify connection
    try {
      const store = await service['client'].getStore();
      return json({
        success: true,
        connected: true,
        store: store
      });
    } catch (_connectionError) {
      return json(
        {
          success: false,
          connected: false,
          error: 'Failed to connect to Printful API'
        },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Printful status check error:', err);
    throw error(500, 'Failed to check Printful status');
  }
};
