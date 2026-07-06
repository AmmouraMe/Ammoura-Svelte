import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, getSitesForAccount } from '$lib/server/db';
import { createSiteForAccount, getPlatformSitesDomain } from '$lib/server/sites-service';

/**
 * Sites belonging to the signed-in platform account (tenancy plan T2).
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.account) {
    return json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  const db = getDB(platform);
  const sites = await getSitesForAccount(db, locals.account.id);
  return json({ success: true, sites });
};

/**
 * Create a new site owned by the signed-in account. The site goes live
 * immediately on its free platform subdomain.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.account) {
    return json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  try {
    const data = (await request.json()) as { name?: string; slug?: string };
    const db = getDB(platform);
    const kv = platform?.env?.SITE_ROUTES;

    const result = await createSiteForAccount(
      db,
      kv,
      locals.account.id,
      data.name || '',
      (data.slug || '').trim().toLowerCase(),
      getPlatformSitesDomain(platform?.env)
    );

    if (result.error) {
      return json({ success: false, error: result.error }, { status: 400 });
    }

    return json({ success: true, site: result.site, hostname: result.hostname });
  } catch (error) {
    console.error('Site creation error:', error);
    return json({ success: false, error: 'An error occurred creating the site' }, { status: 500 });
  }
};
