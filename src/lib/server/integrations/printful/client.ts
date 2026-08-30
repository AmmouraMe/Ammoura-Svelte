/**
 * Printful API Client
 * Handles all communication with Printful API
 * Reference: https://printful.com/api/docs
 */

import { PrintfulApiError } from './errors';
import type {
  PrintfulConfig,
  PrintfulResponse,
  PrintfulProduct,
  PrintfulVariant,
  PrintfulOrder,
  PrintfulOrderRequest,
  PrintfulStore,
  PrintfulSyncProduct,
  PrintfulSyncProductDetail
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
        throw new PrintfulApiError(`HTTP ${response.status}: ${response.statusText}`, {
          status: response.status,
          body: await readBody(response)
        });
      }

      const data = (await response.json()) as PrintfulResponse<T>;

      // Check Printful API error response
      if (data.code !== 200 && data.error) {
        throw new PrintfulApiError(data.error.message, {
          status: data.code,
          printfulCode: data.code,
          body: JSON.stringify(data)
        });
      }

      if (data.code !== 200) {
        throw new PrintfulApiError(`Printful API error (code ${data.code})`, {
          status: data.code,
          printfulCode: data.code,
          body: JSON.stringify(data)
        });
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof PrintfulApiError) {
        throw error;
      }
      if (error instanceof Error) {
        // fetch rejecting, or a body that would not parse: the request never
        // produced an answer, so there is no status to reason about.
        throw new PrintfulApiError(error.message, { cause: error });
      }
      throw new PrintfulApiError(`Printful API request failed: ${String(error)}`);
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
   * Get one sync product's full detail, including its ordering-ready
   * sync variants (each with a sync_variant_id and its own retail price).
   */
  async getStoreProduct(syncProductId: number): Promise<PrintfulSyncProductDetail> {
    return this.request<PrintfulSyncProductDetail>(`/store/products/${syncProductId}`);
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
   * Get order by external ID (our order ID).
   *
   * Printful addresses an order by our own id with an `@` prefix, which is a
   * single request rather than paging the whole order list. Returns null when
   * no such order exists — the answer the relay needs before deciding whether
   * a retry would create a duplicate.
   */
  async getOrderByExternalId(externalId: string): Promise<PrintfulOrder | null> {
    try {
      return await this.request<PrintfulOrder>(`/orders/@${encodeURIComponent(externalId)}`);
    } catch (error) {
      if (error instanceof PrintfulApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

/**
 * Read an error response body without letting the read itself become the
 * failure. Some responses have no body, and test doubles do not always
 * implement `text()`.
 */
async function readBody(response: Response): Promise<string | null> {
  if (typeof response.text !== 'function') return null;
  try {
    const text = await response.text();
    return text ? text.slice(0, 4000) : null;
  } catch {
    return null;
  }
}
