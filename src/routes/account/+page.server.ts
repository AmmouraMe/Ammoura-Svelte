import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDB, getSitesForAccount } from '$lib/server/db';
import { getPlatformSitesDomain } from '$lib/server/sites-service';

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.account) {
    throw redirect(302, '/account/login');
  }

  const db = getDB(platform);
  const sites = await getSitesForAccount(db, locals.account.id);

  return {
    account: {
      id: locals.account.id,
      name: locals.account.name,
      email: locals.account.email
    },
    sites,
    platformSitesDomain: getPlatformSitesDomain(platform?.env)
  };
};
