import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, getSiteDomainById } from '$lib/server/db';
import { requireSiteRole } from '$lib/server/account-guard';
import { usesCloudflareDns } from '$lib/server/dns';
import { buildTokenCreateUrl } from '$lib/server/cloudflare-dns';
import { connectDomainViaCloudflare } from '$lib/server/assisted-dns-service';

/**
 * Assisted Cloudflare DNS setup (tenancy plan §4.2).
 * GET  → whether the domain's DNS is on Cloudflare + prefilled token URL
 * POST → { token } from the customer; we create the DNS records for them.
 *        The token is used in-memory only — never stored, never logged.
 */
export const GET: RequestHandler = async ({ params, locals, platform }) => {
  const db = getDB(platform);
  const access = await requireSiteRole(db, locals.account, params.siteId);
  if (!access) {
    return json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const domain = await getSiteDomainById(db, params.domainId);
  if (!domain || domain.site_id !== params.siteId || domain.status === 'removed') {
    return json({ success: false, error: 'Domain not found' }, { status: 404 });
  }

  const provider = await usesCloudflareDns(domain.hostname);
  return json({
    success: true,
    cloudflare: provider.cloudflare,
    zone: provider.zone,
    tokenCreateUrl: buildTokenCreateUrl(provider.zone, domain.hostname)
  });
};

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
  const db = getDB(platform);
  const access = await requireSiteRole(db, locals.account, params.siteId);
  if (!access) {
    return json({ success: false, error: 'Not authorized' }, { status: 403 });
  }

  const domain = await getSiteDomainById(db, params.domainId);
  if (!domain || domain.site_id !== params.siteId) {
    return json({ success: false, error: 'Domain not found' }, { status: 404 });
  }

  try {
    const data = (await request.json()) as { token?: string };
    const result = await connectDomainViaCloudflare(
      db,
      platform?.env?.SITE_ROUTES,
      platform?.env as Record<string, unknown> | undefined,
      params.domainId,
      data.token || ''
    );

    if (result.error) {
      return json(
        { success: false, error: result.error, outcomes: result.outcomes },
        { status: 400 }
      );
    }

    return json({
      success: true,
      outcomes: result.outcomes,
      domain: result.domain,
      zone: result.zone
    });
  } catch (error) {
    console.error('Assisted DNS connect error'); // deliberately no error body: it could echo the token
    void error;
    return json({ success: false, error: 'An error occurred. Please try again.' }, { status: 500 });
  }
};
