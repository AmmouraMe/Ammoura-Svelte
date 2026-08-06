import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { canPerformAction } from '$lib/server/permissions';

export const load: PageServerLoad = async ({ locals }) => {
  // hooks.server.ts resolves the session cookie against the users table
  const currentUser = locals.currentUser;
  if (!currentUser) {
    throw error(401, 'Not authenticated');
  }

  // Check permission
  if (!canPerformAction(currentUser, 'users:write')) {
    throw error(403, 'Insufficient permissions to create users');
  }

  return {
    currentUser: {
      id: currentUser.id,
      role: currentUser.role
    }
  };
};
