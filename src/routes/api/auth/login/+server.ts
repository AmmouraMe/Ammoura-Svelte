import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, getUserByEmail } from '$lib/server/db';
import { logActivity } from '$lib/server/activity-logger';

/**
 * Hash a password using SHA-256 (matches the hashing in user edit)
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

export const POST: RequestHandler = async ({ request, cookies, platform, locals }) => {
  try {
    const data = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!data.email || !data.password) {
      return json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDB(platform);
    const siteId = locals.siteId;

    // Extract IP and user agent for logging
    const ipAddress =
      request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // Look up user in database by email
    const dbUser = await getUserByEmail(db, siteId, data.email);

    if (!dbUser) {
      // User not found - log failed login attempt
      await logActivity(db, {
        siteId,
        userId: null,
        action: 'user.login_failed',
        entityType: 'user',
        entityId: null,
        entityName: null,
        description: `Failed login attempt for ${data.email}`,
        ipAddress,
        userAgent,
        metadata: { email: data.email, reason: 'invalid_credentials' },
        severity: 'warning'
      });
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if user account is active
    if (dbUser.status !== 'active') {
      return json(
        {
          success: false,
          error: `Account is ${dbUser.status}. Please contact an administrator.`
        },
        { status: 403 }
      );
    }

    // Check if account has expired
    if (dbUser.expiration_date && dbUser.expiration_date < Date.now() / 1000) {
      return json(
        { success: false, error: 'Account has expired. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(data.password, dbUser.password_hash);

    if (!passwordValid) {
      // Log failed login attempt due to wrong password
      await logActivity(db, {
        siteId,
        userId: null,
        action: 'user.login_failed',
        entityType: 'user',
        entityId: dbUser.id,
        entityName: dbUser.name,
        description: `Failed login attempt for ${data.email}`,
        ipAddress,
        userAgent,
        metadata: { email: data.email, reason: 'invalid_password' },
        severity: 'warning'
      });
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Prepare user object for session (without password hash)
    // Check if this user's email matches the platform engineer email from env
    const platformEngineerEmail = platform?.env?.PLATFORM_ENGINEER_EMAIL;
    let role = dbUser.role;
    if (
      platformEngineerEmail &&
      dbUser.email.toLowerCase() === platformEngineerEmail.toLowerCase() &&
      dbUser.role !== 'platform_engineer'
    ) {
      const { updateUser } = await import('$lib/server/db/users');
      await updateUser(db, siteId, dbUser.id, { role: 'platform_engineer' });
      role = 'platform_engineer';

      await logActivity(db, {
        siteId,
        userId: dbUser.id,
        action: 'user.role_elevated',
        entityType: 'user',
        entityId: dbUser.id,
        entityName: dbUser.name,
        description: `User role elevated to platform_engineer via PLATFORM_ENGINEER_EMAIL match`,
        ipAddress,
        userAgent,
        metadata: { previous_role: dbUser.role }
      });
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role,
      permissions: dbUser.permissions,
      status: dbUser.status,
      expiration_date: dbUser.expiration_date,
      grace_period_days: dbUser.grace_period_days
    };

    // Set session cookie
    cookies.set('user_session', JSON.stringify(user), {
      path: '/',
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Set role-specific session cookies
    if (user.role === 'admin') {
      cookies.set('admin_session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    } else if (user.role === 'platform_engineer') {
      cookies.set('engineer_session', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    // Update last login timestamp
    const { updateUser } = await import('$lib/server/db/users');
    await updateUser(db, siteId, dbUser.id, {
      last_login_at: Math.floor(Date.now() / 1000),
      last_login_ip: ipAddress
    });

    // Log successful login
    await logActivity(db, {
      siteId,
      userId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      description: 'User logged in successfully',
      ipAddress,
      userAgent,
      metadata: { method: 'password' }
    });

    return json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ success: false, error: 'An error occurred during login' }, { status: 500 });
  }
};
