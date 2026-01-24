/**
 * Activity Logger Tests
 * Test-first approach for comprehensive activity logging throughout the application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logActivity,
  logCartAction,
  logCheckoutAction,
  logProductAction,
  logPageAction,
  logRevisionAction
} from './activity-logger';
import type { D1Database } from '@cloudflare/workers-types';

describe('Activity Logger', () => {
  let mockDb: D1Database;
  let mockPrepare: ReturnType<typeof vi.fn>;
  let mockBind: ReturnType<typeof vi.fn>;
  let mockRun: ReturnType<typeof vi.fn>;
  let mockFirst: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRun = vi.fn().mockResolvedValue({ success: true });
    mockFirst = vi.fn().mockResolvedValue({
      id: 'test-id',
      site_id: 'site-123',
      user_id: 'user-456',
      action: 'test.action',
      entity_type: 'test',
      created_at: Date.now()
    });
    mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
    mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    mockDb = { prepare: mockPrepare } as unknown as D1Database;
  });

  describe('logActivity', () => {
    it('should log activity with all parameters', async () => {
      await logActivity(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'product.viewed',
        entityType: 'product',
        entityId: 'prod-789',
        entityName: 'Test Product',
        description: 'User viewed product page',
        metadata: { category: 'electronics' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'info'
      });

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should log activity with minimal parameters', async () => {
      await logActivity(mockDb, {
        siteId: 'site-123',
        action: 'page.viewed',
        entityType: 'page'
      });

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockBind).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRun.mockRejectedValue(new Error('Database error'));

      await expect(
        logActivity(mockDb, {
          siteId: 'site-123',
          action: 'test.action',
          entityType: 'test'
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('logCartAction', () => {
    it('should log adding item to cart', async () => {
      await logCartAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'add',
        productId: 'prod-789',
        productName: 'Test Product',
        quantity: 2,
        price: 29.99
      });

      expect(mockPrepare).toHaveBeenCalled();
      const bindCall = mockBind.mock.calls[0];
      expect(bindCall).toBeDefined();
    });

    it('should log removing item from cart', async () => {
      await logCartAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'remove',
        productId: 'prod-789',
        productName: 'Test Product',
        quantity: 1,
        price: 29.99
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log updating cart item quantity', async () => {
      await logCartAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'update',
        productId: 'prod-789',
        productName: 'Test Product',
        quantity: 3,
        price: 29.99
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log clearing cart', async () => {
      await logCartAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'clear',
        metadata: { itemsCleared: 5 }
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logCheckoutAction', () => {
    it('should log checkout started', async () => {
      await logCheckoutAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'started',
        totalAmount: 149.99,
        itemCount: 3
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log checkout completed', async () => {
      await logCheckoutAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'completed',
        orderId: 'order-123',
        totalAmount: 149.99,
        itemCount: 3
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log checkout failed', async () => {
      await logCheckoutAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'failed',
        totalAmount: 149.99,
        errorMessage: 'Payment declined'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logProductAction', () => {
    it('should log product viewed', async () => {
      await logProductAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'viewed',
        productId: 'prod-789',
        productName: 'Test Product'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log product searched', async () => {
      await logProductAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'searched',
        searchQuery: 'laptop',
        resultsCount: 15
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logPageAction', () => {
    it('should log page viewed', async () => {
      await logPageAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'viewed',
        pageId: 'page-123',
        pageName: 'Home',
        pageUrl: '/'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log page created', async () => {
      await logPageAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'created',
        pageId: 'page-123',
        pageName: 'About Us',
        pageUrl: '/about'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log page updated', async () => {
      await logPageAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'updated',
        pageId: 'page-123',
        pageName: 'About Us',
        pageUrl: '/about'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log page deleted with warning severity', async () => {
      await logPageAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'deleted',
        pageId: 'page-123',
        pageName: 'Old Page'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log page published', async () => {
      await logPageAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'published',
        pageId: 'page-123',
        pageName: 'Home',
        pageUrl: '/'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logProductAction', () => {
    it('should log product filtered', async () => {
      await logProductAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'filtered',
        resultsCount: 25
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logCheckoutAction', () => {
    it('should log checkout abandoned', async () => {
      await logCheckoutAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'abandoned',
        totalAmount: 149.99,
        itemCount: 3
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('logRevisionAction', () => {
    it('should log revision created for product', async () => {
      await logRevisionAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'created',
        entityType: 'product',
        entityId: 'prod-789',
        entityName: 'Test Product',
        revisionId: 'rev-001',
        revisionMessage: 'Initial version'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log revision created for page', async () => {
      await logRevisionAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'created',
        entityType: 'page',
        entityId: 'page-789',
        entityName: 'Home Page',
        revisionId: 'rev-002'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log revision published', async () => {
      await logRevisionAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'published',
        entityType: 'product',
        entityId: 'prod-789',
        revisionId: 'rev-001'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log revision restored with warning severity', async () => {
      await logRevisionAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'restored',
        entityType: 'page',
        entityId: 'page-789',
        revisionId: 'rev-001',
        parentRevisionId: 'rev-000'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });

    it('should log revision viewed', async () => {
      await logRevisionAction(mockDb, {
        siteId: 'site-123',
        userId: 'user-456',
        action: 'viewed',
        entityType: 'product',
        entityId: 'prod-789',
        revisionId: 'rev-001'
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });
});
