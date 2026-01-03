/**
 * Activity Logger
 * Comprehensive activity logging helper for tracking all user actions throughout the application
 */

import { createActivityLog } from './db/activity-logs';
import type { D1Database } from '@cloudflare/workers-types';

export interface BaseActivityLogParams {
  siteId: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LogActivityParams extends BaseActivityLogParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description?: string | null;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface CartActionParams extends BaseActivityLogParams {
  action: 'add' | 'remove' | 'update' | 'clear';
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
}

export interface CheckoutActionParams extends BaseActivityLogParams {
  action: 'started' | 'completed' | 'failed' | 'abandoned';
  orderId?: string;
  totalAmount?: number;
  itemCount?: number;
  errorMessage?: string;
}

export interface ProductActionParams extends BaseActivityLogParams {
  action: 'viewed' | 'searched' | 'filtered';
  productId?: string;
  productName?: string;
  searchQuery?: string;
  resultsCount?: number;
}

export interface PageActionParams extends BaseActivityLogParams {
  action: 'viewed' | 'created' | 'updated' | 'deleted' | 'published';
  pageId?: string;
  pageName?: string;
  pageUrl?: string;
}

export interface RevisionActionParams extends BaseActivityLogParams {
  action: 'created' | 'published' | 'restored' | 'viewed';
  entityType: 'product' | 'page' | 'component' | 'layout';
  entityId: string;
  entityName?: string;
  revisionId: string;
  revisionMessage?: string;
  parentRevisionId?: string;
}

/**
 * Generic activity logger - can be used for any action
 */
export async function logActivity(db: D1Database, params: LogActivityParams): Promise<void> {
  try {
    await createActivityLog(db, params.siteId, {
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      entity_name: params.entityName || null,
      description: params.description || null,
      metadata: params.metadata,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      severity: params.severity || 'info'
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }
}

/**
 * Log cart-related actions
 */
export async function logCartAction(db: D1Database, params: CartActionParams): Promise<void> {
  const actionMap = {
    add: 'cart.item_added',
    remove: 'cart.item_removed',
    update: 'cart.item_updated',
    clear: 'cart.cleared'
  };

  const descriptionMap = {
    add: `Added ${params.productName || 'item'} to cart (qty: ${params.quantity})`,
    remove: `Removed ${params.productName || 'item'} from cart`,
    update: `Updated ${params.productName || 'item'} quantity to ${params.quantity}`,
    clear: 'Cleared shopping cart'
  };

  await logActivity(db, {
    siteId: params.siteId,
    userId: params.userId,
    action: actionMap[params.action],
    entityType: 'cart',
    entityId: params.productId,
    entityName: params.productName,
    description: descriptionMap[params.action],
    metadata: {
      ...params.metadata,
      quantity: params.quantity,
      price: params.price
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    severity: 'info'
  });
}

/**
 * Log checkout-related actions
 */
export async function logCheckoutAction(
  db: D1Database,
  params: CheckoutActionParams
): Promise<void> {
  const actionMap = {
    started: 'checkout.started',
    completed: 'checkout.completed',
    failed: 'checkout.failed',
    abandoned: 'checkout.abandoned'
  };

  const descriptionMap = {
    started: `Started checkout with ${params.itemCount} items ($${params.totalAmount})`,
    completed: `Completed checkout - Order #${params.orderId} ($${params.totalAmount})`,
    failed: `Checkout failed: ${params.errorMessage || 'Unknown error'}`,
    abandoned: `Abandoned checkout ($${params.totalAmount})`
  };

  await logActivity(db, {
    siteId: params.siteId,
    userId: params.userId,
    action: actionMap[params.action],
    entityType: 'order',
    entityId: params.orderId,
    description: descriptionMap[params.action],
    metadata: {
      ...params.metadata,
      totalAmount: params.totalAmount,
      itemCount: params.itemCount,
      errorMessage: params.errorMessage
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    severity: params.action === 'failed' ? 'warning' : 'info'
  });
}

/**
 * Log product-related actions
 */
export async function logProductAction(db: D1Database, params: ProductActionParams): Promise<void> {
  const actionMap = {
    viewed: 'product.viewed',
    searched: 'product.searched',
    filtered: 'product.filtered'
  };

  let description = '';
  if (params.action === 'viewed') {
    description = `Viewed product: ${params.productName || params.productId}`;
  } else if (params.action === 'searched') {
    description = `Searched products: "${params.searchQuery}" (${params.resultsCount} results)`;
  } else if (params.action === 'filtered') {
    description = `Filtered products (${params.resultsCount} results)`;
  }

  await logActivity(db, {
    siteId: params.siteId,
    userId: params.userId,
    action: actionMap[params.action],
    entityType: 'product',
    entityId: params.productId,
    entityName: params.productName,
    description,
    metadata: {
      ...params.metadata,
      searchQuery: params.searchQuery,
      resultsCount: params.resultsCount
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    severity: 'info'
  });
}

/**
 * Log page-related actions
 */
export async function logPageAction(db: D1Database, params: PageActionParams): Promise<void> {
  const actionMap = {
    viewed: 'page.viewed',
    created: 'page.created',
    updated: 'page.updated',
    deleted: 'page.deleted',
    published: 'page.published'
  };

  const descriptionMap = {
    viewed: `Viewed page: ${params.pageName || params.pageUrl}`,
    created: `Created page: ${params.pageName}`,
    updated: `Updated page: ${params.pageName}`,
    deleted: `Deleted page: ${params.pageName}`,
    published: `Published page: ${params.pageName}`
  };

  await logActivity(db, {
    siteId: params.siteId,
    userId: params.userId,
    action: actionMap[params.action],
    entityType: 'page',
    entityId: params.pageId,
    entityName: params.pageName,
    description: descriptionMap[params.action],
    metadata: {
      ...params.metadata,
      pageUrl: params.pageUrl
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    severity: params.action === 'deleted' ? 'warning' : 'info'
  });
}

/**
 * Log revision-related actions
 */
export async function logRevisionAction(
  db: D1Database,
  params: RevisionActionParams
): Promise<void> {
  const actionMap = {
    created: 'revision.created',
    published: 'revision.published',
    restored: 'revision.restored',
    viewed: 'revision.viewed'
  };

  const entityLabel = params.entityType === 'product' ? 'product' : 'page';
  const descriptionMap = {
    created: `Created ${entityLabel} revision${params.revisionMessage ? `: ${params.revisionMessage}` : ''}`,
    published: `Published ${entityLabel} revision (ID: ${params.revisionId})`,
    restored: `Restored ${entityLabel} to revision (ID: ${params.revisionId})`,
    viewed: `Viewed ${entityLabel} revision (ID: ${params.revisionId})`
  };

  await logActivity(db, {
    siteId: params.siteId,
    userId: params.userId,
    action: actionMap[params.action],
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    description: descriptionMap[params.action],
    metadata: {
      ...params.metadata,
      revisionId: params.revisionId,
      revisionMessage: params.revisionMessage,
      parentRevisionId: params.parentRevisionId
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    severity: params.action === 'restored' ? 'warning' : 'info'
  });
}
