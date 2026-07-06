import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, getSiteDomainById } from '$lib/server/db';
import { requireSiteRole } from '$lib/server/account-guard';
import { refreshDomainStatus, removeCustomDomain } from '$lib/server/domains-service';

async function authorize(
  db: D1Database,
  locals: App.Locals,
  siteId: string,
  domainId: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const access = await requireSiteRole(db, locals.account, siteId);
  if (!access) {
    return { ok: false, status: 403, error: 'Not authorized' };
  }
  const domain = await getSiteDomainById(db, domainId);
  if (!domain || domain.site_id !== siteId) {
    return { ok: false, status: 404, error: 'Domain not found' };
  }
  return { ok: true };
}

/**
 * Re-check provisioning status with Cloudflare (poll-on-demand).
 */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
  const db = getDB(platform);
  const auth = await authorize(db, locals, params.siteId, params.domainId);
  if (!auth.ok) {
    return json({ success: false, error: auth.error }, { status: auth.status });
  }

  const result = await refreshDomainStatus(
    db,
    platform?.env?.SITE_ROUTES,
    platform?.env as Record<string, unknown> | undefined,
    params.domainId
  );

  if (result.error) {
    return json({ success: false, error: result.error }, { status: 400 });
  }
  return json({ success: true, domain: result.domain, instructions: result.instructions });
};

/**
 * Detach a custom domain from the site.
 */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  const db = getDB(platform);
  const auth = await authorize(db, locals, params.siteId, params.domainId);
  if (!auth.ok) {
    return json({ success: false, error: auth.error }, { status: auth.status });
  }

  const result = await removeCustomDomain(
    db,
    platform?.env?.SITE_ROUTES,
    platform?.env as Record<string, unknown> | undefined,
    params.domainId
  );

  if (!result.success) {
    return json({ success: false, error: result.error }, { status: 400 });
  }
  return json({ success: true });
};
