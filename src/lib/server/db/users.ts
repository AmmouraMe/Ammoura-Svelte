/**
 * Users repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export type UserRole = 'admin' | 'user' | 'customer' | 'platform_engineer';
export type UserStatus = 'active' | 'inactive' | 'expired' | 'suspended';

export interface DBUser {
  id: string;
  site_id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  permissions: string; // JSON array
  status: UserStatus;
  expiration_date: number | null;
  grace_period_days: number;
  last_login_at: number | null;
  last_login_ip: string | null;
  /** Admin UI language preference; NULL/absent = follow site/browser resolution */
  locale?: string | null;
  created_at: number;
  updated_at: number;
  created_by: string | null;
  updated_by: string | null;
}

export interface CreateUserData {
  email: string;
  name: string;
  password_hash: string;
  role?: UserRole;
  permissions?: string[];
  status?: UserStatus;
  expiration_date?: number | null;
  grace_period_days?: number;
  created_by?: string | null;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password_hash?: string;
  role?: UserRole;
  permissions?: string[];
  status?: UserStatus;
  expiration_date?: number | null;
  grace_period_days?: number;
  last_login_at?: number | null;
  last_login_ip?: string | null;
  locale?: string | null;
  updated_by?: string | null;
}

/**
 * Get a user by ID (scoped by site)
 */
export async function getUserById(
  db: D1Database,
  siteId: string,
  userId: string
): Promise<DBUser | null> {
  return await executeOne<DBUser>(db, 'SELECT * FROM users WHERE id = ? AND site_id = ?', [
    userId,
    siteId
  ]);
}

/**
 * Get a user by email (scoped by site)
 */
export async function getUserByEmail(
  db: D1Database,
  siteId: string,
  email: string
): Promise<DBUser | null> {
  return await executeOne<DBUser>(db, 'SELECT * FROM users WHERE email = ? AND site_id = ?', [
    email,
    siteId
  ]);
}

/**
 * Get all users for a site
 */
export async function getAllUsers(db: D1Database, siteId: string): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    'SELECT * FROM users WHERE site_id = ? ORDER BY created_at DESC',
    [siteId]
  );
  return result.results || [];
}

/**
 * Get users by role (scoped by site)
 */
export async function getUsersByRole(
  db: D1Database,
  siteId: string,
  role: 'admin' | 'user' | 'customer' | 'platform_engineer'
): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    'SELECT * FROM users WHERE site_id = ? AND role = ? ORDER BY created_at DESC',
    [siteId, role]
  );
  return result.results || [];
}

/**
 * Create a new user (scoped by site)
 */
