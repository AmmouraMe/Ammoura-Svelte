import { describe, it, expect, vi } from 'vitest';
import {
  createActivityLog,
  getActivityLogs,
  getActivityLogsByUser,
  getActivityLogsByEntity,
  getActivityLogsByAction,
  getActivityLogCountBySeverity,
  deleteOldActivityLogs,
  exportActivityLogs,
  type ActivityLog
} from './activity-logs';

describe('Activity Logs Repository', () => {
  const siteId = 'test-site';

  describe('createActivityLog', () => {
    it('should create a new activity log', async () => {
      const mockLog: ActivityLog = {
        id: 'log-1',
        site_id: siteId,
        user_id: 'user-1',
        action: 'order.created',
        entity_type: 'order',
        entity_id: 'order-123',
        entity_name: 'Order #123',
        description: 'Created a new order',
        metadata: '{}',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        severity: 'info',
        created_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockFirst = vi.fn().mockResolvedValue(mockLog);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepareSelect = vi.fn().mockReturnValue({ bind: mockBindSelect });

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return mockPrepare(sql);
          }
          return mockPrepareSelect(sql);
        })
      } as unknown as D1Database;

      const result = await createActivityLog(mockDB, siteId, {
        user_id: 'user-1',
        action: 'order.created',
        entity_type: 'order',
        entity_id: 'order-123',
        entity_name: 'Order #123',
        description: 'Created a new order',
        metadata: {},
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        severity: 'info'
      });

      expect(result).toEqual(mockLog);
    });
  });

  describe('getActivityLogs', () => {
    it('should get activity logs with filters', async () => {
      const mockLogs: ActivityLog[] = [
        {
          id: 'log-1',
          site_id: siteId,
          user_id: 'user-1',
          action: 'order.created',
          entity_type: 'order',
          entity_id: 'order-123',
          entity_name: 'Order #123',
          description: 'Created a new order',
          metadata: null,
          ip_address: null,
          user_agent: null,
          severity: 'info',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogs(mockDB, siteId, {
        limit: 50,
        offset: 0
      });

      expect(mockPrepare).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getActivityLogsByUser', () => {
    it('should get activity logs for a specific user', async () => {
      const mockLogs: ActivityLog[] = [
        {
          id: 'log-1',
          site_id: siteId,
          user_id: 'user-1',
          action: 'order.created',
          entity_type: 'order',
          entity_id: 'order-123',
          entity_name: null,
          description: null,
          metadata: null,
          ip_address: null,
          user_agent: null,
          severity: 'info',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByUser(mockDB, siteId, 'user-1', 50, 0);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND user_id = ?')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'user-1', 50, 0);
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getActivityLogsByEntity', () => {
    it('should get activity logs for a specific entity', async () => {
      const mockLogs: ActivityLog[] = [
        {
          id: 'log-1',
          site_id: siteId,
          user_id: 'user-1',
          action: 'order.created',
          entity_type: 'order',
          entity_id: 'order-123',
          entity_name: null,
          description: null,
          metadata: null,
          ip_address: null,
          user_agent: null,
          severity: 'info',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByEntity(mockDB, siteId, 'order', 'order-123', 50, 0);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND entity_type = ? AND entity_id = ?')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'order', 'order-123', 50, 0);
      expect(result).toEqual(mockLogs);
    });
  });

  describe('deleteOldActivityLogs', () => {
    it('should delete old activity logs', async () => {
      const mockResult = { meta: { changes: 10 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteOldActivityLogs(mockDB, siteId, 90);

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM activity_logs WHERE site_id = ? AND created_at < ?'
      );
      expect(result).toBe(10);
    });

    it('should return 0 when no logs deleted', async () => {
      const mockResult = { meta: { changes: 0 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteOldActivityLogs(mockDB, siteId, 30);

      expect(result).toBe(0);
    });
  });

  describe('getActivityLogsByAction', () => {
    it('should get activity logs by action pattern', async () => {
      const mockLogs: ActivityLog[] = [
        {
          id: 'log-1',
          site_id: siteId,
          user_id: 'user-1',
          action: 'order.created',
          entity_type: 'order',
          entity_id: 'order-123',
          entity_name: null,
          description: null,
          metadata: null,
          ip_address: null,
          user_agent: null,
          severity: 'info',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByAction(mockDB, siteId, 'order.%', 50, 0);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND action LIKE ?')
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'order.%', 50, 0);
      expect(result).toEqual(mockLogs);
    });

    it('should return empty array when no matches', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByAction(mockDB, siteId, 'nonexistent.%');

      expect(result).toEqual([]);
    });
  });

  describe('getActivityLogCountBySeverity', () => {
    it('should return count of logs by severity', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 42 });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogCountBySeverity(mockDB, siteId, 'error');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM activity_logs WHERE site_id = ? AND severity = ?'
      );
      expect(mockBind).toHaveBeenCalledWith(siteId, 'error');
      expect(result).toBe(42);
    });

    it('should return 0 when no logs found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogCountBySeverity(mockDB, siteId, 'critical');

      expect(result).toBe(0);
    });

    it('should handle different severity levels', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 10 });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogCountBySeverity(mockDB, siteId, 'warning');
      expect(mockBind).toHaveBeenCalledWith(siteId, 'warning');

      await getActivityLogCountBySeverity(mockDB, siteId, 'info');
      expect(mockBind).toHaveBeenCalledWith(siteId, 'info');
    });
  });

  describe('exportActivityLogs', () => {
    it('should export activity logs with high limit', async () => {
      const mockLogs: ActivityLog[] = [
        {
          id: 'log-1',
          site_id: siteId,
          user_id: 'user-1',
          action: 'export.test',
          entity_type: 'test',
          entity_id: 'test-1',
          entity_name: null,
          description: null,
          metadata: null,
          ip_address: null,
          user_agent: null,
          severity: 'info',
          created_at: 1234567890
        }
      ];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await exportActivityLogs(mockDB, siteId, {});

      expect(result).toEqual(mockLogs);
    });
  });

  describe('getActivityLogs with filters', () => {
    it('should filter by user_id', async () => {
      const mockLogs: ActivityLog[] = [];
      const mockResults = { results: mockLogs, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { user_id: 'user-123' });

      expect(mockBind).toHaveBeenCalledWith(siteId, 'user-123', 50, 0);
    });

    it('should filter by action', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { action: 'order.created' });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('action = ?'));
    });

    it('should filter by entity_type', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { entity_type: 'product' });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('entity_type = ?'));
    });

    it('should filter by entity_id', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { entity_id: 'entity-456' });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('entity_id = ?'));
    });

    it('should filter by severity', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { severity: 'error' });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('severity = ?'));
    });

    it('should filter by start_date', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { start_date: 1000000 });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('created_at >= ?'));
    });

    it('should filter by end_date', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, { end_date: 2000000 });

      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('created_at <= ?'));
    });

    it('should combine multiple filters', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      await getActivityLogs(mockDB, siteId, {
        user_id: 'user-1',
        action: 'order.created',
        severity: 'info',
        limit: 100,
        offset: 10
      });

      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('createActivityLog - error handling', () => {
    it('should throw when re-fetch returns null after insert', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return { bind: mockBind };
          }
          return { bind: mockBindSelect };
        })
      } as unknown as D1Database;

      await expect(
        createActivityLog(mockDB, siteId, {
          action: 'test.action',
          entity_type: 'test'
        })
      ).rejects.toThrow('Failed to create activity log');
    });
  });

  describe('createActivityLog - without metadata', () => {
    it('should create log without metadata (null path)', async () => {
      const mockLog: ActivityLog = {
        id: 'log-1',
        site_id: siteId,
        user_id: null,
        action: 'test.action',
        entity_type: 'test',
        entity_id: null,
        entity_name: null,
        description: null,
        metadata: null,
        ip_address: null,
        user_agent: null,
        severity: 'info',
        created_at: 1234567890
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockLog);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return { bind: mockBind };
          }
          return { bind: mockBindSelect };
        })
      } as unknown as D1Database;

      const result = await createActivityLog(mockDB, siteId, {
        action: 'test.action',
        entity_type: 'test'
      });

      expect(result).toEqual(mockLog);
      expect(result.metadata).toBeNull();
    });
  });

  describe('getActivityLogs - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogs(mockDB, siteId);
      expect(result).toEqual([]);
    });
  });

  describe('getActivityLogsByUser - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByUser(mockDB, siteId, 'user-1');
      expect(result).toEqual([]);
    });
  });

  describe('getActivityLogsByEntity - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByEntity(mockDB, siteId, 'order', 'order-123');
      expect(result).toEqual([]);
    });
  });

  describe('getActivityLogsByAction - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: null, success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActivityLogsByAction(mockDB, siteId, 'order.%');
      expect(result).toEqual([]);
    });
  });

  describe('deleteOldActivityLogs - meta undefined', () => {
    it('should return 0 when meta is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: undefined, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteOldActivityLogs(mockDB, siteId, 90);
      expect(result).toBe(0);
    });
  });
});
