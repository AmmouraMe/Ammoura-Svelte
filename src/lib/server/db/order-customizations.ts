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
import type { DesignElement, Placement } from '../../utils/designElements.js';

/**
 * How much of a design we are willing to store.
 *
 * Checkout is necessarily public — shoppers are anonymous — so the design
 * arrives from a browser we do not control. These caps are the difference
 * between an order record and free unbounded storage.
 */
export const MAX_ELEMENTS_PER_ZONE = 40;
export const MAX_TEXT_LENGTH = 200;
const MAX_SRC_LENGTH = 2048;

function finite(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function cleanPlacement(place: unknown): Placement {
  const p = (place ?? {}) as Partial<Placement>;
  return {
    xIn: finite(p.xIn),
    yIn: finite(p.yIn),
    widthIn: finite(p.widthIn, 1),
    heightIn: finite(p.heightIn, 1),
    rotation: finite(p.rotation)
  };
}

/**
 * Narrow whatever the browser sent to the design we know how to print.
 *
 * Anything unrecognised is dropped rather than stored: a row that survives this
 * describes a design the print-file builder can actually render, so nothing
 * downstream has to re-validate it.
 */
export function sanitizeElements(input: unknown): DesignElement[] {
  if (!Array.isArray(input)) return [];
  const out: DesignElement[] = [];
  for (const raw of input.slice(0, MAX_ELEMENTS_PER_ZONE)) {
    const el = raw as Partial<DesignElement> & Record<string, unknown>;
    if (!el || typeof el.id !== 'string') continue;
    const base = {
      id: el.id.slice(0, 64),
      place: cleanPlacement(el.place),
      ...(el.flipped === true ? { flipped: true } : {})
    };
    if (el.kind === 'image') {
      const src = clean(el.src, MAX_SRC_LENGTH);
      if (!src) continue;
      out.push({
        ...base,
        kind: 'image',
        src,
        mediaId: typeof el.mediaId === 'string' ? el.mediaId.slice(0, 64) : null,
        name: clean(el.name, 255),
        naturalWidth: finite(el.naturalWidth),
        naturalHeight: finite(el.naturalHeight)
      });
    } else if (el.kind === 'text') {
      out.push({
        ...base,
        kind: 'text',
        text: clean(el.text, MAX_TEXT_LENGTH),
        color: clean(el.color, 32),
        font: clean(el.font, 255)
      });
    }
  }
  return out;
}

/** A customer's placed artwork on one zone, as submitted at checkout. */
export interface OrderItemCustomizationInput {
  zoneId: string;
  zoneName: string;
  /** The design itself: pictures and text, measured in inches on the product. */
  elements?: DesignElement[];
  /** Stable across revisions of one design, so a store can group them. */
  designId?: string | null;
  /** Which revision this order carries. First send is 1. */
  designRevision?: number;
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
  /** JSON array of `DesignElement`; NULL on rows written before migration 0102. */
  elements: string | null;
  design_id: string | null;
  design_revision: number;
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
    const elements = sanitizeElements(c.elements);
    statements.push({
      sql: `INSERT INTO order_item_customizations
             (id, order_item_id, zone_id, zone_name, elements, design_id, design_revision,
              media_id, image_url, original_filename,
              offset_x_percent, offset_y_percent, scale, rotation, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        generateId(),
        orderItemId,
        c.zoneId,
        c.zoneName,
        elements.length ? JSON.stringify(elements) : null,
        c.designId ?? null,
        Math.max(1, Math.round(finite(c.designRevision, 1))),
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

/**
 * The design on a stored row, whatever era it was written in.
 *
 * Rows from before migration 0102 have no `elements`; they are read back
 * through the same description they were written with, so an old order and a
 * new one present identically to the store owner.
 */
export function readElements(row: DBOrderItemCustomization): DesignElement[] {
  if (row.elements) {
    try {
      return sanitizeElements(JSON.parse(row.elements));
    } catch {
      // A row we cannot parse still has its legacy columns to fall back on.
    }
  }
  if (!row.image_url) return [];
  return [
    {
      kind: 'image',
      id: 'el-1',
      src: row.image_url,
      mediaId: row.media_id,
      name: row.original_filename ?? '',
      naturalWidth: 0,
      naturalHeight: 0,
      // Legacy rows describe placement against the zone box, not in inches;
      // the caller re-reads them with `legacyToPlacement` once it knows the
      // print area. Until then this records only the rotation, which is
      // unit-free.
      place: { xIn: 0, yIn: 0, widthIn: 0, heightIn: 0, rotation: row.rotation ?? 0 }
    }
  ];
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
