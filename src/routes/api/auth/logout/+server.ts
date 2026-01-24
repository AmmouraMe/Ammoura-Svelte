import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db';
import { logActivity } from '$lib/server/activity-logger';

async function performLogout(
  cookies: Parameters<RequestHandler>[0]['cookies'],
  request: Request,
  platform: App.Platform | undefined,
  locals: App.Locals
): Promise<void> {
  // Get user session before deleting cookies
  const userSessionCookie = cookies.get('user_session');
  let user: { id: string; name: string } | null = null;

  if (userSessionCookie) {
    try {
      const sessionData = JSON.parse(userSessionCookie);
      user = { id: sessionData.id, name: sessionData.name };
    } catch (error) {
      console.error('Failed to parse user session:', error);
    }
  } else if (locals.currentUser) {
    user = { id: locals.currentUser.id, name: locals.currentUser.name };
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

  // Delete all session cookies
  cookies.delete('user_session', { path: '/' });
  cookies.delete('admin_session', { path: '/' });
  cookies.delete('engineer_session', { path: '/' });
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
