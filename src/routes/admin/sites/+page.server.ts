import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import { getAllSitesWithDetails } from '$lib/server/db/sites';

export const load: PageServerLoad = async ({ locals, platform }) => {
  const user = locals.currentUser;

  if (!user) {
    throw redirect(303, '/auth/login');
  }

  // Only platform engineers can see every site on the platform
  if (user.role !== 'platform_engineer') {
    throw redirect(303, '/admin/dashboard');
  }

  const db = getDB(platform);
  const sites = await getAllSitesWithDetails(db);

  return { user, sites };
};
