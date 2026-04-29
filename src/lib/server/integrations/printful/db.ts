/**
 * Printful database operations
 * Stores Printful product and order data
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from '$lib/server/db/connection';

/**
 * Store Printful product sync info
 */
export async function storePrintfulProduct(
  db: D1Database,
  siteId: string,
  productId: string, // Our product ID
  printfulProductId: number,
  printfulData: string // JSON string of full Printful product data
): Promise<void> {
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO printful_products (id, site_id, product_id, printful_product_id, printful_data, synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(site_id, printful_product_id) DO UPDATE SET
         product_id = excluded.product_id,
         printful_data = excluded.printful_data,
         synced_at = excluded.synced_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      generateId(),
      siteId,
      productId,
      printfulProductId,
      printfulData,
      timestamp,
      timestamp,
      timestamp
    )
    .run();
}

/**
 * Get Printful product sync info
 */
export async function getPrintfulProduct(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<Record<string, unknown> | null> {
  return executeOne(db, 'SELECT * FROM printful_products WHERE site_id = ? AND product_id = ?', [
    siteId,
    productId
  ]);
}

/**
 * Get Printful product by Printful ID
 */
export async function getPrintfulProductByPrintfulId(
  db: D1Database,
  siteId: string,
  printfulProductId: number
): Promise<Record<string, unknown> | null> {
  return executeOne(
    db,
    'SELECT * FROM printful_products WHERE site_id = ? AND printful_product_id = ?',
    [siteId, printfulProductId]
  );
}

/**
 * Store Printful order
 */
export async function storePrintfulOrder(
  db: D1Database,
  siteId: string,
  orderId: string, // Our order ID
  printfulOrderId: number,
  printfulData: string // JSON string of full Printful order data
): Promise<void> {
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO printful_orders (id, site_id, order_id, printful_order_id, printful_data, status, synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(site_id, order_id) DO UPDATE SET
         printful_order_id = excluded.printful_order_id,
         printful_data = excluded.printful_data,
         status = excluded.status,
         synced_at = excluded.synced_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      generateId(),
      siteId,
      orderId,
      printfulOrderId,
      printfulData,
      'pending',
      timestamp,
      timestamp,
      timestamp
    )
    .run();
}

/**
 * Get Printful order
 */
export async function getPrintfulOrder(
  db: D1Database,
  siteId: string,
  orderId: string
): Promise<Record<string, unknown> | null> {
  return executeOne(db, 'SELECT * FROM printful_orders WHERE site_id = ? AND order_id = ?', [
    siteId,
    orderId
  ]);
}

/**
 * Update Printful order status
 */
export async function updatePrintfulOrderStatus(
  db: D1Database,
  siteId: string,
  orderId: string,
  status: string,
  printfulData: string
): Promise<void> {
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      'UPDATE printful_orders SET status = ?, printful_data = ?, synced_at = ?, updated_at = ? WHERE site_id = ? AND order_id = ?'
    )
    .bind(status, printfulData, timestamp, timestamp, siteId, orderId)
    .run();
}

/**
 * Get all Printful orders for a site
 */
export async function getAllPrintfulOrders(
  db: D1Database,
  siteId: string
): Promise<Record<string, unknown>[]> {
  const result = await execute(
    db,
    'SELECT * FROM printful_orders WHERE site_id = ? ORDER BY created_at DESC',
    [siteId]
  );
  return (result.results as Record<string, unknown>[]) || [];
}
