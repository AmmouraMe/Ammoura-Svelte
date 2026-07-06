import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, deleteAccountSession } from '$lib/server/db';
import { ACCOUNT_SESSION_COOKIE } from '$lib/server/db/account-sessions';

/**
 * Platform account logout: revoke the server-side session and clear the cookie.
 */
export const POST: RequestHandler = async ({ cookies, platform }) => {
  const token = cookies.get(ACCOUNT_SESSION_COOKIE);

  if (token) {
    try {
      const db = getDB(platform);
      await deleteAccountSession(db, token);
    } catch (error) {
      console.error('Account logout error:', error);
      // Still clear the cookie below; a stale DB row expires on its own
    }
    cookies.delete(ACCOUNT_SESSION_COOKIE, { path: '/' });
  }

  return json({ success: true });
};
