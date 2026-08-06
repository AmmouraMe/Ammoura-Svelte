import type { PageServerLoad } from './$types';
import { getDB, getAdminUsers } from '$lib/server/db';
import {
  canPerformAction,
  isUserAccountActive,
  isSystemUser,
  getUserAllPermissions
} from '$lib/server/permissions';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, locals }) => {
  // hooks.server.ts resolves the session cookie against the users table
  const currentUser = locals.currentUser;
  if (!currentUser) {
    throw error(401, 'Not authenticated');
  }

  // Check permission
  if (!canPerformAction(currentUser, 'users:read')) {
    throw error(403, 'Insufficient permissions to view users');
  }

  const db = getDB(platform);
  const siteId = locals.siteId;

  // Get only admin users (admin, user, platform_engineer roles)
  const users = await getAdminUsers(db, siteId);

  // Sanitize users (remove password hashes) and add computed fields
  const sanitizedUsers = await Promise.all(
    users.map(async (user) => {
      const { password_hash: _password_hash, ...userWithoutPassword } = user;
      const isSystem = isSystemUser(user.id);
      return {
        ...userWithoutPassword,
        isActive: isUserAccountActive(user),
        permissions: isSystem
          ? await getUserAllPermissions(db, user)
          : JSON.parse(user.permissions),
        isSystemUser: isSystem
      };
    })
  );

  return {
    users: sanitizedUsers,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      canWrite: canPerformAction(currentUser, 'users:write'),
      canDelete: canPerformAction(currentUser, 'users:delete'),
      canManageRoles: canPerformAction(currentUser, 'users:roles')
    }
  };
};
