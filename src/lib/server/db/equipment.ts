/**
 * Equipment repository with multi-tenant support.
 * Manages equipment definitions, fields, product associations,
 * and order item equipment values.
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  Equipment,
  EquipmentField,
  EquipmentWithFields,
  ProductEquipment,
  CreateEquipmentData,
  UpdateEquipmentData,
  CreateEquipmentFieldData,
  UpdateEquipmentFieldData,
  DBEquipment,
  DBEquipmentField,
  DBProductEquipment,
  DBOrderItemEquipmentValue
} from '$lib/types/equipment';

// --- Mapping functions ---

function mapToEquipment(row: DBEquipment): Equipment {
  return {
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapToEquipmentField(row: DBEquipmentField): EquipmentField {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    name: row.name,
    fieldType: row.field_type as EquipmentField['fieldType'],
    options: row.options ? JSON.parse(row.options) : [],
    placeholder: row.placeholder,
    required: row.required === 1,
    maxLength: row.max_length,
    minValue: row.min_value,
    maxValue: row.max_value,
    defaultValue: row.default_value,
    sortOrder: row.sort_order,
    mediaRequirements: row.media_requirements ? JSON.parse(row.media_requirements) : null
  };
}

function mapToProductEquipment(row: DBProductEquipment): ProductEquipment {
  return {
    id: row.id,
    productId: row.product_id,
    equipmentId: row.equipment_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

// --- Equipment CRUD ---

/**
 * Get all equipment for a site
 */
export async function getAllEquipment(db: D1Database, siteId: string): Promise<Equipment[]> {
  const result = await execute<DBEquipment>(
    db,
    'SELECT * FROM equipment WHERE site_id = ? ORDER BY name ASC',
    [siteId]
  );
  return (result.results || []).map(mapToEquipment);
}

/**
 * Get a single equipment by ID (scoped by site)
 */
export async function getEquipmentById(
  db: D1Database,
  siteId: string,
  equipmentId: string
): Promise<Equipment | null> {
  const row = await executeOne<DBEquipment>(
    db,
    'SELECT * FROM equipment WHERE id = ? AND site_id = ?',
    [equipmentId, siteId]
  );
  return row ? mapToEquipment(row) : null;
}

/**
 * Create a new equipment (scoped by site)
 */
export async function createEquipment(
  db: D1Database,
  siteId: string,
  data: CreateEquipmentData
): Promise<Equipment> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO equipment (id, site_id, name, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.name,
      data.description ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      timestamp,
      timestamp
    )
    .run();

  const equipment = await getEquipmentById(db, siteId, id);
  if (!equipment) {
    throw new Error('Failed to create equipment');
  }
  return equipment;
}

/**
 * Update an existing equipment (scoped by site)
 */
