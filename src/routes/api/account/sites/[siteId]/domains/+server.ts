import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db';
import { requireSiteRole } from '$lib/server/account-guard';
import { addCustomDomain, listDomainsForSite } from '$lib/server/domains-service';

/**
 * Domains attached to a site (platform subdomain + custom domains).
 * Requires owner/admin membership on the site.
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
  const db = getDB(platform);
  const access = await requireSiteRole(db, locals.account, params.siteId);
  if (!access) {
    return json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const domains = await listDomainsForSite(db, params.siteId);
  return json({ success: true, domains });
};

/**
 * Attach a custom domain to the site. Returns the DNS records the owner must
 * create, plus whether their DNS is hosted on Cloudflare (assisted flow).
 */
export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
  const db = getDB(platform);
  const access = await requireSiteRole(db, locals.account, params.siteId);
  if (!access) {
    return json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  try {
    const data = (await request.json()) as { hostname?: string };
    const result = await addCustomDomain(
      db,
      platform?.env?.SITE_ROUTES,
      platform?.env as Record<string, unknown> | undefined,
      params.siteId,
      data.hostname || ''
    );

    if (result.error) {
      return json({ success: false, error: result.error }, { status: 400 });
    }

    return json({
      success: true,
      domain: result.domain,
      instructions: result.instructions,
      dnsProvider: result.dnsProvider
    });
  } catch (error) {
    console.error('Add domain error:', error);
    return json({ success: false, error: 'An error occurred adding the domain' }, { status: 500 });
  }
};
