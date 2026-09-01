/**
 * Printful Service
 * High-level service for managing Printful integration
 * Handles syncing, inventory checks, and order management
 */

import { PrintfulClient } from './client';
import { getDecryptedProviderConfig } from '$lib/server/db/fulfillment-providers';
import type { DBFulfillmentProvider } from '$lib/types/fulfillment';
import type { PrintfulProduct, PrintfulOrderRequest, PrintfulOrder } from './types';

interface PrintfulServiceConfig {
  apiKey: string;
}

export class PrintfulService {
  private client: PrintfulClient;
  private config: PrintfulServiceConfig;

  constructor(provider: DBFulfillmentProvider, config: PrintfulServiceConfig) {
    if (provider.provider_type !== 'printful') {
      throw new Error('Provider is not Printful type');
    }

    if (!config.apiKey?.trim()) {
      throw new Error('Printful API key is required in provider config');
    }

    this.config = config;
    this.client = new PrintfulClient({ apiKey: config.apiKey });
  }

  /**
   * Build a PrintfulService from a stored provider row, decrypting its
   * config. Provider config is stored encrypted at rest (see
   * fulfillment-providers.ts), so this is async unlike the constructor.
   */
  static async fromProvider(
    provider: DBFulfillmentProvider,
    encryptionKey: string
  ): Promise<PrintfulService> {
    const decrypted = await getDecryptedProviderConfig(provider, encryptionKey);
    return new PrintfulService(provider, decrypted as unknown as PrintfulServiceConfig);
  }

  /**
   * Get the Printful config
   */
  getPrintfulConfig(): PrintfulServiceConfig {
    return this.config;
  }

  /**
   * Check if config is valid
   */
  isConfigValid(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  /**
   * Sync all products from Printful
   */
  async syncProducts(): Promise<PrintfulProduct[]> {
    try {
      const products = await this.client.getProducts();
      return products;
    } catch (_error) {
      console.error('Failed to sync Printful products:', _error);
      return [];
    }
  }

  /**
   * Get detailed product info from Printful
   */
  async getProductDetails(productId: number): Promise<PrintfulProduct> {
    return this.client.getProductById(productId);
  }

  /**
   * Check if variant is in stock
   */
  async checkInventory(variantId: number): Promise<boolean> {
    try {
      const variant = await this.client.getVariantById(variantId);
      return variant.availability_status !== 'out_of_stock';
    } catch (_error) {
      console.error('Failed to check Printful inventory:', _error);
      return false;
    }
  }

  /**
   * Create order with Printful
   */
  async createOrderWithPrintful(orderRequest: PrintfulOrderRequest): Promise<PrintfulOrder> {
    return this.client.createOrder(orderRequest);
  }

  /**
   * Find an order Printful already holds under our own order id.
   *
   * The relay asks this before retrying, so a first attempt that created the
   * order and then timed out does not produce a second one.
   */
  async findOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
    return this.client.getOrderByExternalId(externalId);
  }

  /**
   * Get order status from Printful
   */
  async getOrderStatus(orderId: number): Promise<PrintfulOrder> {
    return this.client.getOrder(orderId);
  }

  /**
   * Cancel order with Printful
   */
  async cancelOrder(orderId: number): Promise<boolean> {
    return this.client.cancelOrder(orderId);
  }

  /**
   * Get all orders from Printful
   */
  async getAllOrders(): Promise<PrintfulOrder[]> {
    try {
      return await this.client.getOrders();
    } catch (_error) {
      console.error('Failed to get Printful orders:', _error);
      return [];
    }
  }
}
