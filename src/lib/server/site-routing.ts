/**
 * Hostname → site resolution for multi-tenant routing (tenancy plan §2.3).
 *
 * Lookup order: KV cache (when a SITE_ROUTES namespace is bound) → site_domains
 * → legacy sites.domain column. Cache entries are short-lived and explicitly
 * purged whenever a domain changes, so DNS-level changes propagate quickly.
 */

import { getActiveSiteIdForHostname, normalizeHostname } from './db/site-domains.js';
import { getSiteByDomain } from './db/sites.js';

export const ROUTE_CACHE_TTL_SECONDS = 300;
const NEGATIVE_RESULT = '__none__';

function cacheKey(hostname: string): string {
  return `host:${hostname}`;
}

export async function resolveSiteIdForHostname(
  db: D1Database,
  kv: KVNamespace | undefined,
  rawHostname: string
): Promise<string | null> {
  const hostname = normalizeHostname(rawHostname);
  if (!hostname) {
    return null;
  }

  if (kv) {
    const cached = await kv.get(cacheKey(hostname));
    if (cached === NEGATIVE_RESULT) {
      return null;
    }
    if (cached) {
      return cached;
    }
  }

  let siteId = await getActiveSiteIdForHostname(db, hostname);

  if (!siteId) {
    // Legacy path: sites created before site_domains existed
    const site = await getSiteByDomain(db, hostname);
    if (site && site.status === 'active') {
      siteId = site.id;
    }
  }

  if (kv) {
    await kv.put(cacheKey(hostname), siteId || NEGATIVE_RESULT, {
      expirationTtl: ROUTE_CACHE_TTL_SECONDS
    });
  }

  return siteId;
}

/**
 * Purge a hostname from the route cache. Call whenever a site_domains row
 * changes status, is added, or is removed.
 */
export async function purgeRouteCache(
  kv: KVNamespace | undefined,
  hostname: string
): Promise<void> {
  if (kv) {
    await kv.delete(cacheKey(normalizeHostname(hostname)));
  }
}
