import type { PageServerLoad, Actions } from './$types';
import { getDB, getUserById, updateUser } from '$lib/server/db';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { error, fail, redirect } from '@sveltejs/kit';

/**
 * Hash a password using SHA-256 (matches the hashing in login)
 * In production, use bcrypt instead
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}

export const load: PageServerLoad = async ({ platform, cookies, locals }) => {
  // Check authentication
  const userSession = cookies.get('user_session');
  if (!userSession) {
    throw redirect(302, '/auth/login?redirect=/user/profile');
  }

  const sessionUser = JSON.parse(decodeURIComponent(userSession));

  const db = getDB(platform);
  const siteId = locals.siteId;

  // Get full user details from database
  const user = await getUserById(db, siteId, sessionUser.id);
  if (!user) {
    throw error(404, 'User not found');
  }

  // Remove password hash from user object
  const { password_hash: _password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, platform, cookies, locals }) => {
    const userSession = cookies.get('user_session');
    if (!userSession) {
      throw error(401, 'Not authenticated');
    }

    const sessionUser = JSON.parse(decodeURIComponent(userSession));

    const db = getDB(platform);
    const siteId = locals.siteId;

    // Get current user from database
    const currentUser = await getUserById(db, siteId, sessionUser.id);
    if (!currentUser) {
      throw error(404, 'User not found');
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();

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
        updated_by: currentUser.id
      });

      // Update session cookie with new info
      const updatedSession = {
        ...sessionUser,
        name: name!,
        email: email!
      };
      cookies.set('user_session', encodeURIComponent(JSON.stringify(updatedSession)), {
        path: '/',
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

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

  changePassword: async ({ request, platform, cookies, locals }) => {
    const userSession = cookies.get('user_session');
    if (!userSession) {
      throw error(401, 'Not authenticated');
    }

    const sessionUser = JSON.parse(decodeURIComponent(userSession));

    const db = getDB(platform);
    const siteId = locals.siteId;

    // Get current user from database
    const currentUser = await getUserById(db, siteId, sessionUser.id);
    if (!currentUser) {
      throw error(404, 'User not found');
    }

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
