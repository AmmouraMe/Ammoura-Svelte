/**
 * Printful API Client
 * Handles all communication with Printful API
 * Reference: https://printful.com/api/docs
 */

import type {
  PrintfulConfig,
  PrintfulResponse,
  PrintfulProduct,
  PrintfulVariant,
  PrintfulOrder,
  PrintfulOrderRequest,
  PrintfulStore,
  PrintfulSyncProduct
} from './types';

export class PrintfulClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: PrintfulConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error('Printful API key is required');
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.printful.com';
  }

  /**
   * Make a request to Printful API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as PrintfulResponse<T>;

      // Check Printful API error response
      if (data.code !== 200 && data.error) {
        throw new Error(data.error.message);
      }

      if (data.code !== 200) {
        throw new Error(`Printful API error (code ${data.code})`);
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Printful API request failed: ${String(error)}`);
    }
  }

  /**
   * Get store information
   */
  async getStore(): Promise<PrintfulStore> {
    return this.request<PrintfulStore>('/store');
  }

  /**
   * Get all sync products in the user's Printful store
   */
  async getStoreProducts(): Promise<PrintfulSyncProduct[]> {
    const result = await this.request<PrintfulSyncProduct[]>('/store/products');
    return result || [];
  }

  /**
   * Get all products in the store
   */
  async getProducts(): Promise<PrintfulProduct[]> {
    const result = await this.request<PrintfulProduct[]>('/products');
    return result || [];
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: number): Promise<PrintfulProduct> {
    return this.request<PrintfulProduct>(`/products/${productId}`);
  }

  /**
   * Get variant by ID
   */
  async getVariantById(variantId: number): Promise<PrintfulVariant> {
    return this.request<PrintfulVariant>(`/variants/${variantId}`);
  }

  /**
   * Create an order with Printful
   */
  async createOrder(orderRequest: PrintfulOrderRequest): Promise<PrintfulOrder> {
    return this.request<PrintfulOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderRequest)
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<PrintfulOrder> {
    return this.request<PrintfulOrder>(`/orders/${orderId}`);
  }

  /**
   * Cancel order by ID
   */
  async cancelOrder(orderId: number): Promise<boolean> {
    const result = await this.request<{ success: boolean }>(`/orders/${orderId}`, {
      method: 'DELETE'
    });
    return result?.success === true;
  }

  /**
   * Get all orders
   */
  async getOrders(): Promise<PrintfulOrder[]> {
    const result = await this.request<PrintfulOrder[]>('/orders');
    return result || [];
  }

  /**
   * Get order by external ID (our order ID)
   */
  async getOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.external_id === externalId) || null;
  }
}
