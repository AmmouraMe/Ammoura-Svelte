import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDB, getSiteById } from '$lib/server/db';
import { requireSiteRole } from '$lib/server/account-guard';
import { listDomainsForSite, getConnectTarget } from '$lib/server/domains-service';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  if (!locals.account) {
    throw redirect(302, '/account/login');
  }

  const db = getDB(platform);
  const access = await requireSiteRole(db, locals.account, params.siteId);
  if (!access) {
    throw error(403, 'You do not have access to this site');
  }

  const site = await getSiteById(db, params.siteId);
  if (!site) {
    throw error(404, 'Site not found');
  }

  const domains = await listDomainsForSite(db, params.siteId);

  return {
    site: { id: site.id, name: site.name, slug: site.slug },
    domains,
    connectTarget: getConnectTarget(platform?.env as Record<string, unknown> | undefined)
  };
};
