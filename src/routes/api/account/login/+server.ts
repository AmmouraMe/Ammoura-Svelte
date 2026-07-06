import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { getDB, getAccountByEmail, updateAccount, createAccountSession } from '$lib/server/db';
import {
  ACCOUNT_SESSION_COOKIE,
  ACCOUNT_SESSION_TTL_SECONDS
} from '$lib/server/db/account-sessions';
import { verifyPassword, isLegacyHash, hashPassword } from '$lib/server/password';

/**
 * Platform account login (tenancy plan T1).
 */
export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const data = (await request.json()) as { email?: string; password?: string };

    if (!data.email || !data.password) {
      return json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDB(platform);
    const account = await getAccountByEmail(db, data.email);

    if (!account || !account.password_hash) {
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(data.password, account.password_hash);
    if (!valid) {
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Transparently upgrade any legacy-format hash on successful login
    if (isLegacyHash(account.password_hash)) {
      await updateAccount(db, account.id, { password_hash: await hashPassword(data.password) });
    }

    const { token } = await createAccountSession(db, account.id);
    cookies.set(ACCOUNT_SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: ACCOUNT_SESSION_TTL_SECONDS
    });

    return json({
      success: true,
      account: { id: account.id, email: account.email, name: account.name }
    });
  } catch (error) {
    console.error('Account login error:', error);
    return json({ success: false, error: 'An error occurred during login' }, { status: 500 });
  }
};
