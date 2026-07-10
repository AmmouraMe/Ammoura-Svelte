/**
 * GET /api/admin/printful/store-products?providerId=xxx
 * Returns the sync products from the user's Printful store.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, execute } from '$lib/server/db/connection';
import {
  getFulfillmentProviderById,
  getDecryptedProviderConfig
} from '$lib/server/db/fulfillment-providers';
import { PrintfulClient } from '$lib/server/integrations/printful/client';

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const providerId = url.searchParams.get('providerId');
  if (!providerId) {
    throw error(400, 'providerId is required');
  }

  const encryptionKey = platform?.env?.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const provider = await getFulfillmentProviderById(db, siteId, providerId);
  if (!provider) {
    throw error(404, 'Provider not found');
  }

  const config = await getDecryptedProviderConfig(provider, encryptionKey);
  if (!config.apiKey) {
    throw error(400, 'Printful API key not configured');
  }

  const client = new PrintfulClient({ apiKey: config.apiKey });
  const products = await client.getStoreProducts();

  // Look up which of these are already imported
  const importedResult = await execute<{ printful_product_id: number }>(
    db,
    'SELECT printful_product_id FROM printful_products WHERE site_id = ?',
    [siteId]
  );
  const importedIds = new Set((importedResult.results || []).map((r) => r.printful_product_id));

  return json({
    products: products.map((p) => ({ ...p, imported: importedIds.has(p.id) }))
  });
};
