/**
 * Site provisioning for platform accounts (tenancy plan T2): create a site,
 * grant the creator ownership, and attach the free platform subdomain.
 */

import { createSite, type Site } from './db/sites.js';
import { executeOne } from './db/connection.js';
import { addSiteMember } from './db/site-members.js';
import { addSiteDomain } from './db/site-domains.js';
import { validateSlug } from './slugs.js';
import { purgeRouteCache } from './site-routing.js';

/**
 * The wildcard domain platform subdomains live under (slug.<domain>).
 * Falls back to `localhost` in development, where slug.localhost resolves to
 * 127.0.0.1 in modern browsers.
 */
export function getPlatformSitesDomain(env: Record<string, unknown> | undefined): string {
  return (env?.PLATFORM_SITES_DOMAIN as string) || 'localhost';
}

export async function isSlugTaken(db: D1Database, slug: string): Promise<boolean> {
  const row = await executeOne<{ id: string }>(db, 'SELECT id FROM sites WHERE slug = ?', [slug]);
  return row !== null;
}

export interface CreateSiteForAccountResult {
  site?: Site;
  hostname?: string;
  error?: string;
}

export async function createSiteForAccount(
  db: D1Database,
  kv: KVNamespace | undefined,
  accountId: string,
  name: string,
  slug: string,
  platformSitesDomain: string
): Promise<CreateSiteForAccountResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: 'Site name is required' };
  }

  const slugCheck = validateSlug(slug);
  if (!slugCheck.valid) {
    return { error: slugCheck.error };
  }

  if (await isSlugTaken(db, slug)) {
    return { error: 'This site name is already taken' };
  }

  const hostname = `${slug}.${platformSitesDomain}`;

  // sites.domain is still NOT NULL/UNIQUE; mirror the platform hostname there
  // until the legacy column is dropped.
  const site = await createSite(db, { name: trimmedName, domain: hostname });

  await db.prepare('UPDATE sites SET slug = ? WHERE id = ?').bind(slug, site.id).run();

  await addSiteMember(db, site.id, accountId, 'owner');

  await addSiteDomain(db, {
    site_id: site.id,
    hostname,
    kind: 'platform',
    is_primary: true,
    status: 'active'
  });

  await purgeRouteCache(kv, hostname);

  return { site: { ...site, slug } as Site, hostname };
}