export async function createUser(
  db: D1Database,
  siteId: string,
  data: CreateUserData
): Promise<DBUser> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const permissions = data.permissions ? JSON.stringify(data.permissions) : '[]';

  await db
    .prepare(
      `INSERT INTO users (id, site_id, email, name, password_hash, role, permissions, status, 
       expiration_date, grace_period_days, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.email,
      data.name,
      data.password_hash,
      data.role || 'customer',
      permissions,
      data.status || 'active',
      data.expiration_date || null,
      data.grace_period_days || 0,
      timestamp,
      timestamp,
      data.created_by || null
    )
    .run();

  const user = await getUserById(db, siteId, id);
  if (!user) {
    throw new Error('Failed to create user');
  }
  return user;
}

/**
 * Update a user (scoped by site)
 */
export async function updateUser(
  db: D1Database,
  siteId: string,
  userId: string,
  data: UpdateUserData
): Promise<DBUser | null> {
  const user = await getUserById(db, siteId, userId);
  if (!user) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email);
  }
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.password_hash !== undefined) {
    updates.push('password_hash = ?');
    params.push(data.password_hash);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    params.push(data.role);
  }
  if (data.permissions !== undefined) {
    updates.push('permissions = ?');
    params.push(JSON.stringify(data.permissions));
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.expiration_date !== undefined) {
    updates.push('expiration_date = ?');
    params.push(data.expiration_date);
  }
  if (data.grace_period_days !== undefined) {
    updates.push('grace_period_days = ?');
    params.push(data.grace_period_days);
  }
  if (data.last_login_at !== undefined) {
    updates.push('last_login_at = ?');
    params.push(data.last_login_at);
  }
  if (data.last_login_ip !== undefined) {
    updates.push('last_login_ip = ?');
    params.push(data.last_login_ip);
  }
  if (data.locale !== undefined) {
    updates.push('locale = ?');
    params.push(data.locale);
  }
  if (data.updated_by !== undefined) {
    updates.push('updated_by = ?');
    params.push(data.updated_by);
  }

  if (updates.length === 0) {
    return user;
  }

  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(userId);
  params.push(siteId);

  await db
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getUserById(db, siteId, userId);
}

/**
 * Delete a user (scoped by site)
 */
export async function deleteUser(db: D1Database, siteId: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM users WHERE id = ? AND site_id = ?')
    .bind(userId, siteId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

/**
 * Update user login tracking
 */
export async function updateUserLogin(
  db: D1Database,
  siteId: string,
  userId: string,
  ipAddress: string | null
): Promise<void> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare('UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ? AND site_id = ?')
    .bind(timestamp, ipAddress, userId, siteId)
    .run();
}

/**
 * Get users by status (scoped by site)
 */
export async function getUsersByStatus(
  db: D1Database,
  siteId: string,
  status: UserStatus
): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    'SELECT * FROM users WHERE site_id = ? AND status = ? ORDER BY created_at DESC',
    [siteId, status]
  );
  return result.results || [];
}

/**
 * Get users with expiration dates (for checking expired accounts)
 */
export async function getUsersWithExpiration(db: D1Database, siteId: string): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    `SELECT * FROM users 
     WHERE site_id = ? AND expiration_date IS NOT NULL 
     ORDER BY expiration_date ASC`,
    [siteId]
  );
  return result.results || [];
}

/**
 * Get expired users (accounts past expiration date + grace period)
 */
export async function getExpiredUsers(
  db: D1Database,
  siteId: string,
  currentTimestamp?: number
): Promise<DBUser[]> {
  const now = currentTimestamp || getCurrentTimestamp();
  const result = await execute<DBUser>(
    db,
    `SELECT * FROM users 
     WHERE site_id = ? 
     AND expiration_date IS NOT NULL 
     AND (expiration_date + (grace_period_days * 86400)) <= ?
     AND status = 'active'`,
    [siteId, now]
  );
  return result.results || [];
}

/**
 * Get users expiring soon (within specified days)
 */
export async function getUsersExpiringSoon(
  db: D1Database,
  siteId: string,
  daysAhead: number,
  currentTimestamp?: number
): Promise<DBUser[]> {
  const now = currentTimestamp || getCurrentTimestamp();
  const futureTimestamp = now + daysAhead * 86400; // Convert days to seconds
  const result = await execute<DBUser>(
    db,
    `SELECT * FROM users 
     WHERE site_id = ? 
     AND expiration_date IS NOT NULL 
     AND expiration_date > ?
     AND expiration_date <= ?
     AND status = 'active'
     ORDER BY expiration_date ASC`,
    [siteId, now, futureTimestamp]
  );
  return result.results || [];
}

/**
 * Deactivate expired users
 */
export async function deactivateExpiredUsers(
  db: D1Database,
  siteId: string,
  currentTimestamp?: number
): Promise<number> {
  const now = currentTimestamp || getCurrentTimestamp();
  const result = await db
    .prepare(
      `UPDATE users 
       SET status = 'expired', updated_at = ?
       WHERE site_id = ? 
       AND expiration_date IS NOT NULL 
       AND (expiration_date + (grace_period_days * 86400)) <= ?
       AND status = 'active'`
    )
    .bind(now, siteId, now)
    .run();
  return result.meta?.changes || 0;
}

/**
 * Get admin users (admin, user, platform_engineer roles only)
 */
export async function getAdminUsers(db: D1Database, siteId: string): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    `SELECT * FROM users 
     WHERE site_id = ? 
     AND role IN ('admin', 'user', 'platform_engineer')
     ORDER BY created_at DESC`,
    [siteId]
  );
  return result.results || [];
}

/**
 * Get customer users (users with customer role or who have placed orders)
 */
export async function getCustomerUsers(db: D1Database, siteId: string): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    `SELECT DISTINCT u.* FROM users u
     LEFT JOIN orders o ON u.id = o.user_id AND o.site_id = u.site_id
     WHERE u.site_id = ? 
     AND (u.role = 'customer' OR o.id IS NOT NULL)
     ORDER BY u.created_at DESC`,
    [siteId]
  );
  return result.results || [];
}

/**
 * Get customers who have made purchases
 */
export async function getPurchasingCustomers(db: D1Database, siteId: string): Promise<DBUser[]> {
  const result = await execute<DBUser>(
    db,
    `SELECT DISTINCT u.* FROM users u
     INNER JOIN orders o ON u.id = o.user_id AND o.site_id = u.site_id
     WHERE u.site_id = ?
     ORDER BY u.created_at DESC`,
    [siteId]
  );
  return result.results || [];
}
