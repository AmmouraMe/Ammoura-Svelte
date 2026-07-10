/**
 * Printful API type definitions
 * References: https://printful.com/api/docs
 */

/**
 * Printful authentication config
 */
export interface PrintfulConfig {
  apiKey: string;
  apiUrl?: string; // Defaults to https://api.printful.com
}

/**
 * Printful API response wrapper
 */
export interface PrintfulResponse<T> {
  code: number;
  result: T | null;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Printful Product from their catalog
 */
export interface PrintfulProduct {
  id: number;
  external_id: string | null;
  title: string;
  type: number;
  description: string;
  currency: string;
  files: PrintfulFile[];
  options: PrintfulOption[];
  images: PrintfulImage[];
  variants: PrintfulVariant[];
}

export interface PrintfulVariant {
  id: number;
  external_id: string | null;
  product_id: number;
  size: string;
  color: string;
  color_code: string | null;
  size_code: string | null;
  sku: string;
  currency: string;
  status: 'active' | 'archived' | 'out_of_stock';
  availability_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  price: number;
  cost: number;
  retail_price: number | null;
  weight: number;
  image: PrintfulImage | null;
  files: PrintfulFile[];
}

export interface PrintfulFile {
  id: number;
  type: string;
  url: string;
  filename: string;
  hash: string;
  mime_type: string;
  width: number;
  height: number;
  dpi: number;
  preview_url: string;
  visible: boolean;
  is_temporary: boolean;
}

export interface PrintfulOption {
  id: number;
  display_name: string;
  name: string;
  type: string;
  values: Record<string, string>;
}

export interface PrintfulImage {
  id: number;
  type: string;
  url: string;
  filename: string;
  mime_type: string;
  width: number;
  height: number;
  dpi: number | null;
  preview_url: string;
  hash: string;
  visible: boolean;
}

/**
 * Printful Store Product (stored in our database)
 */
export interface PrintfulStoreProduct {
  id: number;
  external_id: string | null;
  title: string;
  type: number;
  description: string;
  currency: string;
  sync_product_id: string | null; // Our product ID if synced
}

/**
 * Order data to send to Printful
 */
export interface PrintfulOrderRequest {
  external_id: string;
  shipping: 'standard' | 'express' | 'overnight';
  notification_url?: string;
  items: PrintfulOrderItem[];
  recipient: PrintfulRecipient;
  return_full_response?: boolean;
}

export interface PrintfulOrderItem {
  /**
   * Exactly one of variant_id / sync_variant_id is expected by the Printful
   * API. Ammoura only ever orders already-designed store products, so it
   * always uses sync_variant_id — the variant's print files are already
   * attached in the merchant's Printful store and need not be resent.
   */
  variant_id?: number;
  sync_variant_id?: number;
  quantity: number;
  files?: PrintfulFile[];
  options?: Record<string, string>;
}

export interface PrintfulRecipient {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  state_name?: string;
  country_code: string;
  country_name?: string;
  zip: string;
  phone?: string;
  email: string;
}

/**
 * Printful Order response
 */
export interface PrintfulOrder {
  id: number;
  uid: string;
  status: 'pending' | 'confirmed' | 'failed' | 'canceled';
  ship_date: string | null;
  created: number;
  updated: number;
  external_id: string;
  shipping: string;
  shipping_service_name: string;
  estimated_delivery_date: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  costs: PrintfulOrderCosts;
  items: PrintfulOrderItemResponse[];
  recipient: PrintfulRecipient;
}

export interface PrintfulOrderCosts {
  currency: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface PrintfulOrderItemResponse extends PrintfulOrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  status: string;
}

/**
 * Printful store info
 */
export interface PrintfulStore {
  id: number;
  name: string;
  website: string;
  currency: string;
  country?: { code: string; name: string };
}

/**
 * Printful sync product (product already set up in the user's Printful store)
 */
export interface PrintfulSyncProduct {
  id: number;
  external_id: string | null;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string | null;
  is_ignored: boolean;
}

/**
 * A single ordering-ready variant of a sync product (a product the merchant
 * already designed in their Printful store/dashboard). Comes from
 * GET /store/products/{id}. size/color are best-effort — not every product
 * type (e.g. mugs) has them, and Printful doesn't guarantee both are always
 * present at the top level; treat as optional display hints, not required.
 * NOTE: verify this shape against a live Printful store during rollout —
 * it's modeled from Printful's documented v1 response, not exercised here.
 */
export interface PrintfulSyncVariant {
  id: number; // sync_variant_id — what Ammoura orders by
  external_id: string | null;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number; // catalog variant id, display/reference only
  retail_price: string; // Printful returns this endpoint's prices as strings
  currency: string;
  sku: string | null;
  is_ignored: boolean;
  size?: string;
  color?: string;
  files: PrintfulFile[];
}

/**
 * Full detail for one sync product, from GET /store/products/{id}.
 */
export interface PrintfulSyncProductDetail {
  sync_product: PrintfulSyncProduct;
  sync_variants: PrintfulSyncVariant[];
}

/**
 * Webhook event from Printful
 */
export interface PrintfulWebhookEvent {
  type: 'order_created' | 'order_updated' | 'order_failed' | 'order_canceled';
  created: number;
  updated: number;
  data: {
    order: PrintfulOrder;
  };
}