export async function updateEquipment(
  db: D1Database,
  siteId: string,
  equipmentId: string,
  data: UpdateEquipmentData
): Promise<Equipment | null> {
  const existing = await getEquipmentById(db, siteId, equipmentId);
  if (!existing) {
    return null;
  }

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
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(data.isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return existing;
  }

  const timestamp = getCurrentTimestamp();
  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(equipmentId);
  params.push(siteId);

  await db
    .prepare(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getEquipmentById(db, siteId, equipmentId);
}

/**
 * Delete an equipment (scoped by site)
 */
export async function deleteEquipment(
  db: D1Database,
  siteId: string,
  equipmentId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM equipment WHERE id = ? AND site_id = ?')
    .bind(equipmentId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

// --- Equipment Fields CRUD ---

/**
 * Get all fields for an equipment (scoped by site)
 */
export async function getEquipmentFields(
  db: D1Database,
  siteId: string,
  equipmentId: string
): Promise<EquipmentField[]> {
  const result = await execute<DBEquipmentField>(
    db,
    'SELECT * FROM equipment_fields WHERE site_id = ? AND equipment_id = ? ORDER BY sort_order ASC',
    [siteId, equipmentId]
  );
  return (result.results || []).map(mapToEquipmentField);
}

/**
 * Get a single equipment field by ID (scoped by site)
 */
export async function getEquipmentFieldById(
  db: D1Database,
  siteId: string,
  fieldId: string
): Promise<EquipmentField | null> {
  const row = await executeOne<DBEquipmentField>(
    db,
    'SELECT * FROM equipment_fields WHERE id = ? AND site_id = ?',
    [fieldId, siteId]
  );
  return row ? mapToEquipmentField(row) : null;
}

/**
 * Create a new equipment field (scoped by site)
 */
export async function createEquipmentField(
  db: D1Database,
  siteId: string,
  data: CreateEquipmentFieldData
): Promise<EquipmentField> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const optionsJson = data.options ? JSON.stringify(data.options) : null;
  const mediaReqJson = data.mediaRequirements ? JSON.stringify(data.mediaRequirements) : null;

  await db
    .prepare(
      `INSERT INTO equipment_fields
       (id, site_id, equipment_id, name, field_type, options, placeholder, required, max_length, min_value, max_value, default_value, media_requirements, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.equipmentId,
      data.name,
      data.fieldType,
      optionsJson,
      data.placeholder ?? null,
      data.required ? 1 : 0,
      data.maxLength ?? null,
      data.minValue ?? null,
      data.maxValue ?? null,
      data.defaultValue ?? null,
      mediaReqJson,
      data.sortOrder ?? 0,
      timestamp,
      timestamp
    )
    .run();

  const field = await getEquipmentFieldById(db, siteId, id);
  if (!field) {
    throw new Error('Failed to create equipment field');
  }
  return field;
}

/**
 * Update an existing equipment field (scoped by site)
 */
export async function updateEquipmentField(
  db: D1Database,
  siteId: string,
  fieldId: string,
  data: UpdateEquipmentFieldData
): Promise<EquipmentField | null> {
  const existing = await getEquipmentFieldById(db, siteId, fieldId);
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
    .prepare(`UPDATE equipment_fields SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getEquipmentFieldById(db, siteId, fieldId);
}

/**
 * Delete an equipment field (scoped by site)
 */
export async function deleteEquipmentField(
  db: D1Database,
  siteId: string,
  fieldId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM equipment_fields WHERE id = ? AND site_id = ?')
    .bind(fieldId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

// --- Product-Equipment Associations ---

/**
 * Get all equipment associations for a product (scoped by site)
 */
export async function getProductEquipment(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<ProductEquipment[]> {
  const result = await execute<DBProductEquipment>(
    db,
    'SELECT * FROM product_equipment WHERE site_id = ? AND product_id = ? ORDER BY sort_order ASC',
    [siteId, productId]
  );
  return (result.results || []).map(mapToProductEquipment);
}

/**
 * Add equipment to a product (scoped by site)
 */
export async function addProductEquipment(
  db: D1Database,
  siteId: string,
  productId: string,
  equipmentId: string,
  sortOrder: number = 0
): Promise<ProductEquipment> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO product_equipment (id, site_id, product_id, equipment_id, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, siteId, productId, equipmentId, sortOrder, timestamp)
    .run();

  const row = await executeOne<DBProductEquipment>(
    db,
    'SELECT * FROM product_equipment WHERE id = ? AND site_id = ?',
    [id, siteId]
  );
  if (!row) {
    throw new Error('Failed to add equipment to product');
  }
  return mapToProductEquipment(row);
}

/**
 * Remove equipment from a product (scoped by site)
 */
export async function removeProductEquipment(
  db: D1Database,
  siteId: string,
  productId: string,
  equipmentId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      'DELETE FROM product_equipment WHERE site_id = ? AND product_id = ? AND equipment_id = ?'
    )
    .bind(siteId, productId, equipmentId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

// --- Product Equipment with Fields (for storefront / checkout) ---

interface DBEquipmentJoinRow {
  id: string;
  site_id: string;
  product_id: string;
  equipment_id: string;
  sort_order: number;
  created_at: number;
  eq_id: string;
  eq_name: string;
  eq_description: string | null;
  eq_is_active: number;
  eq_created_at: number;
  eq_updated_at: number;
}

/**
 * Get all equipment with their fields for a product.
 * Used on storefront product pages and during checkout.
 */
export async function getProductEquipmentWithFields(
  db: D1Database,
  siteId: string,
  productId: string
): Promise<EquipmentWithFields[]> {
  // Fetch product equipment with joined equipment data
  const joinResult = await execute<DBEquipmentJoinRow>(
    db,
    `SELECT pe.*,
            e.id AS eq_id,
            e.name AS eq_name,
            e.description AS eq_description,
            e.is_active AS eq_is_active,
            e.created_at AS eq_created_at,
            e.updated_at AS eq_updated_at
     FROM product_equipment pe
     JOIN equipment e ON e.id = pe.equipment_id
     WHERE pe.site_id = ? AND pe.product_id = ? AND e.is_active = 1
     ORDER BY pe.sort_order ASC`,
    [siteId, productId]
  );

  const rows = joinResult.results || [];
  if (rows.length === 0) {
    return [];
  }

  // For each equipment, fetch its fields
  const result: EquipmentWithFields[] = [];
  for (const row of rows) {
    const fields = await getEquipmentFields(db, siteId, row.eq_id);
    result.push({
      id: row.eq_id,
      siteId: row.site_id,
      name: row.eq_name,
      description: row.eq_description,
      isActive: row.eq_is_active === 1,
      createdAt: row.eq_created_at,
      updatedAt: row.eq_updated_at,
      fields
    });
  }

  return result;
}

// --- Order Item Equipment Values ---

export interface OrderItemEquipmentValueInput {
  equipmentId: string;
  equipmentFieldId: string;
  fieldName: string;
  value: string;
}

/**
 * Save equipment field values for an order item
 */
export async function saveOrderItemEquipmentValues(
  db: D1Database,
  orderItemId: string,
  values: OrderItemEquipmentValueInput[]
): Promise<void> {
  for (const val of values) {
    const id = generateId();
    const timestamp = getCurrentTimestamp();

    await db
      .prepare(
        `INSERT INTO order_item_equipment_values
         (id, order_item_id, equipment_id, equipment_field_id, field_name, value, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        orderItemId,
        val.equipmentId,
        val.equipmentFieldId,
        val.fieldName,
        val.value,
        timestamp
      )
      .run();
  }
}

/**
 * Get equipment values for an order item
 */
export async function getOrderItemEquipmentValues(
  db: D1Database,
  orderItemId: string
): Promise<DBOrderItemEquipmentValue[]> {
  const result = await execute<DBOrderItemEquipmentValue>(
    db,
    'SELECT * FROM order_item_equipment_values WHERE order_item_id = ? ORDER BY created_at ASC',
    [orderItemId]
  );
  return result.results || [];
}
