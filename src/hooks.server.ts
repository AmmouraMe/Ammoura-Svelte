import type { Handle } from '@sveltejs/kit';
import { getDB, getAccountBySessionToken } from '$lib/server/db';
import { ACCOUNT_SESSION_COOKIE } from '$lib/server/db/account-sessions';
import { getLanguageSettings } from '$lib/server/db/site-settings';
import { resolveSiteIdForHostname } from '$lib/server/site-routing';
import { getPlatformSitesDomain } from '$lib/server/sites-service';
import { resolveLocale, isSupportedLocale, LOCALE_COOKIE, DEFAULT_LOCALE } from '$lib/i18n';
import { dev } from '$app/environment';
import type { DBUser } from '$lib/server/db/users';

/**
 * SvelteKit hooks for multi-tenant site handling and authentication
 */

/** Dev-only cookie that pins the origin to one tenant site (see below). */
const DEV_SITE_COOKIE = 'dev_site';

export const handle: Handle = async ({ event, resolve }) => {
  // Get the hostname from the request
  const hostname = event.url.hostname;

  // Resolve the site from the hostname via site_domains (KV-cached when a
  // SITE_ROUTES namespace is bound), falling back to the legacy sites.domain
  // column. Unknown hosts still fall back to 'default-site' until the strict
  // 404 cutover (tenancy plan §2.3 / §6).
  let siteId = 'default-site';

  // DEV-ONLY: tenant-site simulation.
  // In production, tenant sites live at NAME.<PLATFORM_SITES_DOMAIN>. In dev
  // (localhost or the dev tunnel) that wildcard DNS doesn't exist, so
  // /subdomain/NAME sets a cookie and redirects to /; every request on the
  // origin then serves that site — root-relative links, cart and checkout all
  // work. Visit /subdomain with no name to return to the default site.
  // (A URL rewrite via event.url.pathname doesn't work: SvelteKit matches
  // routes on the original URL, so the old prefix approach 404'd.)
  let devSubdomainResolved = false;
  if (dev) {
    const subdomainMatch = event.url.pathname.match(/^\/subdomain(?:\/([^/]+))?(\/.*)?$/);
    if (subdomainMatch) {
      const slug = subdomainMatch[1];
      const rest = subdomainMatch[2] || '/';
      const cookie = slug
        ? event.cookies.serialize(DEV_SITE_COOKIE, slug, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 24
          })
        : event.cookies.serialize(DEV_SITE_COOKIE, '', { path: '/', maxAge: 0 });
      return new Response(null, {
        status: 302,
        headers: { location: slug ? rest : '/', 'set-cookie': cookie }
      });
    }

    const devSlug = event.cookies?.get(DEV_SITE_COOKIE);
    if (devSlug && event.platform?.env?.DB) {
      try {
        const db = getDB(event.platform);
        const row = await db
          .prepare('SELECT id FROM sites WHERE slug = ? LIMIT 1')
          .bind(devSlug)
          .first<{ id: string }>();
        if (row) {
          siteId = row.id;
          devSubdomainResolved = true;
        }
      } catch {
        // ignore — fallback to hostname resolution below
      }
    }
  }

  if (!devSubdomainResolved) {
    try {
      if (event.platform?.env?.DB) {
        const db = getDB(event.platform);
        const kv = event.platform.env.SITE_ROUTES as KVNamespace | undefined;
        const resolved = await resolveSiteIdForHostname(
          db,
          kv,
          hostname,
          getPlatformSitesDomain(event.platform.env as Record<string, unknown>)
        );

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

  // Locale resolution (i18n core): explicit cookie choice → Accept-Language →
  // site default → platform default. The site's language settings come from
  // site_settings; without a DB (early dev) everything falls back to 'en'.
  // Note: in dev the /subdomain simulation shares one locale cookie across
  // simulated tenants (single origin) — harmless.
  let languageSettings = { defaultLocale: DEFAULT_LOCALE, enabledLocales: [DEFAULT_LOCALE] };
  if (event.platform?.env?.DB) {
    try {
      languageSettings = await getLanguageSettings(getDB(event.platform), siteId);
    } catch {
      // defaults above
    }
  }
  const enabledLocales = languageSettings.enabledLocales.filter(isSupportedLocale);
  event.locals.i18n = {
    defaultLocale: languageSettings.defaultLocale,
    enabledLocales: enabledLocales.length ? enabledLocales : [DEFAULT_LOCALE]
  };
  event.locals.locale = resolveLocale({
    cookieLocale: event.cookies?.get(LOCALE_COOKIE),
    acceptLanguage: event.request?.headers?.get('accept-language') ?? null,
    siteDefault: languageSettings.defaultLocale,
    enabledLocales: event.locals.i18n.enabledLocales
  });

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

      // Admin UI language preference: on admin/user surfaces the signed-in
      // user's own locale wins over the site's visitor resolution (it may be
      // any supported locale, not just the site's enabled ones).
      const path = event.url.pathname;
      if (
        userData.locale &&
        isSupportedLocale(userData.locale) &&
        (path.startsWith('/admin') || path.startsWith('/user'))
      ) {
        event.locals.locale = userData.locale;
      }
    } catch (error) {
      console.error('Error parsing user session:', error);
    }
  } else {
    // Check for legacy admin session cookie
    const adminSession = event.cookies?.get('admin_session');
    event.locals.isAdmin = adminSession === 'authenticated';
  }

  return resolve(event, {
    // app.html carries lang="%lang%"; emit the resolved locale
    transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
  });
};
