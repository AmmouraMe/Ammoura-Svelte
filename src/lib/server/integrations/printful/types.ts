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
  variant_id: number;
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
