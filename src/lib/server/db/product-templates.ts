/**
 * Curated product templates + their print-area geometry.
 *
 * Templates are global (not site-scoped) and are the source of truth for a
 * print-on-demand product's printable geometry — physical size + required DPI
 * sized from Printful's published specs. An owner starts a product from a
 * template, and each print area is materialized into a customer-facing
 * customization zone (see materializeTemplateZones in products-from-template).
 */

import { execute, executeOne } from './connection.js';

export interface ProductTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  productType: string;
  baseImage: string;
  defaultPrice: number;
  status: string;
  sortOrder: number;
}

export interface TemplatePrintArea {
  id: string;
  templateId: string;
  key: string;
  name: string;
  placement: string;
  physWidth: number;
  physHeight: number;
  unit: string;
  requiredDpi: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  allowedTypes: string[];
  sortOrder: number;
}

interface DBProductTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  product_type: string;
  base_image: string;
  default_price: number;
  status: string;
  sort_order: number;
}

interface DBTemplatePrintArea {
  id: string;
  template_id: string;
  key: string;
  name: string;
  placement: string;
  phys_width: number;
  phys_height: number;
  unit: string;
  required_dpi: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  allowed_types: string;
  sort_order: number;
}

function mapTemplate(row: DBProductTemplate): ProductTemplate {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    productType: row.product_type,
    baseImage: row.base_image,
    defaultPrice: row.default_price,
    status: row.status,
    sortOrder: row.sort_order
  };
}

function mapPrintArea(row: DBTemplatePrintArea): TemplatePrintArea {
  return {
    id: row.id,
    templateId: row.template_id,
    key: row.key,
    name: row.name,
    placement: row.placement,
    physWidth: row.phys_width,
    physHeight: row.phys_height,
    unit: row.unit,
    requiredDpi: row.required_dpi,
    xPercent: row.x_percent,
    yPercent: row.y_percent,
    widthPercent: row.width_percent,
    heightPercent: row.height_percent,
    allowedTypes: JSON.parse(row.allowed_types || '[]') as string[],
    sortOrder: row.sort_order
  };
}

/** All active templates, in display order. */
export async function getActiveTemplates(db: D1Database): Promise<ProductTemplate[]> {
  const result = await execute<DBProductTemplate>(
    db,
    "SELECT * FROM product_templates WHERE status = 'active' ORDER BY sort_order ASC",
    []
  );
  return (result.results || []).map(mapTemplate);
}

/** A single template by id. */
export async function getTemplateById(
  db: D1Database,
  templateId: string
): Promise<ProductTemplate | null> {
  const row = await executeOne<DBProductTemplate>(
    db,
    'SELECT * FROM product_templates WHERE id = ?',
    [templateId]
  );
  return row ? mapTemplate(row) : null;
}

/** The print areas belonging to a template, in order. */
export async function getTemplatePrintAreas(
  db: D1Database,
  templateId: string
): Promise<TemplatePrintArea[]> {
  const result = await execute<DBTemplatePrintArea>(
    db,
    'SELECT * FROM template_print_areas WHERE template_id = ? ORDER BY sort_order ASC',
    [templateId]
  );
  return (result.results || []).map(mapPrintArea);
}

/**
 * Print areas by id, keyed for lookup.
 *
 * The storefront needs the geometry behind whichever zones a product actually
 * links to — which may span templates — so this fetches by area id rather than
 * by template.
 */
export async function getPrintAreasByIds(
  db: D1Database,
  areaIds: string[]
): Promise<Record<string, TemplatePrintArea>> {
  const ids = [...new Set(areaIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const placeholders = ids.map(() => '?').join(', ');
  const result = await execute<DBTemplatePrintArea>(
    db,
    `SELECT * FROM template_print_areas WHERE id IN (${placeholders})`,
    ids
  );

  const byId: Record<string, TemplatePrintArea> = {};
  for (const row of result.results || []) {
    byId[row.id] = mapPrintArea(row);
  }
  return byId;
}

/** A template together with its print areas. */
export async function getTemplateWithAreas(
  db: D1Database,
  templateId: string
): Promise<{ template: ProductTemplate; areas: TemplatePrintArea[] } | null> {
  const template = await getTemplateById(db, templateId);
  if (!template) return null;
  const areas = await getTemplatePrintAreas(db, templateId);
  return { template, areas };
}
