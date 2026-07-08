import type { Handle } from '@sveltejs/kit';
import { getDB, getAccountBySessionToken } from '$lib/server/db';
import { ACCOUNT_SESSION_COOKIE } from '$lib/server/db/account-sessions';
import { resolveSiteIdForHostname } from '$lib/server/site-routing';
import { dev } from '$app/environment';
import type { DBUser } from '$lib/server/db/users';

/**
 * SvelteKit hooks for multi-tenant site handling and authentication
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Get the hostname from the request
  const hostname = event.url.hostname;

  // Resolve the site from the hostname via site_domains (KV-cached when a
  // SITE_ROUTES namespace is bound), falling back to the legacy sites.domain
  // column. Unknown hosts still fall back to 'default-site' until the strict
  // 404 cutover (tenancy plan §2.3 / §6).
  let siteId = 'default-site';

  // DEV-ONLY: path-based subdomain simulation.
  // In production, tenant sites live at NAME.ammoura.me. In dev the wildcard
  // DNS doesn't exist, so we simulate it via /subdomain/NAME/[...rest].
  // Strip the prefix and resolve the site by slug before normal hostname routing.
  let devSubdomainResolved = false;
  if (dev) {
    const subdomainMatch = event.url.pathname.match(/^\/subdomain\/([^/]+)(\/.*)?$/);
    if (subdomainMatch) {
      const slug = subdomainMatch[1];
      const rest = subdomainMatch[2] || '/';

      if (event.platform?.env?.DB) {
        try {
          const db = getDB(event.platform);
          const row = await db
            .prepare('SELECT id FROM sites WHERE slug = ? LIMIT 1')
            .bind(slug)
            .first<{ id: string }>();
          if (row) {
            siteId = row.id;
            devSubdomainResolved = true;
          }
        } catch {
          // ignore — fallback to hostname resolution below
        }
      }

      // Rewrite the URL so SvelteKit routes to the correct page
      event.url.pathname = rest;
    }
  }

  if (!devSubdomainResolved) {
    try {
      if (event.platform?.env?.DB) {
        const db = getDB(event.platform);
        const kv = event.platform.env.SITE_ROUTES as KVNamespace | undefined;
        const resolved = await resolveSiteIdForHostname(db, kv, hostname);

        if (resolved) {
          siteId = resolved;
        }
      }
    } catch (error) {
      // Only log error in production; in dev, database might not be set up yet
      if (!dev) {
        console.error('Error loading site context:', error);
      }
      // Continue with default site on error
    }
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
