/**
 * POST /api/admin/printful/import
 * Imports selected Printful sync products as Ammoura products, pulling each
 * product's real ordering-ready sync variants (size/color, Printful's own
 * retail price, and the sync_variant_id needed to place a real order later).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';
import {
  getFulfillmentProviderById,
  getDecryptedProviderConfig
} from '$lib/server/db/fulfillment-providers';
import { createProduct } from '$lib/server/db/products';
import { setProductVariants } from '$lib/server/db/product-variants';
import { storePrintfulProduct } from '$lib/server/integrations/printful/db';
import { PrintfulClient } from '$lib/server/integrations/printful/client';

interface ImportProductInput {
  printfulId: number;
  name: string;
  thumbnailUrl: string | null;
  /** Percent markup applied over each variant's Printful retail price (0 = sell at Printful's price). */
  markupPercent?: number;
}

function applyMarkup(retailPrice: string, markupPercent: number): number {
  const base = parseFloat(retailPrice) || 0;
  return Math.round(base * (1 + markupPercent / 100) * 100) / 100;
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!platform?.env?.DB) {
    throw error(503, 'Database not available');
  }

  const encryptionKey = platform.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw error(500, 'Encryption key not configured');
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

  const config = await getDecryptedProviderConfig(provider, encryptionKey);
  if (!config.apiKey) {
    throw error(400, 'Printful API key not configured');
  }
  const client = new PrintfulClient({ apiKey: config.apiKey });

  const imported: string[] = [];
  const skipped: number[] = [];

  for (const item of body.products) {
    try {
      const markupPercent = item.markupPercent || 0;
      const detail = await client.getStoreProduct(item.printfulId);
      const syncVariants = detail.sync_variants || [];

      if (syncVariants.length === 0) {
        skipped.push(item.printfulId);
        continue;
      }

      const variantPrices = syncVariants.map((v) => applyMarkup(v.retail_price, markupPercent));
      const startingPrice = Math.min(...variantPrices);

      const product = await createProduct(db, siteId, {
        name: item.name,
        description: 'Printed and shipped by Printful',
        price: startingPrice,
        image: item.thumbnailUrl || '',
        category: 'printful',
        stock: 0,
        type: 'physical',
        tags: ['printful', 'print-on-demand']
      });

      await setProductVariants(
        db,
        siteId,
        product.id,
        syncVariants.map((variant, i) => ({
          label: variant.name,
          size: variant.size,
          color: variant.color,
          sku: variant.sku || undefined,
          price: variantPrices[i],
          printfulSyncVariantId: variant.id,
          printfulVariantId: variant.variant_id,
          sortOrder: i
        }))
      );

      await storePrintfulProduct(
        db,
        siteId,
        product.id,
        item.printfulId,
        JSON.stringify({ id: item.printfulId, name: item.name, thumbnail_url: item.thumbnailUrl })
      );

      imported.push(product.id);
    } catch (err) {
      console.error(`Failed to import Printful product ${item.printfulId}:`, err);
      skipped.push(item.printfulId);
    }
  }

  return json({ imported: imported.length, skipped: skipped.length, productIds: imported });
};
