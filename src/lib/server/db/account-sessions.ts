/**
 * Server-side sessions for platform accounts.
 *
 * The browser cookie holds a random bearer token; the database stores only the
 * SHA-256 hash of that token as the session id, so a leaked database dump
 * cannot be replayed as live sessions.
 */

import { executeOne, getCurrentTimestamp } from './connection.js';
import type { Account } from './accounts.js';

export const ACCOUNT_SESSION_COOKIE = 'account_session';
export const ACCOUNT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AccountSession {
  id: string;
  account_id: string;
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
 * Create a session for an account. Returns the raw token to place in the
 * cookie; only its hash is persisted.
 */
export async function createAccountSession(
  db: D1Database,
  accountId: string,
  ttlSeconds: number = ACCOUNT_SESSION_TTL_SECONDS
): Promise<{ token: string; session: AccountSession }> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const id = await hashToken(token);
  const now = getCurrentTimestamp();
  const expiresAt = now + ttlSeconds;

  await db
    .prepare(
      `INSERT INTO account_sessions (id, account_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, accountId, expiresAt, now)
    .run();

  return {
    token,
    session: { id, account_id: accountId, expires_at: expiresAt, created_at: now }
  };
}

/**
 * Resolve a raw cookie token to its account. Returns null for unknown or
 * expired tokens; expired rows are deleted on sight.
 */
export async function getAccountBySessionToken(
  db: D1Database,
  token: string
): Promise<{ account: Account; session: AccountSession } | null> {
  const id = await hashToken(token);
  const session = await executeOne<AccountSession>(
    db,
    'SELECT * FROM account_sessions WHERE id = ?',
    [id]
  );
  if (!session) {
    return null;
  }

  if (session.expires_at <= getCurrentTimestamp()) {
    await db.prepare('DELETE FROM account_sessions WHERE id = ?').bind(id).run();
    return null;
  }

  const account = await executeOne<Account>(db, 'SELECT * FROM accounts WHERE id = ?', [
    session.account_id
  ]);
  if (!account) {
    return null;
  }

  return { account, session };
}

export async function deleteAccountSession(db: D1Database, token: string): Promise<void> {
  const id = await hashToken(token);
  await db.prepare('DELETE FROM account_sessions WHERE id = ?').bind(id).run();
}

export async function deleteAccountSessionsForAccount(
  db: D1Database,
  accountId: string
): Promise<void> {
  await db.prepare('DELETE FROM account_sessions WHERE account_id = ?').bind(accountId).run();
}

export async function deleteExpiredAccountSessions(db: D1Database): Promise<number> {
  const result = await db
    .prepare('DELETE FROM account_sessions WHERE expires_at <= ?')
    .bind(getCurrentTimestamp())
    .run();
  return result.meta?.changes || 0;
}
