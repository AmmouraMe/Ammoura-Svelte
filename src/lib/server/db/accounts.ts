/**
 * Platform account repository. Accounts are global (not site-scoped) identities
 * that own and manage sites via site_members. See plans/tenancy.md in the
 * Ammoura planning repo.
 */

import { executeOne, generateId, getCurrentTimestamp } from './connection.js';

export interface Account {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  email_verified_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreateAccountData {
  email: string;
  name: string;
  password_hash?: string;
}

export interface UpdateAccountData {
  email?: string;
  name?: string;
  password_hash?: string;
  email_verified_at?: number | null;
}

export async function getAccountById(db: D1Database, id: string): Promise<Account | null> {
  return await executeOne<Account>(db, 'SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function getAccountByEmail(db: D1Database, email: string): Promise<Account | null> {
  return await executeOne<Account>(db, 'SELECT * FROM accounts WHERE email = ? COLLATE NOCASE', [
    email.trim().toLowerCase()
  ]);
}

export async function createAccount(db: D1Database, data: CreateAccountData): Promise<Account> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();

  await db
    .prepare(
      `INSERT INTO accounts (id, email, name, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.email.trim().toLowerCase(),
      data.name.trim(),
      data.password_hash || null,
      timestamp,
      timestamp
    )
    .run();

  const account = await getAccountById(db, id);
  if (!account) {
    throw new Error('Failed to create account');
  }
  return account;
}

export async function updateAccount(
  db: D1Database,
  id: string,
  data: UpdateAccountData
): Promise<Account | null> {
  const account = await getAccountById(db, id);
  if (!account) {
    return null;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email.trim().toLowerCase());
  }
  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.password_hash !== undefined) {
    updates.push('password_hash = ?');
    params.push(data.password_hash);
  }
  if (data.email_verified_at !== undefined) {
    updates.push('email_verified_at = ?');
    params.push(data.email_verified_at);
  }

  if (updates.length === 0) {
    return account;
  }

  updates.push('updated_at = ?');
  params.push(getCurrentTimestamp());
  params.push(id);

  await db
    .prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  return await getAccountById(db, id);
}
