import type { Handle } from '@sveltejs/kit';
import { getDB, getSiteByDomain, getAccountBySessionToken } from '$lib/server/db';
import { ACCOUNT_SESSION_COOKIE } from '$lib/server/db/account-sessions';
import { dev } from '$app/environment';
import type { DBUser } from '$lib/server/db/users';

/**
 * SvelteKit hooks for multi-tenant site handling and authentication
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Get the hostname from the request
  const hostname = event.url.hostname;

  // Try to get the site from the database based on domain
  // In development, default to 'default-site'
  let siteId = 'default-site';

  try {
    if (event.platform?.env?.DB) {
      const db = getDB(event.platform);
      const site = await getSiteByDomain(db, hostname);

      if (site) {
        siteId = site.id;
      }
    }
  } catch (error) {
    // Only log error in production; in dev, database might not be set up yet
    if (!dev) {
      console.error('Error loading site context:', error);
    }
    // Continue with default site on error
  }

  // Set the site ID in locals for use in endpoints and pages
  event.locals.siteId = siteId;

  // Resolve platform account from the server-side session (tenancy plan T1).
  // The cookie holds an opaque token; identity/role always comes from the DB.
  const accountToken = event.cookies?.get(ACCOUNT_SESSION_COOKIE);
  if (accountToken && event.platform?.env?.DB) {
    try {
      const db = getDB(event.platform);
      const result = await getAccountBySessionToken(db, accountToken);
      if (result) {
        event.locals.account = result.account;
      } else {
        event.cookies.delete(ACCOUNT_SESSION_COOKIE, { path: '/' });
      }
    } catch (error) {
      if (!dev) {
        console.error('Error resolving account session:', error);
      }
    }
  }

  // Check for user session cookie and load current user
  const userSession = event.cookies?.get('user_session');
  if (userSession) {
    try {
      const userData = JSON.parse(decodeURIComponent(userSession)) as Partial<DBUser>;
      event.locals.currentUser = userData as DBUser;

      // Set legacy isAdmin flag for backwards compatibility
      event.locals.isAdmin = userData.role === 'admin' || userData.role === 'platform_engineer';
    } catch (error) {
      console.error('Error parsing user session:', error);
    }
  } else {
    // Check for legacy admin session cookie
    const adminSession = event.cookies?.get('admin_session');
    event.locals.isAdmin = adminSession === 'authenticated';
  }

  return resolve(event);
};
