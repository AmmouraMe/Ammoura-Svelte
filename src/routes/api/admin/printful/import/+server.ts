/**
 * POST /api/admin/printful/import
 * Imports selected Printful sync products as Ammoura products.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getFulfillmentProviderById } from '$lib/server/db/fulfillment-providers';
import { createProduct } from '$lib/server/db/products';
import { storePrintfulProduct } from '$lib/server/integrations/printful/db';

interface ImportProductInput {
  printfulId: number;
  name: string;
  price: number;
  thumbnailUrl: string | null;
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const body = (await request.json()) as {
    providerId?: string;
    products?: ImportProductInput[];
  };

  if (!body.providerId) {
    throw error(400, 'providerId is required');
  }
  if (!body.products?.length) {
    throw error(400, 'products array is required');
  }

  const db = getDB(platform);
  const siteId = locals.siteId || 'default-site';

  const provider = await getFulfillmentProviderById(db, siteId, body.providerId);
  if (!provider || provider.provider_type !== 'printful') {
    throw error(404, 'Printful provider not found');
  }

  const imported: string[] = [];
  const skipped: number[] = [];

  for (const item of body.products) {
    try {
      const product = await createProduct(db, siteId, {
        name: item.name,
        description: 'Printed and shipped by Printful',
        price: item.price,
        image: item.thumbnailUrl || '',
        category: 'printful',
        stock: 0,
        type: 'physical',
        tags: ['printful', 'print-on-demand']
      });

      await storePrintfulProduct(
        db,
        siteId,
        product.id,
        item.printfulId,
        JSON.stringify({ id: item.printfulId, name: item.name, thumbnail_url: item.thumbnailUrl })
      );

      imported.push(product.id);
    } catch {
      skipped.push(item.printfulId);
    }
  }

  return json({ imported: imported.length, skipped: skipped.length, productIds: imported });
};
