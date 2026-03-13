/**
 * Fulfillment providers repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  DBFulfillmentProvider,
  CreateFulfillmentProviderData,
  UpdateFulfillmentProviderData,
  ProductFulfillmentOption,
  DBProductFulfillmentOption
} from '$lib/types/fulfillment';

/**
 * Get all fulfillment providers for a site
 */
export async function getAllFulfillmentProviders(
  db: D1Database,
  siteId: string
): Promise<DBFulfillmentProvider[]> {
  const result = await execute<DBFulfillmentProvider>(
    db,
    'SELECT * FROM fulfillment_providers WHERE site_id = ? ORDER BY is_default DESC, name ASC',
    [siteId]
  );
  return result.results || [];
}

/**
 * Get a fulfillment provider by ID (scoped by site)
 */
export async function getFulfillmentProviderById(
  db: D1Database,
  siteId: string,
  providerId: string
): Promise<DBFulfillmentProvider | null> {
  return await executeOne<DBFulfillmentProvider>(
    db,
    'SELECT * FROM fulfillment_providers WHERE id = ? AND site_id = ?',
    [providerId, siteId]
  );
}

/**
 * Get all fulfillment providers of a specific type for a site
 */
export async function getFulfillmentProvidersByType(
  db: D1Database,
  siteId: string,
  providerType: string
): Promise<DBFulfillmentProvider[]> {
  const result = await execute<DBFulfillmentProvider>(
    db,
    'SELECT * FROM fulfillment_providers WHERE site_id = ? AND provider_type = ? ORDER BY name ASC',
    [siteId, providerType]
  );
  return result.results || [];
}

/**
 * Create a new fulfillment provider (scoped by site)
 */
export async function createFulfillmentProvider(
  db: D1Database,
  siteId: string,
  data: CreateFulfillmentProviderData
): Promise<DBFulfillmentProvider> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const configJson = data.config ? JSON.stringify(data.config) : null;

  await db
    .prepare(
      `INSERT INTO fulfillment_providers (id, site_id, name, description, provider_type, config, is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.name,
      data.description || null,
      data.providerType || 'manual',
      configJson,
      0, // Never default for user-created providers
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      timestamp,
      timestamp
    )
    .run();

  const provider = await getFulfillmentProviderById(db, siteId, id);
  if (!provider) {
    throw new Error('Failed to create fulfillment provider');
  }
  return provider;
}

/**
 * Update a fulfillment provider (scoped by site)
 */
export async function updateFulfillmentProvider(
  db: D1Database,
  siteId: string,
  providerId: string,
  data: UpdateFulfillmentProviderData
): Promise<DBFulfillmentProvider | null> {
  const provider = await getFulfillmentProviderById(db, siteId, providerId);
  if (!provider) {
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
  if (data.providerType !== undefined) {
    updates.push('provider_type = ?');
    params.push(data.providerType);
  }
  if (data.config !== undefined) {
    updates.push('config = ?');
    params.push(JSON.stringify(data.config));
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(data.isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return provider;
  }

  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(providerId);
  params.push(siteId);

  await db
    .prepare(`UPDATE fulfillment_providers SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getFulfillmentProviderById(db, siteId, providerId);
}

/**
 * Delete a fulfillment provider (scoped by site)
 */
export async function deleteFulfillmentProvider(
  db: D1Database,
  siteId: string,
  providerId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM fulfillment_providers WHERE id = ? AND site_id = ?')
    .bind(providerId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Get fulfillment options for a product
 */
export async function getProductFulfillmentOptions(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<ProductFulfillmentOption[]> {
  const result = await execute<DBProductFulfillmentOption & { provider_name: string }>(
    db,
    `SELECT pfo.*, fp.name as provider_name
     FROM product_fulfillment_options pfo
     JOIN fulfillment_providers fp ON pfo.provider_id = fp.id
     WHERE pfo.site_id = ? AND pfo.product_id = ?
     ORDER BY pfo.sort_order ASC, fp.is_default DESC, fp.name ASC`,
    [siteId, productId]
  );

  return (result.results || []).map((option) => ({
    providerId: option.provider_id,
    providerName: option.provider_name,
    cost: option.cost,
    stockQuantity: option.stock_quantity || 0,
    sortOrder: option.sort_order
  }));
}

/**
 * Set fulfillment options for a product (replaces all existing options)
 */
export async function setProductFulfillmentOptions(
  db: D1Database,
  siteId: string,
  productId: string,
  options: Array<{ providerId: string; cost: number; stockQuantity?: number; sortOrder?: number }>
): Promise<void> {
  // Delete existing options
  await db
    .prepare('DELETE FROM product_fulfillment_options WHERE product_id = ? AND site_id = ?')
    .bind(productId, siteId)
    .run();

  // Insert new options
  const timestamp = getCurrentTimestamp();
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const id = generateId();
    const sortOrder = option.sortOrder !== undefined ? option.sortOrder : i;
    await db
      .prepare(
        `INSERT INTO product_fulfillment_options (id, site_id, product_id, provider_id, cost, stock_quantity, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        siteId,
        productId,
        option.providerId,
        option.cost,
        option.stockQuantity || 0,
        sortOrder,
        timestamp,
        timestamp
      )
      .run();
  }
}
