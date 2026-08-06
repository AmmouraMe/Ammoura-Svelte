import type { PageServerLoad } from './$types';
import { getDB, getAllUsers, getPurchasingCustomers } from '$lib/server/db';
import {
  canPerformAction,
  isUserAccountActive,
  isSystemUser,
  getUserAllPermissions
} from '$lib/server/permissions';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, locals, url }) => {
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

  // Get the active tab from URL params (default to 'customers')
  const activeTab = url.searchParams.get('tab') || 'customers';

  // Get all users and customers with purchases
  const [allUsers, purchasingCustomers] = await Promise.all([
    getAllUsers(db, siteId),
    getPurchasingCustomers(db, siteId)
  ]);

  // Filter to only customer role users for the customers tab
  const customerUsers = allUsers.filter((user) => user.role === 'customer');

  // Sanitize users (remove password hashes) and add computed fields
  const sanitizeUsers = async (users: typeof allUsers) => {
    return Promise.all(
      users.map(async (user) => {
        const { password_hash: _password_hash, ...userWithoutPassword } = user;
        const isSystem = isSystemUser(user.id);
        const hasPurchased = purchasingCustomers.some((pc) => pc.id === user.id);
        return {
          ...userWithoutPassword,
          isActive: isUserAccountActive(user),
          permissions: isSystem
            ? await getUserAllPermissions(db, user)
            : JSON.parse(user.permissions),
          isSystemUser: isSystem,
          hasPurchased
        };
      })
    );
  };

  const sanitizedAllUsers = await sanitizeUsers(allUsers);
  const sanitizedCustomerUsers = await sanitizeUsers(customerUsers);

  // Filter based on active tab
  const displayUsers =
    activeTab === 'customers'
      ? sanitizedCustomerUsers.filter((u) => u.hasPurchased)
      : sanitizedCustomerUsers;

  return {
    users: displayUsers,
    allUsersCount: sanitizedAllUsers.length,
    customersCount: sanitizedCustomerUsers.length,
    purchasingCustomersCount: sanitizedCustomerUsers.filter((u) => u.hasPurchased).length,
    activeTab,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      canWrite: canPerformAction(currentUser, 'users:write'),
      canDelete: canPerformAction(currentUser, 'users:delete'),
      canManageRoles: canPerformAction(currentUser, 'users:roles')
    }
  };
};
