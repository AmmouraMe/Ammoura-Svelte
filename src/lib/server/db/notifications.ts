/**
 * Notifications repository with multi-tenant support
 * Handles in-app notifications for users
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export type NotificationType =
  | 'account_expiring'
  | 'account_expired'
  | 'account_deactivated'
  | 'permission_changed'
  | 'role_updated'
  | 'password_reset'
  | 'system_announcement'
  // A paid order never reached its fulfillment provider — see
  // src/lib/server/fulfillment/relay-runner.ts.
  | 'fulfillment_failed';

export interface Notification {
  id: string;
  site_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: string | null; // JSON string
  is_read: number; // 0 or 1
  read_at: number | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  created_at: number;
  expires_at: number | null;
}

export interface NotificationMetadata {
  [key: string]: unknown;
  user_name?: string;
  expiration_date?: number;
  days_until_expiration?: number;
}

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string | null;
  expires_at?: number | null;
}

/**
 * Create a new notification (scoped by site)
 */
export async function createNotification(
  db: D1Database,
  siteId: string,
  data: CreateNotificationData
): Promise<Notification> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

  await db
    .prepare(
      `INSERT INTO notifications (id, site_id, user_id, type, title, message, metadata, 
       priority, action_url, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.user_id,
      data.type,
      data.title,
      data.message,
      metadata,
      data.priority || 'normal',
      data.action_url || null,
      data.expires_at || null,
      timestamp
    )
    .run();

  const notification = await executeOne<Notification>(
    db,
    'SELECT * FROM notifications WHERE id = ? AND site_id = ?',
    [id, siteId]
  );
  if (!notification) {
    throw new Error('Failed to create notification');
  }
  return notification;
}

/**
 * Get a notification by ID (scoped by site)
 */
export async function getNotificationById(
  db: D1Database,
  siteId: string,
  notificationId: string
): Promise<Notification | null> {
  return await executeOne<Notification>(
    db,
    'SELECT * FROM notifications WHERE id = ? AND site_id = ?',
    [notificationId, siteId]
  );
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  db: D1Database,
  siteId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  const result = await execute<Notification>(
    db,
    `SELECT * FROM notifications 
     WHERE site_id = ? AND user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [siteId, userId, limit, offset]
  );
  return result.results || [];
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<Notification[]> {
  const result = await execute<Notification>(
    db,
    `SELECT * FROM notifications 
     WHERE site_id = ? AND user_id = ? AND is_read = 0 
     ORDER BY priority DESC, created_at DESC`,
    [siteId, userId]
  );
  return result.results || [];
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadNotificationCount(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<number> {
  const result = await executeOne<{ count: number }>(
    db,
    'SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND user_id = ? AND is_read = 0',
    [siteId, userId]
  );
  return result?.count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  db: D1Database,
  siteId: string,
  notificationId: string
): Promise<boolean> {
  const timestamp = getCurrentTimestamp();
  const result = await db
    .prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND site_id = ?')
    .bind(timestamp, notificationId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<number> {
  const timestamp = getCurrentTimestamp();
  const result = await db
    .prepare(
      'UPDATE notifications SET is_read = 1, read_at = ? WHERE site_id = ? AND user_id = ? AND is_read = 0'
    )
    .bind(timestamp, siteId, userId)
    .run();
  return result.meta?.changes || 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  db: D1Database,
  siteId: string,
  notificationId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM notifications WHERE id = ? AND site_id = ?')
    .bind(notificationId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Delete expired notifications
 */
export async function deleteExpiredNotifications(
  db: D1Database,
  siteId: string,
  currentTimestamp?: number
): Promise<number> {
  const now = currentTimestamp || getCurrentTimestamp();
  const result = await db
    .prepare(
      'DELETE FROM notifications WHERE site_id = ? AND expires_at IS NOT NULL AND expires_at < ?'
    )
    .bind(siteId, now)
    .run();
  return result.meta?.changes || 0;
}

/**
 * Delete old read notifications (retention policy)
 */
export async function deleteOldReadNotifications(
  db: D1Database,
  siteId: string,
  daysToKeep: number
): Promise<number> {
  const timestamp = getCurrentTimestamp() - daysToKeep * 86400;
  const result = await db
    .prepare('DELETE FROM notifications WHERE site_id = ? AND is_read = 1 AND read_at < ?')
    .bind(siteId, timestamp)
    .run();
  return result.meta?.changes || 0;
}

/**
 * Create bulk notifications for multiple users
 */
export async function createBulkNotifications(
  db: D1Database,
  siteId: string,
  userIds: string[],
  data: Omit<CreateNotificationData, 'user_id'>
): Promise<number> {
  let created = 0;
  for (const userId of userIds) {
    try {
      await createNotification(db, siteId, { ...data, user_id: userId });
      created++;
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error);
    }
  }
  return created;
}
