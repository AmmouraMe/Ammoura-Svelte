/**
 * Product customization zones repository with multi-tenant support.
 * All queries are scoped by site_id.
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  ProductCustomizationZone,
  CreateCustomizationZoneData,
  UpdateCustomizationZoneData
} from '$lib/types/customization';

interface DBCustomizationZone {
  id: string;
  site_id: string;
  product_id: string;
  media_id: string | null;
  name: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  max_file_size: number;
  allowed_types: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

function mapToZone(row: DBCustomizationZone): ProductCustomizationZone {
  return {
    id: row.id,
    productId: row.product_id,
    mediaId: row.media_id,
    name: row.name,
    xPercent: row.x_percent,
    yPercent: row.y_percent,
    widthPercent: row.width_percent,
    heightPercent: row.height_percent,
    maxFileSize: row.max_file_size,
    allowedTypes: JSON.parse(row.allowed_types || '[]') as string[],
    sortOrder: row.sort_order
  };
}

/**
 * Get all customization zones for a product
 */
export async function getCustomizationZones(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<ProductCustomizationZone[]> {
  const result = await execute<DBCustomizationZone>(
    db,
    'SELECT * FROM product_customization_zones WHERE site_id = ? AND product_id = ? ORDER BY sort_order ASC',
    [siteId, productId]
  );
  return (result.results || []).map(mapToZone);
}

/**
 * Get a customization zone by ID
 */
export async function getCustomizationZoneById(
  db: D1Database,
  siteId: string,
  zoneId: string
): Promise<ProductCustomizationZone | null> {
  const row = await executeOne<DBCustomizationZone>(
    db,
    'SELECT * FROM product_customization_zones WHERE id = ? AND site_id = ?',
    [zoneId, siteId]
  );
  return row ? mapToZone(row) : null;
}

const DEFAULT_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const DEFAULT_MAX_FILE_SIZE = 10485760; // 10MB

/**
 * Create a new customization zone
 */
export async function createCustomizationZone(
  db: D1Database,
  siteId: string,
  data: CreateCustomizationZoneData
): Promise<ProductCustomizationZone> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const allowedTypes = JSON.stringify(data.allowedTypes || DEFAULT_ALLOWED_TYPES);

  await db
    .prepare(
      `INSERT INTO product_customization_zones
       (id, site_id, product_id, media_id, name, x_percent, y_percent, width_percent, height_percent, max_file_size, allowed_types, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.productId,
      data.mediaId ?? null,
      data.name,
      data.xPercent,
      data.yPercent,
      data.widthPercent,
      data.heightPercent,
      data.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
      allowedTypes,
      data.sortOrder ?? 0,
      timestamp,
      timestamp
    )
    .run();

  const zone = await getCustomizationZoneById(db, siteId, id);
  if (!zone) {
    throw new Error('Failed to create customization zone');
  }
  return zone;
}

/**
 * Update an existing customization zone
 */
export async function updateCustomizationZone(
  db: D1Database,
  siteId: string,
  zoneId: string,
  data: UpdateCustomizationZoneData
): Promise<ProductCustomizationZone | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    sets.push('name = ?');
    params.push(data.name);
  }
  if (data.mediaId !== undefined) {
    sets.push('media_id = ?');
    params.push(data.mediaId);
  }
  if (data.xPercent !== undefined) {
    sets.push('x_percent = ?');
    params.push(data.xPercent);
  }
  if (data.yPercent !== undefined) {
    sets.push('y_percent = ?');
    params.push(data.yPercent);
  }
  if (data.widthPercent !== undefined) {
    sets.push('width_percent = ?');
    params.push(data.widthPercent);
  }
  if (data.heightPercent !== undefined) {
    sets.push('height_percent = ?');
    params.push(data.heightPercent);
  }
  if (data.maxFileSize !== undefined) {
    sets.push('max_file_size = ?');
    params.push(data.maxFileSize);
  }
  if (data.allowedTypes !== undefined) {
    sets.push('allowed_types = ?');
    params.push(JSON.stringify(data.allowedTypes));
  }
  if (data.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    params.push(data.sortOrder);
  }

  if (sets.length === 0) {
    return getCustomizationZoneById(db, siteId, zoneId);
  }

  sets.push('updated_at = ?');
  params.push(getCurrentTimestamp());
  params.push(zoneId, siteId);

  await db
    .prepare(
      `UPDATE product_customization_zones SET ${sets.join(', ')} WHERE id = ? AND site_id = ?`
    )
    .bind(...params)
    .run();

  return getCustomizationZoneById(db, siteId, zoneId);
}

/**
 * Delete a customization zone
 */
export async function deleteCustomizationZone(
  db: D1Database,
  siteId: string,
  zoneId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM product_customization_zones WHERE id = ? AND site_id = ?')
    .bind(zoneId, siteId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
