/**
 * Email verification tokens for platform accounts. The raw token goes into
 * the emailed link; only its SHA-256 hash is stored.
 */

import { executeOne, getCurrentTimestamp } from './connection.js';
import { updateAccount, type Account } from './accounts.js';

export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

interface VerificationTokenRow {
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
 * Create a verification token for an account, replacing any earlier tokens.
 * Returns the raw token for the link.
 */
export async function createEmailVerificationToken(
  db: D1Database,
  accountId: string
): Promise<string> {
  await db
    .prepare('DELETE FROM email_verification_tokens WHERE account_id = ?')
    .bind(accountId)
    .run();

  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = getCurrentTimestamp();
  await db
    .prepare(
      `INSERT INTO email_verification_tokens (id, account_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(await hashToken(token), accountId, now + EMAIL_VERIFICATION_TTL_SECONDS, now)
    .run();

  return token;
}

/**
 * Consume a verification token: marks the account's email verified and
 * deletes the token. Returns the verified account, or null for unknown or
 * expired tokens.
 */
export async function consumeEmailVerificationToken(
  db: D1Database,
  token: string
): Promise<Account | null> {
  const id = await hashToken(token);
  const row = await executeOne<VerificationTokenRow>(
    db,
    'SELECT * FROM email_verification_tokens WHERE id = ?',
    [id]
  );
  if (!row) {
    return null;
  }

  await db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').bind(id).run();

  if (row.expires_at <= getCurrentTimestamp()) {
    return null;
  }

  return await updateAccount(db, row.account_id, {
    email_verified_at: getCurrentTimestamp()
  });
}
