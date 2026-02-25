import { describe, it, expect, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  getDashboardMetrics,
  getRecentOrders,
  getTopProducts,
  getLowStockProducts,
  getSalesChartData
} from './dashboard';

describe('Dashboard Statistics', () => {
  let mockDb: D1Database;
  const siteId = 'test-site';

  beforeEach(() => {
    mockDb = {
      prepare: (sql: string) => ({
        bind: (..._params: unknown[]) => ({
          first: async () => {
            // Total revenue and order count
            if (sql.includes('SUM(total)') && sql.includes('COUNT(*)') && sql.includes('orders')) {
              return { total_revenue: 10000, order_count: 50 };
            }
            // Customer count
            if (sql.includes('COUNT(DISTINCT user_id)') && !sql.includes('created_at >=')) {
              return { customer_count: 25 };
            }
            // New customers this month
            if (sql.includes('COUNT(DISTINCT user_id)') && sql.includes('created_at >=')) {
              return { new_customers: 5 };
            }
            // Total products
            if (sql.includes('COUNT(*)') && sql.includes('products') && !sql.includes('stock')) {
              return { total_products: 100 };
            }
            // Out of stock products
            if (sql.includes('COUNT(*)') && sql.includes('stock = 0')) {
              return { out_of_stock: 3 };
            }
            // Revenue for specific periods
            if (sql.includes('SUM(total)') && sql.includes('created_at >=')) {
              return { revenue: 500 };
            }
            return null;
          },
          all: async () => {
            if (sql.includes('GROUP BY status')) {
              return {
                success: true,
                results: [
                  { status: 'pending', count: 10 },
                  { status: 'processing', count: 15 },
                  { status: 'delivered', count: 20 },
                  { status: 'cancelled', count: 5 }
                ],
                meta: {}
              };
            }
            return { success: true, results: [], meta: {} };
          },
          run: async () => ({ success: true, meta: {} })
        })
      })
    } as unknown as D1Database;
  });

  describe('getDashboardMetrics', () => {
    it('returns comprehensive dashboard metrics', async () => {
      const metrics = await getDashboardMetrics(mockDb, siteId);

      expect(metrics).toBeDefined();
      expect(metrics.totalRevenue).toBe(10000);
      expect(metrics.totalOrders).toBe(50);
      expect(metrics.totalCustomers).toBe(25);
      expect(metrics.totalProducts).toBe(100);
      expect(metrics.pendingOrders).toBe(10);
      expect(metrics.processingOrders).toBe(15);
      expect(metrics.completedOrders).toBe(20);
      expect(metrics.cancelledOrders).toBe(5);
      expect(metrics.outOfStockProducts).toBe(3);
      expect(metrics.newCustomersThisMonth).toBe(5);
    });

    it('handles zero values gracefully', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ total_revenue: 0, order_count: 0, customer_count: 0 }),
            all: async () => ({ success: true, results: [], meta: {} })
          })
        })
      } as unknown as D1Database;

      const metrics = await getDashboardMetrics(mockDb, siteId);

      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalCustomers).toBe(0);
    });
  });

  describe('getRecentOrders', () => {
    it('fetches recent orders with customer details', async () => {
      mockDb = {
        prepare: (_sql: string) => ({
          bind: (..._params: unknown[]) => ({
            all: async () => ({
              success: true,
              results: [
                {
                  id: 'order-1',
                  user_id: 'user-1',
                  status: 'pending',
                  total: 99.99,
                  created_at: 1234567890
                },
                {
                  id: 'order-2',
                  user_id: null,
                  status: 'processing',
                  total: 149.99,
                  created_at: 1234567891
                }
              ],
              meta: {}
            }),
            first: async () => ({ name: 'John Doe', email: 'john@example.com' })
          })
        })
      } as unknown as D1Database;

      const orders = await getRecentOrders(mockDb, siteId, 10);

      expect(orders).toHaveLength(2);
      expect(orders[0].id).toBe('order-1');
      expect(orders[0].customer_name).toBe('John Doe');
      expect(orders[1].customer_name).toBe('Guest');
    });

    it('respects the limit parameter', async () => {
      mockDb = {
        prepare: (sql: string) => ({
          bind: (...params: unknown[]) => {
            if (sql.includes('LIMIT')) {
              expect(params).toContain(5);
            }
            return {
              all: async () => ({ success: true, results: [], meta: {} }),
              first: async () => null
            };
          }
        })
      } as unknown as D1Database;

      await getRecentOrders(mockDb, siteId, 5);
    });
  });

  describe('getTopProducts', () => {
    it('fetches top-selling products', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              success: true,
              results: [
                {
                  product_id: 'prod-1',
                  name: 'Product 1',
                  image: '/img1.jpg',
                  total_quantity: 50,
                  total_revenue: 999.5
                },
                {
                  product_id: 'prod-2',
                  name: 'Product 2',
                  image: '/img2.jpg',
                  total_quantity: 30,
                  total_revenue: 599.7
                }
              ],
              meta: {}
            })
          })
        })
      } as unknown as D1Database;

      const products = await getTopProducts(mockDb, siteId, 5);

      expect(products).toHaveLength(2);
      expect(products[0].name).toBe('Product 1');
      expect(products[0].total_quantity).toBe(50);
      expect(products[1].total_revenue).toBe(599.7);
    });

    it('returns empty array when no products sold', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: [], meta: {} })
          })
        })
      } as unknown as D1Database;

      const products = await getTopProducts(mockDb, siteId);

      expect(products).toEqual([]);
    });
  });

  describe('getLowStockProducts', () => {
    it('fetches products below stock threshold', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              success: true,
              results: [
                {
                  id: 'prod-1',
                  name: 'Low Stock Product',
                  image: '/img.jpg',
                  stock: 3,
                  category: 'Electronics'
                }
              ],
              meta: {}
            })
          })
        })
      } as unknown as D1Database;

      const products = await getLowStockProducts(mockDb, siteId, 10, 5);

      expect(products).toHaveLength(1);
      expect(products[0].stock).toBe(3);
      expect(products[0].name).toBe('Low Stock Product');
    });
  });

  describe('getSalesChartData', () => {
    it('fetches sales data for specified number of days', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              success: true,
              results: [
                { date: '2024-01-01', revenue: 100, order_count: 5 },
                { date: '2024-01-02', revenue: 150, order_count: 7 }
              ],
              meta: {}
            })
          })
        })
      } as unknown as D1Database;

      const data = await getSalesChartData(mockDb, siteId, 30);

      expect(data).toHaveLength(2);
      expect(data[0].date).toBe('2024-01-01');
      expect(data[0].revenue).toBe(100);
      expect(data[0].orders).toBe(5);
    });

    it('returns empty array when no sales data', async () => {
      mockDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: [], meta: {} })
          })
        })
      } as unknown as D1Database;

      const data = await getSalesChartData(mockDb, siteId);

      expect(data).toEqual([]);
    });
  });

  describe('getDashboardMetrics - null query results', () => {
    it('handles null results from all queries', async () => {
      const nullDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => null,
            all: async () => ({ success: true, results: null, meta: {} })
          })
        })
      } as unknown as D1Database;

      const metrics = await getDashboardMetrics(nullDb, siteId);

      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalCustomers).toBe(0);
      expect(metrics.totalProducts).toBe(0);
      expect(metrics.pendingOrders).toBe(0);
      expect(metrics.processingOrders).toBe(0);
      expect(metrics.completedOrders).toBe(0);
      expect(metrics.cancelledOrders).toBe(0);
    });
  });

  describe('getRecentOrders - edge cases', () => {
    it('handles user lookup returning null (guest order)', async () => {
      const guestDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              success: true,
              results: [
                {
                  id: 'order-1',
                  user_id: 'user-1',
                  status: 'pending',
                  total_amount: 99.99,
                  created_at: 1234567890
                }
              ],
              meta: {}
            }),
            first: async () => null
          })
        })
      } as unknown as D1Database;

      const orders = await getRecentOrders(guestDb, siteId);

      expect(orders).toHaveLength(1);
      expect(orders[0].customer_name).toBe('Guest');
      expect(orders[0].customer_email).toBe('guest@example.com');
    });

    it('returns empty array when results is null', async () => {
      const nullDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: null, meta: {} }),
            first: async () => null
          })
        })
      } as unknown as D1Database;

      const orders = await getRecentOrders(nullDb, siteId);
      expect(orders).toEqual([]);
    });
  });

  describe('getTopProducts - edge cases', () => {
    it('handles null product_id in results', async () => {
      const nullIdDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({
              success: true,
              results: [
                {
                  product_id: null,
                  name: 'Unknown Product',
                  image: '/img.jpg',
                  total_quantity: 10,
                  total_revenue: 100.0
                }
              ],
              meta: {}
            })
          })
        })
      } as unknown as D1Database;

      const products = await getTopProducts(nullIdDb, siteId);
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('');
    });

    it('returns empty array when results is null', async () => {
      const nullDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: null, meta: {} })
          })
        })
      } as unknown as D1Database;

      const products = await getTopProducts(nullDb, siteId);
      expect(products).toEqual([]);
    });
  });

  describe('getLowStockProducts - null results', () => {
    it('returns empty array when results is null', async () => {
      const nullDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: null, meta: {} })
          })
        })
      } as unknown as D1Database;

      const products = await getLowStockProducts(nullDb, siteId);
      expect(products).toEqual([]);
    });
  });

  describe('getSalesChartData - null results', () => {
    it('returns empty array when results is null', async () => {
      const nullDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ success: true, results: null, meta: {} })
          })
        })
      } as unknown as D1Database;

      const data = await getSalesChartData(nullDb, siteId);
      expect(data).toEqual([]);
    });
  });
});
