/**
 * Server-side sessions for the site-scoped `users` table (admin/staff login).
 *
 * The browser cookie holds a random bearer token; the database stores only the
 * SHA-256 hash of that token as the session id, so a leaked database dump
 * cannot be replayed as live sessions. Identity, role, permissions and status
 * are read from the `users` row on every request — never from the cookie — so
 * a demotion or deactivation takes effect on the user's next request.
 *
 * Mirrors ./account-sessions.ts, which does the same for platform accounts.
 */

import { executeOne, getCurrentTimestamp } from './connection.js';
import type { DBUser } from './users.js';

export const USER_SESSION_COOKIE = 'user_session';
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface UserSession {
  id: string;
  user_id: string;
  site_id: string;
  expires_at: number;
  created_at: number;
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a session for a user. Returns the raw token to place in the cookie;
 * only its hash is persisted.
 */
export async function createUserSession(
  db: D1Database,
  userId: string,
  siteId: string,
  ttlSeconds: number = USER_SESSION_TTL_SECONDS
): Promise<{ token: string; session: UserSession }> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const id = await hashToken(token);
  const now = getCurrentTimestamp();
  const expiresAt = now + ttlSeconds;

  await db
    .prepare(
      `INSERT INTO user_sessions (id, user_id, site_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, userId, siteId, expiresAt, now)
    .run();

  return {
    token,
    session: { id, user_id: userId, site_id: siteId, expires_at: expiresAt, created_at: now }
  };
}

/**
 * Resolve a raw cookie token to its user. Returns null for unknown, expired or
 * no-longer-active sessions; expired rows are deleted on sight.
 */
export async function getUserBySessionToken(
  db: D1Database,
  token: string
): Promise<{ user: DBUser; session: UserSession } | null> {
  const id = await hashToken(token);
  const session = await executeOne<UserSession>(db, 'SELECT * FROM user_sessions WHERE id = ?', [
    id
  ]);
  if (!session) {
    return null;
  }

  if (session.expires_at <= getCurrentTimestamp()) {
    await db.prepare('DELETE FROM user_sessions WHERE id = ?').bind(id).run();
    return null;
  }

  const user = await executeOne<DBUser>(db, 'SELECT * FROM users WHERE id = ? AND site_id = ?', [
    session.user_id,
    session.site_id
  ]);
  if (!user) {
    return null;
  }

  // A suspended/expired/inactive user keeps their cookie but loses their
  // session — the old JSON cookie froze `status` at sign-in time.
  if (user.status !== 'active') {
    return null;
  }

  return { user, session };
}

export async function deleteUserSession(db: D1Database, token: string): Promise<void> {
  const id = await hashToken(token);
  await db.prepare('DELETE FROM user_sessions WHERE id = ?').bind(id).run();
}

export async function deleteUserSessionsForUser(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
}

export async function deleteExpiredUserSessions(db: D1Database): Promise<number> {
  const result = await db
    .prepare('DELETE FROM user_sessions WHERE expires_at <= ?')
    .bind(getCurrentTimestamp())
    .run();
  return result.meta?.changes || 0;
}
