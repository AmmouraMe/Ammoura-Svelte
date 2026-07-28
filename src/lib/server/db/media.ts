/**
 * Product Media repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export interface DBProductMedia {
  id: string;
  site_id: string;
  product_id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  filename: string;
  size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  display_order: number;
  created_at: number;
  updated_at: number;
}

export interface DBMediaLibraryItem {
  id: string;
  site_id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  filename: string;
  size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  used_count: number;
  created_at: number;
  updated_at: number;
}

export interface CreateProductMediaData {
  productId: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  displayOrder: number;
}

export interface CreateMediaLibraryItemData {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  /**
   * Provenance. `library` is the owner's own asset; `customer_design` is
   * artwork uploaded by a shopper on a storefront, which must never be
   * offered back as site content.
   */
  source?: 'library' | 'customer_design';
}

/**
 * Get all media for a product (scoped by site)
 */
export async function getProductMedia(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<DBProductMedia[]> {
  const result = await execute<DBProductMedia>(
    db,
    'SELECT * FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC',
    [siteId, productId]
  );
  return result.results || [];
}

/**
 * Get a single media item by ID (scoped by site)
 */
export async function getProductMediaById(
  db: D1Database,
  siteId: string,
  mediaId: string
): Promise<DBProductMedia | null> {
  return await executeOne<DBProductMedia>(
    db,
    'SELECT * FROM product_media WHERE id = ? AND site_id = ?',
    [mediaId, siteId]
  );
}

/**
 * Create a new product media item (scoped by site)
 */
export async function createProductMedia(
  db: D1Database,
  siteId: string,
  data: CreateProductMediaData
): Promise<DBProductMedia> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO product_media (id, site_id, product_id, type, url, thumbnail_url, filename, size, mime_type, width, height, duration, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.productId,
      data.type,
      data.url,
      data.thumbnailUrl || null,
      data.filename,
      data.size,
      data.mimeType,
      data.width || null,
      data.height || null,
      data.duration || null,
      data.displayOrder,
      timestamp,
      timestamp
    )
    .run();

  const media = await getProductMediaById(db, siteId, id);
  if (!media) {
    throw new Error('Failed to create product media');
  }
  return media;
}

/**
 * Update product media display order (scoped by site)
 */
export async function updateProductMediaOrder(
  db: D1Database,
  siteId: string,
  mediaId: string,
  displayOrder: number
): Promise<DBProductMedia | null> {
  const media = await getProductMediaById(db, siteId, mediaId);
  if (!media) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      'UPDATE product_media SET display_order = ?, updated_at = ? WHERE id = ? AND site_id = ?'
    )
    .bind(displayOrder, timestamp, mediaId, siteId)
    .run();

  return await getProductMediaById(db, siteId, mediaId);
}

/**
 * Delete a product media item (scoped by site)
 */
export async function deleteProductMedia(
  db: D1Database,
  siteId: string,
  mediaId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM product_media WHERE id = ? AND site_id = ?')
    .bind(mediaId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Get media library items for a site.
 *
 * Excludes customer-uploaded design artwork by default: it lives in the same
 * table but belongs to a shopper's order, not to the site, and must never be
 * offered back to the owner as site content. Pass `source: 'customer_design'`
 * to review it deliberately.
 */
export async function getMediaLibrary(
  db: D1Database,
  siteId: string,
  type?: 'image' | 'video',
  source: 'library' | 'customer_design' | 'all' = 'library'
): Promise<DBMediaLibraryItem[]> {
  let query = 'SELECT * FROM media_library WHERE site_id = ?';
  const params: unknown[] = [siteId];

  if (source !== 'all') {
    query += ' AND source = ?';
    params.push(source);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC';

  const result = await execute<DBMediaLibraryItem>(db, query, params);
  return result.results || [];
}

/**
 * Get a single media library item by ID (scoped by site)
 */
export async function getMediaLibraryItemById(
  db: D1Database,
  siteId: string,
  itemId: string
): Promise<DBMediaLibraryItem | null> {
  return await executeOne<DBMediaLibraryItem>(
    db,
    'SELECT * FROM media_library WHERE id = ? AND site_id = ?',
    [itemId, siteId]
  );
}

/**
 * Create a new media library item (scoped by site)
 */
export async function createMediaLibraryItem(
  db: D1Database,
  siteId: string,
  data: CreateMediaLibraryItemData
): Promise<DBMediaLibraryItem> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO media_library (id, site_id, type, url, thumbnail_url, filename, size, mime_type, width, height, duration, used_count, created_at, updated_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.type,
      data.url,
      data.thumbnailUrl || null,
      data.filename,
      data.size,
      data.mimeType,
      data.width || null,
      data.height || null,
      data.duration || null,
      0,
      timestamp,
      timestamp,
      data.source || 'library'
    )
    .run();

  const item = await getMediaLibraryItemById(db, siteId, id);
  if (!item) {
    throw new Error('Failed to create media library item');
  }
  return item;
}

/**
 * Increment the used count for a media library item
 */
export async function incrementMediaUsedCount(
  db: D1Database,
  siteId: string,
  itemId: string
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      'UPDATE media_library SET used_count = used_count + 1, updated_at = ? WHERE id = ? AND site_id = ?'
    )
    .bind(timestamp, itemId, siteId)
    .run();
}

/**
 * Decrement the used count for a media library item
 */
export async function decrementMediaUsedCount(
  db: D1Database,
  siteId: string,
  itemId: string
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      'UPDATE media_library SET used_count = CASE WHEN used_count > 0 THEN used_count - 1 ELSE 0 END, updated_at = ? WHERE id = ? AND site_id = ?'
    )
    .bind(timestamp, itemId, siteId)
    .run();
}

/**
 * Delete a media library item (scoped by site)
 */
export async function deleteMediaLibraryItem(
  db: D1Database,
  siteId: string,
  itemId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM media_library WHERE id = ? AND site_id = ?')
    .bind(itemId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Get the first media item URL for a product (by display_order)
 * Returns the URL of the first image/video or null if none exist
 */
export async function getFirstProductMediaUrl(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<string | null> {
  const media = await executeOne<{ url: string }>(
    db,
    'SELECT url FROM product_media WHERE site_id = ? AND product_id = ? ORDER BY display_order ASC LIMIT 1',
    [siteId, productId]
  );
  return media?.url || null;
}
