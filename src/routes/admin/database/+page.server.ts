import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.currentUser;

  if (!user) {
    throw redirect(303, '/auth/login');
  }

  // Only platform engineers can access the database navigator
  if (user.role !== 'platform_engineer') {
    throw redirect(303, '/admin/dashboard');
  }

  return { user };
};
