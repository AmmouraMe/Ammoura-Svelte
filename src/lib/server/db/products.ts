/**
 * Products repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export interface DBProduct {
  id: string;
  site_id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  type: 'physical' | 'service' | 'digital';
  tags: string; // JSON array
  template_id: string | null;
  fulfillment_mode: string;
  created_at: number;
  updated_at: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  type: 'physical' | 'service' | 'digital';
  tags: string[];
  /** Curated template this product was authored from, if any. */
  templateId?: string | null;
  /** 'manual' (owner prints) | 'printful' (auto-fulfilled). */
  fulfillmentMode?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  category?: string;
  stock?: number;
  type?: 'physical' | 'service' | 'digital';
  tags?: string[];
  fulfillmentMode?: string;
}

/**
 * Get a product by ID (scoped by site)
 */
export async function getProductById(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<DBProduct | null> {
  return await executeOne<DBProduct>(db, 'SELECT * FROM products WHERE id = ? AND site_id = ?', [
    productId,
    siteId
  ]);
}

/**
 * Get all products for a site
 */
export async function getAllProducts(db: D1Database, siteId: string): Promise<DBProduct[]> {
  const result = await execute<DBProduct>(
    db,
    'SELECT * FROM products WHERE site_id = ? ORDER BY created_at DESC',
    [siteId]
  );
  return result.results || [];
}

/**
 * Get products by category (scoped by site)
 */
export async function getProductsByCategory(
  db: D1Database,
  siteId: string,
  category: string
): Promise<DBProduct[]> {
  const result = await execute<DBProduct>(
    db,
    'SELECT * FROM products WHERE site_id = ? AND category = ? ORDER BY created_at DESC',
    [siteId, category]
  );
  return result.results || [];
}

/**
 * Get all categories for a site
 */
export async function getCategories(db: D1Database, siteId: string): Promise<string[]> {
  const result = await execute<{ category: string }>(
    db,
    'SELECT DISTINCT category FROM products WHERE site_id = ? ORDER BY category',
    [siteId]
  );
  return (result.results || []).map((r) => r.category);
}

/**
 * Create a new product (scoped by site)
 */
export async function createProduct(
  db: D1Database,
  siteId: string,
  data: CreateProductData
): Promise<DBProduct> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const tagsJson = JSON.stringify(data.tags);

  await db
    .prepare(
      `INSERT INTO products (id, site_id, name, description, price, image, category, stock, type, tags, template_id, fulfillment_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.name,
      data.description,
      data.price,
      data.image,
      data.category,
      data.stock,
      data.type,
      tagsJson,
      data.templateId ?? null,
      data.fulfillmentMode ?? 'manual',
      timestamp,
      timestamp
    )
    .run();

  const product = await getProductById(db, siteId, id);
  if (!product) {
    throw new Error('Failed to create product');
  }
  return product;
}

/**
 * Update a product (scoped by site)
 */
export async function updateProduct(
  db: D1Database,
  siteId: string,
  productId: string,
  data: UpdateProductData
): Promise<DBProduct | null> {
  const product = await getProductById(db, siteId, productId);
  if (!product) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.price !== undefined) {
    updates.push('price = ?');
    params.push(data.price);
  }
  if (data.image !== undefined) {
    updates.push('image = ?');
    params.push(data.image);
  }
  if (data.category !== undefined) {
    updates.push('category = ?');
    params.push(data.category);
  }
  if (data.stock !== undefined) {
    updates.push('stock = ?');
    params.push(data.stock);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    params.push(data.type);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(data.tags));
  }
  if (data.fulfillmentMode !== undefined) {
    updates.push('fulfillment_mode = ?');
    params.push(data.fulfillmentMode);
  }

  if (updates.length === 0) {
    return product;
  }

  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(productId);
  params.push(siteId);

  await db
    .prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getProductById(db, siteId, productId);
}

/**
 * Delete a product (scoped by site)
 */
export async function deleteProduct(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM products WHERE id = ? AND site_id = ?')
    .bind(productId, siteId)
    .run();

  // GC content translations for the product (best-effort)
  try {
    const { deleteTranslationsForEntity } = await import('../i18n/content-translations.js');
    await deleteTranslationsForEntity(db, siteId, 'product', productId);
  } catch (error) {
    console.error('Failed to GC product translations:', error);
  }

  return (result.meta?.changes || 0) > 0;
}

/**
 * Update product stock (scoped by site)
 */
export async function updateProductStock(
  db: D1Database,
  siteId: string,
  productId: string,
  stockChange: number
): Promise<DBProduct | null> {
  const product = await getProductById(db, siteId, productId);
  if (!product) {
    return null;
  }

  const newStock = product.stock + stockChange;
  if (newStock < 0) {
    throw new Error('Insufficient stock');
  }

  const timestamp = getCurrentTimestamp();
  await db
    .prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ? AND site_id = ?')
    .bind(newStock, timestamp, productId, siteId)
    .run();

  return await getProductById(db, siteId, productId);
}

/**
 * Calculate total stock from fulfillment options
 * Returns the sum of stock quantities from all fulfillment options for a product
 */
export async function calculateProductStock(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<number> {
  const result = await executeOne<{ total: number }>(
    db,
    'SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_fulfillment_options WHERE site_id = ? AND product_id = ?',
    [siteId, productId]
  );
  return result?.total || 0;
}

/**
 * Sync product image field with first media item
 * Updates the product's image field to match the first product media item (by display_order)
 * If no media items exist, keeps the current image
 */
export async function syncProductImageFromMedia(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<void> {
  // Get the first media item URL
  const firstMedia = await executeOne<{ url: string }>(
    db,
    'SELECT url FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC LIMIT 1',
    [siteId, productId]
  );

  // Only update if we found media
  if (firstMedia?.url) {
    const timestamp = getCurrentTimestamp();
    await db
      .prepare('UPDATE products SET image = ?, updated_at = ? WHERE id = ? AND site_id = ?')
      .bind(firstMedia.url, timestamp, productId, siteId)
      .run();
  }
}
