import type { ProductFulfillmentOption } from '$lib/types/fulfillment';

/**
 * Total sellable stock for a product.
 *
 * Stock can be recorded at two levels: per fulfillment provider, or as a plain
 * count on the product row. Provider options win when present, because they are
 * the more specific record. When a product has none — which is the case for
 * anything created from a print-on-demand template, and for simple products
 * generally — fall back to the product's own count.
 *
 * Without that fallback a product showing "100 in stock" in the admin renders
 * as "Out of Stock" on the storefront and cannot be bought at all.
 *
 * @param fulfillmentOptions - Per-provider stock rows, if any
 * @param productStock - The `products.stock` count, used when there are no options
 */
export function calculateTotalStock(
  fulfillmentOptions?: ProductFulfillmentOption[],
  productStock?: number | null
): number {
  if (!fulfillmentOptions || fulfillmentOptions.length === 0) {
    return typeof productStock === 'number' && productStock > 0 ? productStock : 0;
  }

  return fulfillmentOptions.reduce((total, option) => {
    return total + (option.stockQuantity || 0);
  }, 0);
}
