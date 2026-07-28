/**
 * Author a new product from a curated template: create the product pre-filled
 * from the template, then materialize each template print area into a
 * customer-facing customization zone (carrying the print_area_id link so its
 * DPI / physical size / placement stay known). The owner lands in the normal
 * product editor with a correctly-sized customizable product ready to refine.
 */

import { createProduct, type DBProduct } from './products.js';
import { createCustomizationZone } from './customization-zones.js';
import { getTemplateWithAreas } from './product-templates.js';

export async function createProductFromTemplate(
  db: D1Database,
  siteId: string,
  templateId: string
): Promise<DBProduct> {
  const bundle = await getTemplateWithAreas(db, templateId);
  if (!bundle) {
    throw new Error('Template not found');
  }
  const { template, areas } = bundle;

  const product = await createProduct(db, siteId, {
    name: template.name,
    description: template.description ?? '',
    price: template.defaultPrice,
    image: template.baseImage,
    category: template.productType,
    stock: 0,
    type: 'physical',
    tags: ['custom', 'print-on-demand', template.key],
    templateId: template.id,
    fulfillmentMode: 'manual'
  });

  for (const area of areas) {
    await createCustomizationZone(db, siteId, {
      productId: product.id,
      name: area.name,
      xPercent: area.xPercent,
      yPercent: area.yPercent,
      widthPercent: area.widthPercent,
      heightPercent: area.heightPercent,
      allowedTypes: area.allowedTypes,
      sortOrder: area.sortOrder,
      printAreaId: area.id
    });
  }

  return product;
}
