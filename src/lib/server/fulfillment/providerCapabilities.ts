/**
 * Provider capability system.
 * Maps provider types to their capabilities, dictating what can be done
 * with products fulfilled by each provider.
 */

import type { ProviderType, ProviderCapabilities } from '$lib/types/fulfillment';
import type { ProductType } from '$lib/types/index';

/**
 * All supported provider types.
 */
export const PROVIDER_TYPES: ProviderType[] = ['manual', 'printful'];

/**
 * Check if a string is a valid provider type.
 */
export function isValidProviderType(value: string): value is ProviderType {
  return PROVIDER_TYPES.includes(value as ProviderType);
}

const MANUAL_CAPABILITIES: ProviderCapabilities = {
  displayName: 'Manual / Self-Fulfilled',
  managesOwnStock: true,
  managesShipping: false,
  hasExternalCatalog: false,
  requiresExternalSync: false,
  allowsManualPricing: true,
  supportsCustomizationZones: true,
  supportsCustomizationFields: true,
  allowedProductTypes: ['physical', 'digital', 'service'] as ProductType[],
  requiredConfig: []
};

const PRINTFUL_CAPABILITIES: ProviderCapabilities = {
  displayName: 'Printful',
  managesOwnStock: false,
  managesShipping: true,
  hasExternalCatalog: true,
  requiresExternalSync: true,
  allowsManualPricing: false,
  supportsCustomizationZones: true,
  supportsCustomizationFields: false,
  allowedProductTypes: ['physical'] as ProductType[],
  requiredConfig: ['apiKey']
};

const CAPABILITIES_MAP: Record<ProviderType, ProviderCapabilities> = {
  manual: MANUAL_CAPABILITIES,
  printful: PRINTFUL_CAPABILITIES
};

/**
 * Get the capabilities for a given provider type.
 * Falls back to manual capabilities for unknown types.
 */
export function getProviderCapabilities(providerType: ProviderType): ProviderCapabilities {
  return CAPABILITIES_MAP[providerType] || MANUAL_CAPABILITIES;
}
