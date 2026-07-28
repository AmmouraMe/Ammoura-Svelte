/**
 * Order-side persistence for product customization.
 *
 * Writing happens inline in `createOrder` (see orders.ts) so each artwork zone
 * and field value is bound to the exact order_items.id it belongs to — this
 * keeps two lines of the same product with different designs distinct, which a
 * resolve-by-product_id pass (like equipment uses) cannot do. This module owns
 * the input shapes, the INSERT-statement builders used by that batch, and the
 * read-back helpers for the admin order view.
 */

import { execute, generateId, getCurrentTimestamp } from './connection.js';

/** A customer's placed artwork on one zone, as submitted at checkout. */
export interface OrderItemCustomizationInput {
  zoneId: string;
  zoneName: string;
  /** Full-resolution media_library id, once the R2 upload path lands. */
  mediaId?: string | null;
  /** Directly-renderable image source (/api/media/... in prod, data: in dev). */
  imageUrl: string;
  originalFilename?: string | null;
  offsetXPercent: number;
  offsetYPercent: number;
  scale: number;
  /** Clockwise degrees, as approved by the customer on screen. */
  rotation?: number;
}

/** A customer's value for one personalization field, as submitted at checkout. */
export interface OrderItemFieldValueInput {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  value: string;
  priceModifier: number;
}

export interface DBOrderItemCustomization {
  id: string;
  order_item_id: string;
  zone_id: string;
  zone_name: string;
  media_id: string | null;
  image_url: string;
  original_filename: string | null;
  offset_x_percent: number;
  offset_y_percent: number;
  scale: number;
  rotation: number;
  created_at: number;
}

export interface DBOrderItemFieldValue {
  id: string;
  order_item_id: string;
  field_id: string;
  field_name: string;
  field_type: string;
  value: string;
  price_modifier: number;
  created_at: number;
}

interface BatchStatement {
  sql: string;
  params: unknown[];
}

/**
 * Build the INSERT statements that persist an order item's customizations and
 * field values, bound to a known order_items.id. Returned for inclusion in the
 * order-creation batch so everything commits atomically with the order.
 */
export function buildOrderItemCustomizationStatements(
  orderItemId: string,
  customizations: OrderItemCustomizationInput[] | undefined,
  fieldValues: OrderItemFieldValueInput[] | undefined
): BatchStatement[] {
  const statements: BatchStatement[] = [];
  const timestamp = getCurrentTimestamp();

  for (const c of customizations ?? []) {
    statements.push({
      sql: `INSERT INTO order_item_customizations
             (id, order_item_id, zone_id, zone_name, media_id, image_url, original_filename,
              offset_x_percent, offset_y_percent, scale, rotation, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        generateId(),
        orderItemId,
        c.zoneId,
        c.zoneName,
        c.mediaId ?? null,
        c.imageUrl,
        c.originalFilename ?? null,
        c.offsetXPercent,
        c.offsetYPercent,
        c.scale,
        c.rotation ?? 0,
        timestamp
      ]
    });
  }

  for (const v of fieldValues ?? []) {
    statements.push({
      sql: `INSERT INTO order_item_field_values
             (id, order_item_id, field_id, field_name, field_type, value, price_modifier, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        generateId(),
        orderItemId,
        v.fieldId,
        v.fieldName,
        v.fieldType,
        v.value,
        v.priceModifier,
        timestamp
      ]
    });
  }

  return statements;
}

/** Get all placed artwork for an order item. */
export async function getOrderItemCustomizations(
  db: D1Database,
  orderItemId: string
): Promise<DBOrderItemCustomization[]> {
  const result = await execute<DBOrderItemCustomization>(
    db,
    'SELECT * FROM order_item_customizations WHERE order_item_id = ? ORDER BY created_at ASC',
    [orderItemId]
  );
  return result.results || [];
}

/** Get all personalization field values for an order item. */
export async function getOrderItemFieldValues(
  db: D1Database,
  orderItemId: string
): Promise<DBOrderItemFieldValue[]> {
  const result = await execute<DBOrderItemFieldValue>(
    db,
    'SELECT * FROM order_item_field_values WHERE order_item_id = ? ORDER BY created_at ASC',
    [orderItemId]
  );
  return result.results || [];
}
