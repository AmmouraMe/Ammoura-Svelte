/**
 * Product customization fields repository with multi-tenant support.
 * Manages admin-defined input fields that customers fill in when ordering.
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  ProductCustomizationField,
  CreateCustomizationFieldData,
  UpdateCustomizationFieldData,
  MediaRequirements
} from '$lib/types/customization';

interface DBCustomizationField {
  id: string;
  site_id: string;
  product_id: string;
  name: string;
  field_type: string;
  options: string | null;
  placeholder: string | null;
  required: number;
  max_length: number | null;
  min_value: number | null;
  max_value: number | null;
  default_value: string | null;
  price_modifier: number;
  sort_order: number;
  media_requirements: string | null;
  created_at: number;
  updated_at: number;
}

function mapToField(row: DBCustomizationField): ProductCustomizationField {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    fieldType: row.field_type as ProductCustomizationField['fieldType'],
    options: row.options ? JSON.parse(row.options) : [],
    placeholder: row.placeholder,
    required: row.required === 1,
    maxLength: row.max_length,
    minValue: row.min_value,
    maxValue: row.max_value,
    defaultValue: row.default_value,
    priceModifier: row.price_modifier,
    sortOrder: row.sort_order,
    mediaRequirements: row.media_requirements
      ? (JSON.parse(row.media_requirements) as MediaRequirements)
      : null
  };
}

/**
 * Get all customization fields for a product (scoped by site)
 */
export async function getCustomizationFields(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<ProductCustomizationField[]> {
  const result = await execute<DBCustomizationField>(
    db,
    'SELECT * FROM product_customization_fields WHERE site_id = ? AND product_id = ? ORDER BY sort_order ASC',
    [siteId, productId]
  );
  return (result.results || []).map(mapToField);
}

/**
 * Get a single customization field by ID (scoped by site)
 */
export async function getCustomizationFieldById(
  db: D1Database,
  siteId: string,
  fieldId: string
): Promise<ProductCustomizationField | null> {
  const row = await executeOne<DBCustomizationField>(
    db,
    'SELECT * FROM product_customization_fields WHERE id = ? AND site_id = ?',
    [fieldId, siteId]
  );
  return row ? mapToField(row) : null;
}

/**
 * Create a new customization field (scoped by site)
 */
export async function createCustomizationField(
  db: D1Database,
  siteId: string,
  data: CreateCustomizationFieldData
): Promise<ProductCustomizationField> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const optionsJson = data.options ? JSON.stringify(data.options) : null;
  const mediaReqJson = data.mediaRequirements ? JSON.stringify(data.mediaRequirements) : null;

  await db
    .prepare(
      `INSERT INTO product_customization_fields
       (id, site_id, product_id, name, field_type, options, placeholder, required, max_length, min_value, max_value, default_value, price_modifier, sort_order, media_requirements, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.productId,
      data.name,
      data.fieldType,
      optionsJson,
      data.placeholder ?? null,
      data.required ? 1 : 0,
      data.maxLength ?? null,
      data.minValue ?? null,
      data.maxValue ?? null,
      data.defaultValue ?? null,
      data.priceModifier ?? 0,
      data.sortOrder ?? 0,
      mediaReqJson,
      timestamp,
      timestamp
    )
    .run();

  const field = await getCustomizationFieldById(db, siteId, id);
  if (!field) {
    throw new Error('Failed to create customization field');
  }
  return field;
}

/**
 * Update an existing customization field (scoped by site)
 */
export async function updateCustomizationField(
  db: D1Database,
  siteId: string,
  fieldId: string,
  data: UpdateCustomizationFieldData
): Promise<ProductCustomizationField | null> {
  const existing = await getCustomizationFieldById(db, siteId, fieldId);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.fieldType !== undefined) {
    updates.push('field_type = ?');
    params.push(data.fieldType);
  }
  if (data.options !== undefined) {
    updates.push('options = ?');
    params.push(JSON.stringify(data.options));
  }
  if (data.placeholder !== undefined) {
    updates.push('placeholder = ?');
    params.push(data.placeholder);
  }
  if (data.required !== undefined) {
    updates.push('required = ?');
    params.push(data.required ? 1 : 0);
  }
  if (data.maxLength !== undefined) {
    updates.push('max_length = ?');
    params.push(data.maxLength);
  }
  if (data.minValue !== undefined) {
    updates.push('min_value = ?');
    params.push(data.minValue);
  }
  if (data.maxValue !== undefined) {
    updates.push('max_value = ?');
    params.push(data.maxValue);
  }
  if (data.defaultValue !== undefined) {
    updates.push('default_value = ?');
    params.push(data.defaultValue);
  }
  if (data.priceModifier !== undefined) {
    updates.push('price_modifier = ?');
    params.push(data.priceModifier);
  }
  if (data.sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(data.sortOrder);
  }
  if (data.mediaRequirements !== undefined) {
    updates.push('media_requirements = ?');
    params.push(data.mediaRequirements ? JSON.stringify(data.mediaRequirements) : null);
  }

  if (updates.length === 0) {
    return existing;
  }

  const timestamp = getCurrentTimestamp();
  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(fieldId);
  params.push(siteId);

  await db
    .prepare(
      `UPDATE product_customization_fields SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`
    )
    .bind(...params)
    .run();

  return await getCustomizationFieldById(db, siteId, fieldId);
}

/**
 * Delete a customization field (scoped by site)
 */
export async function deleteCustomizationField(
  db: D1Database,
  siteId: string,
  fieldId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM product_customization_fields WHERE id = ? AND site_id = ?')
    .bind(fieldId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}
