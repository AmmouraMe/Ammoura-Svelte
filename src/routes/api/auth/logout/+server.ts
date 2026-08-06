import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, deleteAccountSession, deleteUserSession } from '$lib/server/db';
import { ACCOUNT_SESSION_COOKIE } from '$lib/server/db/account-sessions';
import { USER_SESSION_COOKIE } from '$lib/server/db/user-sessions';
import { logActivity } from '$lib/server/activity-logger';

async function performLogout(
  cookies: Parameters<RequestHandler>[0]['cookies'],
  request: Request,
  platform: App.Platform | undefined,
  locals: App.Locals
): Promise<void> {
  // hooks.server.ts has already resolved the token to a user (or to nobody)
  const user = locals.currentUser
    ? { id: locals.currentUser.id, name: locals.currentUser.name }
    : null;

  // Revoke the server-side session so the token is dead even if the browser
  // kept a copy of the cookie.
  const userToken = cookies.get(USER_SESSION_COOKIE);
  if (userToken) {
    try {
      await deleteUserSession(getDB(platform), userToken);
    } catch (error) {
      // Cookie removal below is what logs the browser out; the DB row expires
      console.error('Failed to revoke user session on logout:', error);
    }
  }

  // Log logout if user was logged in (don't fail logout if logging fails)
  if (user) {
    try {
      const db = getDB(platform);
      const ipAddress =
        request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || null;
      const userAgent = request.headers.get('user-agent') || null;

      await logActivity(db, {
        siteId: locals.siteId,
        userId: user.id,
        action: 'user.logout',
        entityType: 'user',
        entityId: user.id,
        entityName: user.name,
        description: 'User logged out',
        ipAddress,
        userAgent
      });
    } catch (error) {
      // Log the error but don't fail the logout
      console.error('Failed to log logout activity:', error);
    }
  }

  // Also revoke the platform account session: the navbar shows the account
  // login too, so "Logout" must clear both kinds of session.
  const accountToken = cookies.get(ACCOUNT_SESSION_COOKIE);
  if (accountToken) {
    try {
      await deleteAccountSession(getDB(platform), accountToken);
    } catch (error) {
      // Cookie removal below is what logs the browser out; the DB row expires
      console.error('Failed to revoke account session on logout:', error);
    }
  }

  // Delete all session cookies. admin_session/engineer_session are no longer
  // issued or trusted, but old browsers may still hold one.
  cookies.delete(USER_SESSION_COOKIE, { path: '/' });
  cookies.delete('admin_session', { path: '/' });
  cookies.delete('engineer_session', { path: '/' });
  cookies.delete(ACCOUNT_SESSION_COOKIE, { path: '/' });
}

// GET handler - allows using a simple link/button to logout
// Redirects to home page (or specified redirect URL) after logout
export const GET: RequestHandler = async ({ cookies, request, platform, locals, url }) => {
  await performLogout(cookies, request, platform, locals);

  // Get redirect URL from query parameter, default to home
  const redirectTo = url.searchParams.get('redirect') || '/';

  redirect(302, redirectTo);
};

export const POST: RequestHandler = async ({ cookies, request, platform, locals }) => {
  await performLogout(cookies, request, platform, locals);

  return json({ success: true });
};
