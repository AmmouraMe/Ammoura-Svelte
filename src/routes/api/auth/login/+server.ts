import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { getDB, getUserByEmail, createUserSession } from '$lib/server/db';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_SECONDS } from '$lib/server/db/user-sessions';
import { hashPassword, verifyPassword, isLegacyHash } from '$lib/server/password';
import { logActivity } from '$lib/server/activity-logger';

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

    // Verify password. verifyPassword still accepts the legacy unsalted
    // SHA-256 hashes in this table, so existing users can sign in; a successful
    // legacy verification upgrades them to PBKDF2 in place (below).
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

    // Establish a server-side session; the cookie carries only an opaque
    // bearer token, and role/permissions are re-read from the DB per request.
    const { token } = await createUserSession(db, dbUser.id, siteId);
    cookies.set(USER_SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: USER_SESSION_TTL_SECONDS
    });

    // Update last login timestamp, and upgrade a legacy unsalted SHA-256 hash
    // to PBKDF2 now that we have the plaintext in hand.
    const { updateUser } = await import('$lib/server/db/users');
    await updateUser(db, siteId, dbUser.id, {
      last_login_at: Math.floor(Date.now() / 1000),
      last_login_ip: ipAddress,
      ...(isLegacyHash(dbUser.password_hash)
        ? { password_hash: await hashPassword(data.password) }
        : {})
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
