/**
 * Product variants repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export interface DBProductVariant {
  id: string;
  site_id: string;
  product_id: string;
  label: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  price: number;
  stock_quantity: number | null;
  sort_order: number;
  printful_sync_variant_id: number | null;
  printful_variant_id: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreateProductVariantData {
  productId: string;
  label: string;
  size?: string;
  color?: string;
  sku?: string;
  price: number;
  stockQuantity?: number;
  sortOrder?: number;
  printfulSyncVariantId?: number;
  printfulVariantId?: number;
}

/**
 * Get all variants for a product (scoped by site), in display order
 */
export async function getProductVariants(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<DBProductVariant[]> {
  const result = await execute<DBProductVariant>(
    db,
    'SELECT * FROM product_variants WHERE site_id = ? AND product_id = ? ORDER BY sort_order ASC',
    [siteId, productId]
  );
  return result.results || [];
}

/**
 * Get a single variant by ID (scoped by site)
 */
export async function getProductVariantById(
  db: D1Database,
  siteId: string,
  variantId: string
): Promise<DBProductVariant | null> {
  return executeOne<DBProductVariant>(
    db,
    'SELECT * FROM product_variants WHERE id = ? AND site_id = ?',
    [variantId, siteId]
  );
}

/**
 * Replace all variants for a product (delete existing, insert the given
 * set) — mirrors setProductFulfillmentOptions' replace-all semantics, since
 * variants are always edited as a whole set from the import/admin UI.
 */
export async function setProductVariants(
  db: D1Database,
  siteId: string,
  productId: string,
  variants: Array<Omit<CreateProductVariantData, 'productId'>>
): Promise<DBProductVariant[]> {
  await db
    .prepare('DELETE FROM product_variants WHERE product_id = ? AND site_id = ?')
    .bind(productId, siteId)
    .run();

  const timestamp = getCurrentTimestamp();
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    await db
      .prepare(
        `INSERT INTO product_variants
           (id, site_id, product_id, label, size, color, sku, price, stock_quantity, sort_order,
            printful_sync_variant_id, printful_variant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        siteId,
        productId,
        variant.label,
        variant.size || null,
        variant.color || null,
        variant.sku || null,
        variant.price,
        variant.stockQuantity ?? null,
        variant.sortOrder ?? i,
        variant.printfulSyncVariantId ?? null,
        variant.printfulVariantId ?? null,
        timestamp,
        timestamp
      )
      .run();
  }

  return getProductVariants(db, siteId, productId);
}

/**
 * Delete all variants for a product (scoped by site)
 */
export async function deleteProductVariants(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM product_variants WHERE product_id = ? AND site_id = ?')
    .bind(productId, siteId)
    .run();
}
