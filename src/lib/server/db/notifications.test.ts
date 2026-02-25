import { describe, it, expect, vi } from 'vitest';
import {
  createNotification,
  getNotificationById,
  getUserNotifications,
  getUnreadNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteExpiredNotifications,
  deleteOldReadNotifications,
  createBulkNotifications,
  type Notification
} from './notifications';

describe('Notifications Repository', () => {
  const siteId = 'test-site';
  const userId = 'user-1';

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        site_id: siteId,
        user_id: userId,
        type: 'account_expiring',
        title: 'Account Expiring Soon',
        message: 'Your account will expire in 7 days',
        metadata: null,
        is_read: 0,
        read_at: null,
        priority: 'normal',
        action_url: null,
        created_at: 1234567890,
        expires_at: null
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockFirst = vi.fn().mockResolvedValue(mockNotification);
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

      const result = await createNotification(mockDB, siteId, {
        user_id: userId,
        type: 'account_expiring',
        title: 'Account Expiring Soon',
        message: 'Your account will expire in 7 days'
      });

      expect(result).toEqual(mockNotification);
    });
  });

  describe('getNotificationById', () => {
    it('should get a notification by ID', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        site_id: siteId,
        user_id: userId,
        type: 'account_expiring',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        is_read: 0,
        read_at: null,
        priority: 'normal',
        action_url: null,
        created_at: 1234567890,
        expires_at: null
      };

      const mockFirst = vi.fn().mockResolvedValue(mockNotification);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getNotificationById(mockDB, siteId, 'notif-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE id = ? AND site_id = ?'
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getUserNotifications', () => {
    it('should get all notifications for a user', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          site_id: siteId,
          user_id: userId,
          type: 'account_expiring',
          title: 'Test',
          message: 'Test message',
          metadata: null,
          is_read: 0,
          read_at: null,
          priority: 'normal',
          action_url: null,
          created_at: 1234567890,
          expires_at: null
        }
      ];

      const mockResults = { results: mockNotifications, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserNotifications(mockDB, siteId, userId, 50, 0);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND user_id = ?')
      );
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getUnreadNotifications', () => {
    it('should get unread notifications for a user', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          site_id: siteId,
          user_id: userId,
          type: 'account_expiring',
          title: 'Test',
          message: 'Test message',
          metadata: null,
          is_read: 0,
          read_at: null,
          priority: 'urgent',
          action_url: null,
          created_at: 1234567890,
          expires_at: null
        }
      ];

      const mockResults = { results: mockNotifications, success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUnreadNotifications(mockDB, siteId, userId);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND user_id = ? AND is_read = 0')
      );
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockResult = { meta: { changes: 1 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await markNotificationAsRead(mockDB, siteId, 'notif-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND site_id = ?'
      );
      expect(result).toBe(true);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const mockResult = { meta: { changes: 5 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await markAllNotificationsAsRead(mockDB, siteId, userId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'UPDATE notifications SET is_read = 1, read_at = ? WHERE site_id = ? AND user_id = ? AND is_read = 0'
      );
      expect(result).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const mockResult = { meta: { changes: 1 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteNotification(mockDB, siteId, 'notif-1');

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE id = ? AND site_id = ?'
      );
      expect(result).toBe(true);
    });
  });

  describe('deleteExpiredNotifications', () => {
    it('should delete expired notifications', async () => {
      const mockResult = { meta: { changes: 3 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteExpiredNotifications(mockDB, siteId);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND expires_at IS NOT NULL AND expires_at < ?')
      );
      expect(result).toBe(3);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 5 });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUnreadNotificationCount(mockDB, siteId, userId);

      expect(mockPrepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND user_id = ? AND is_read = 0'
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ count: 0 });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUnreadNotificationCount(mockDB, siteId, userId);

      expect(result).toBe(0);
    });

    it('should return 0 when result is null', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUnreadNotificationCount(mockDB, siteId, userId);

      expect(result).toBe(0);
    });
  });

  describe('deleteOldReadNotifications', () => {
    it('should delete read notifications older than specified days', async () => {
      const mockResult = { meta: { changes: 10 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteOldReadNotifications(mockDB, siteId, 30);

      expect(mockPrepare).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE site_id = ? AND is_read = 1 AND read_at < ?'
      );
      expect(result).toBe(10);
    });

    it('should return 0 when no old read notifications', async () => {
      const mockResult = { meta: { changes: 0 }, success: true };
      const mockRun = vi.fn().mockResolvedValue(mockResult);
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteOldReadNotifications(mockDB, siteId, 7);

      expect(result).toBe(0);
    });
  });

  describe('createBulkNotifications', () => {
    it('should create notifications for multiple users', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        site_id: siteId,
        user_id: 'user-1',
        type: 'system_announcement',
        title: 'Announcement',
        message: 'System update',
        metadata: null,
        is_read: 0,
        read_at: null,
        priority: 'normal',
        action_url: null,
        created_at: 1234567890,
        expires_at: null
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockNotification);
      const mockBindSelect = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return { bind: mockBind };
          }
          return { bind: mockBindSelect };
        })
      } as unknown as D1Database;

      const result = await createBulkNotifications(mockDB, siteId, ['user-1', 'user-2', 'user-3'], {
        type: 'system_announcement',
        title: 'Announcement',
        message: 'System update'
      });

      expect(result).toBe(3);
    });

    it('should handle partial failures in bulk creation', async () => {
      let callCount = 0;
      const mockNotification: Notification = {
        id: 'notif-1',
        site_id: siteId,
        user_id: 'user-1',
        type: 'system_announcement',
        title: 'Announcement',
        message: 'System update',
        metadata: null,
        is_read: 0,
        read_at: null,
        priority: 'normal',
        action_url: null,
        created_at: 1234567890,
        expires_at: null
      };

      const mockDB = {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith('INSERT')) {
            callCount++;
            if (callCount === 2) {
              return {
                bind: vi.fn().mockReturnValue({
                  run: vi.fn().mockRejectedValue(new Error('DB error'))
                })
              };
            }
            return {
              bind: vi.fn().mockReturnValue({
                run: vi.fn().mockResolvedValue({ success: true })
              })
            };
          }
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockNotification)
            })
          };
        })
      } as unknown as D1Database;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await createBulkNotifications(mockDB, siteId, ['user-1', 'user-2', 'user-3'], {
        type: 'system_announcement',
        title: 'Announcement',
        message: 'System update'
      });

      expect(result).toBe(2);
      consoleSpy.mockRestore();
    });

    it('should return 0 for empty user list', async () => {
      const mockDB = {} as unknown as D1Database;
      const result = await createBulkNotifications(mockDB, siteId, [], {
        type: 'system_announcement',
        title: 'Test',
        message: 'Test'
      });

      expect(result).toBe(0);
    });
  });

  describe('createNotification - failure branch', () => {
    it('should throw when re-fetch returns null', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const _mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null); // re-fetch fails

      const mockDB = {
        prepare: vi.fn().mockImplementation(() => ({
          bind: vi.fn().mockReturnValue({
            run: mockRun,
            first: mockFirst
          })
        }))
      } as unknown as D1Database;

      await expect(
        createNotification(mockDB, siteId, {
          user_id: userId,
          type: 'account_expiring',
          title: 'Test',
          message: 'Test'
        })
      ).rejects.toThrow('Failed to create notification');
    });
  });

  describe('createNotification - priority branch', () => {
    it('should use provided priority instead of default', async () => {
      const mockNotification: Notification = {
        id: 'notif-1',
        site_id: siteId,
        user_id: userId,
        type: 'account_expiring',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        is_read: 0,
        read_at: null,
        priority: 'high',
        action_url: '/dashboard',
        created_at: 1234567890,
        expires_at: 9999999999
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockFirst = vi.fn().mockResolvedValue(mockNotification);

      const mockDB = {
        prepare: vi.fn().mockImplementation((sql: string) => {
          if (sql.startsWith('INSERT')) {
            return { bind: vi.fn().mockReturnValue({ run: mockRun }) };
          }
          return { bind: vi.fn().mockReturnValue({ first: mockFirst }) };
        })
      } as unknown as D1Database;

      const result = await createNotification(mockDB, siteId, {
        user_id: userId,
        type: 'account_expiring',
        title: 'Test',
        message: 'Test message',
        priority: 'high',
        action_url: '/dashboard',
        expires_at: 9999999999
      });

      expect(result.priority).toBe('high');
    });
  });

  describe('getUserNotifications - undefined results fallback', () => {
    it('should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUserNotifications(mockDB, siteId, userId);

      expect(result).toEqual([]);
    });
  });

  describe('getUnreadNotifications - undefined results fallback', () => {
    it('should return empty array when results is undefined', async () => {
      const mockAll = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getUnreadNotifications(mockDB, siteId, userId);

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationAsRead - zero changes', () => {
    it('should return false when meta changes is 0', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await markNotificationAsRead(mockDB, siteId, 'notif-1');

      expect(result).toBe(false);
    });

    it('should return false when meta is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await markNotificationAsRead(mockDB, siteId, 'notif-1');

      expect(result).toBe(false);
    });
  });

  describe('deleteNotification meta fallback', () => {
    it('should return false when meta.changes is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: {} });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteNotification(mockDB, siteId, 'notif-1');

      expect(result).toBe(false);
    });

    it('should return false when meta is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteNotification(mockDB, siteId, 'notif-1');

      expect(result).toBe(false);
    });
  });

  describe('deleteExpiredNotifications meta fallback', () => {
    it('should return 0 when meta.changes is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: {} });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteExpiredNotifications(mockDB, siteId);

      expect(result).toBe(0);
    });
  });

  describe('markAllNotificationsAsRead meta fallback', () => {
    it('should return 0 when meta.changes is undefined', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: {} });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await markAllNotificationsAsRead(mockDB, siteId, 'user-1');

      expect(result).toBe(0);
    });
  });

  describe('createNotification without metadata', () => {
    it('should pass null metadata when metadata is not provided', async () => {
      const mockNotification = {
        id: 'notif-new',
        site_id: siteId,
        user_id: 'user-1',
        type: 'system_announcement',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        priority: 'normal',
        is_read: 0,
        action_url: null,
        expires_at: null,
        created_at: 1000
      };
      const mockFirst = vi.fn().mockResolvedValue(mockNotification);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await createNotification(mockDB, siteId, {
        user_id: 'user-1',
        type: 'system_announcement',
        title: 'Test',
        message: 'Test message'
      });

      expect(result).toBeDefined();
      expect(result.metadata).toBeNull();
    });
  });

  describe('getNotificationById not found', () => {
    it('should return null when notification does not exist', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getNotificationById(mockDB, siteId, 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
