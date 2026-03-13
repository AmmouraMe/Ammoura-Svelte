/**
 * Fulfillment provider types
 */

import type { ProductType } from './index';

/**
 * Supported fulfillment provider integration types.
 * Each type maps to a set of capabilities that control product behavior.
 */
export type ProviderType = 'manual' | 'printful';

/**
 * Describes what a provider type can do with products.
 * Used by the admin UI to show/hide fields and enforce constraints.
 */
export interface ProviderCapabilities {
  displayName: string;
  /** Whether the store manages stock for this provider (false = provider manages it) */
  managesOwnStock: boolean;
  /** Whether the provider handles shipping externally */
  managesShipping: boolean;
  /** Whether the provider has its own product catalog to sync from */
  hasExternalCatalog: boolean;
  /** Whether product data must be synced from the external provider */
  requiresExternalSync: boolean;
  /** Whether the store owner can freely set prices (false = provider dictates base cost) */
  allowsManualPricing: boolean;
  /** Whether products support image customization zones (e.g., print areas) */
  supportsCustomizationZones: boolean;
  /** Whether products support text/input customization fields */
  supportsCustomizationFields: boolean;
  /** Which product types this provider can fulfill */
  allowedProductTypes: ProductType[];
  /** Config keys required for this provider to function */
  requiredConfig: string[];
}

export interface FulfillmentProvider {
  id: string;
  name: string;
  description: string | null;
  providerType: ProviderType;
  isDefault: boolean;
  isActive: boolean;
}

export interface DBFulfillmentProvider {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  provider_type: string;
  config: string | null;
  is_default: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface CreateFulfillmentProviderData {
  name: string;
  description?: string;
  providerType?: ProviderType;
  config?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateFulfillmentProviderData {
  name?: string;
  description?: string;
  providerType?: ProviderType;
  config?: Record<string, string>;
  isActive?: boolean;
}

export interface ProductFulfillmentOption {
  providerId: string;
  providerName: string;
  cost: number;
  stockQuantity: number;
  sortOrder: number;
}

export interface DBProductFulfillmentOption {
  id: string;
  site_id: string;
  product_id: string;
  provider_id: string;
  cost: number;
  stock_quantity: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface CreateProductFulfillmentOptionData {
  productId: string;
  providerId: string;
  cost: number;
  stockQuantity?: number;
  sortOrder?: number;
}
