import type { PageServerLoad, Actions } from './$types';
import { getDB, updateUser } from '$lib/server/db';
import { isSupportedLocale, SUPPORTED_LOCALES } from '$lib/i18n';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { hashPassword, verifyPassword } from '$lib/server/password';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  // hooks.server.ts resolves the session cookie against the users table, so
  // locals.currentUser is already the full DB row
  const user = locals.currentUser;
  if (!user) {
    throw redirect(302, '/auth/login?redirect=/user/profile');
  }

  // Remove password hash from user object
  const { password_hash: _password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    availableLocales: SUPPORTED_LOCALES.map((l) => ({ ...l }))
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, platform, locals }) => {
    const currentUser = locals.currentUser;
    if (!currentUser) {
      throw error(401, 'Not authenticated');
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const rawLocale = formData.get('locale')?.toString() ?? '';
    // '' = follow the site/browser resolution (stored as NULL)
    const locale = rawLocale && isSupportedLocale(rawLocale) ? rawLocale : null;

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!name) {
      errors.name = 'Name is required';
    }
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: { name, email } });
    }

    try {
      // Check if email is already taken by another user
      if (email !== currentUser.email) {
        const { getUserByEmail } = await import('$lib/server/db');
        const existingUser = await getUserByEmail(db, siteId, email!);
        if (existingUser && existingUser.id !== currentUser.id) {
          return fail(400, {
            errors: { email: 'Email is already in use' },
            values: { name, email }
          });
        }
      }

      // Update user profile
      await updateUser(db, siteId, currentUser.id, {
        name: name!,
        email: email!,
        locale,
        updated_by: currentUser.id
      });

      // No session cookie to refresh — hooks.server.ts re-reads the users row
      // on every request, so the new name/email/locale apply immediately.

      // Log the action
      await createActivityLog(db, siteId, {
        user_id: currentUser.id,
        action: 'profile.updated',
        entity_type: 'user',
        entity_id: currentUser.id,
        description: 'Updated profile information',
        severity: 'info'
      });

      return { success: true, message: 'Profile updated successfully' };
    } catch (err) {
      console.error('Failed to update profile:', err);
      return fail(500, {
        errors: { general: 'Failed to update profile. Please try again.' },
        values: { name, email }
      });
    }
  },

  changePassword: async ({ request, platform, locals }) => {
    const currentUser = locals.currentUser;
    if (!currentUser) {
      throw error(401, 'Not authenticated');
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    const formData = await request.formData();
    const currentPassword = formData.get('currentPassword')?.toString();
    const newPassword = formData.get('newPassword')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 12) {
      errors.newPassword = 'Password must be at least 12 characters';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { passwordErrors: errors });
    }

    try {
      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword!, currentUser.password_hash);
      if (!isPasswordValid) {
        return fail(400, {
          passwordErrors: { currentPassword: 'Current password is incorrect' }
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword!);

      // Update password
      await updateUser(db, siteId, currentUser.id, {
        password_hash: newPasswordHash,
        updated_by: currentUser.id
      });

      // Log the action
      await createActivityLog(db, siteId, {
        user_id: currentUser.id,
        action: 'profile.password_changed',
        entity_type: 'user',
        entity_id: currentUser.id,
        description: 'Changed account password',
        severity: 'info'
      });

      return { passwordSuccess: true, message: 'Password changed successfully' };
    } catch (err) {
      console.error('Failed to change password:', err);
      return fail(500, {
        passwordErrors: { general: 'Failed to change password. Please try again.' }
      });
    }
  }
};
