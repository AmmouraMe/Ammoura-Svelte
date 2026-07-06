import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import {
  getDB,
  getAccountByEmail,
  createAccount,
  createAccountSession,
  getUserByEmail,
  createUser,
  getSitesForAccount
} from '$lib/server/db';
import {
  ACCOUNT_SESSION_COOKIE,
  ACCOUNT_SESSION_TTL_SECONDS
} from '$lib/server/db/account-sessions';
import { createSiteForAccount, getPlatformSitesDomain } from '$lib/server/sites-service';
import type { Account } from '$lib/server/db/accounts';

/**
 * Dev-only one-click login (replaces the old demo credentials).
 *
 * POST { as: 'new' | 'existing' | 'superadmin' }
 * - new:        a fresh platform account every click (tests onboarding)
 * - existing:   the stable dev@dev.local account, with one site
 * - superadmin: platform_engineer (legacy admin cookies) + platform account
 *
 * Hard-gated to `vite dev`: in any production build `dev` is false and the
 * endpoint 404s regardless of environment or headers.
 */

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: false, // dev only — never runs in production builds
  sameSite: 'lax'
} as const;

async function ensureAccount(db: D1Database, email: string, name: string): Promise<Account> {
  const existing = await getAccountByEmail(db, email);
  if (existing) {
    return existing;
  }
  return await createAccount(db, { email, name });
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  if (!dev) {
    throw error(404, 'Not found');
  }

  const { as } = (await request.json()) as { as?: string };
  const db = getDB(platform);
  const env = platform?.env as Record<string, unknown> | undefined;

  if (as === 'new') {
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const account = await createAccount(db, {
      email: `dev-user-${stamp}@dev.local`,
      name: 'New Dev User'
    });
    const { token } = await createAccountSession(db, account.id);
    cookies.set(ACCOUNT_SESSION_COOKIE, token, {
      ...COOKIE_OPTS,
      maxAge: ACCOUNT_SESSION_TTL_SECONDS
    });
    return json({ success: true, as, email: account.email, goto: '/account' });
  }

  if (as === 'existing') {
    const account = await ensureAccount(db, 'dev@dev.local', 'Dev User');

    // Make sure the account owns at least one site
    const sites = await getSitesForAccount(db, account.id);
    if (sites.length === 0) {
      const result = await createSiteForAccount(
        db,
        platform?.env?.SITE_ROUTES,
        account.id,
        'Dev Store',
        'dev-store',
        getPlatformSitesDomain(env)
      );
      if (result.error) {
        console.warn('dev login: could not create Dev Store:', result.error);
      }
    }

    const { token } = await createAccountSession(db, account.id);
    cookies.set(ACCOUNT_SESSION_COOKIE, token, {
      ...COOKIE_OPTS,
      maxAge: ACCOUNT_SESSION_TTL_SECONDS
    });
    return json({ success: true, as, email: account.email, goto: '/account' });
  }

  if (as === 'superadmin') {
    const email = 'superadmin@dev.local';
    const siteId = 'default-site';

    // Legacy site-scoped user drives the admin panel (user_session cookie)
    let user = await getUserByEmail(db, siteId, email);
    if (!user) {
      user = await createUser(db, siteId, {
        email,
        name: 'Dev Superadmin',
        password_hash: 'dev-login-only', // never a valid hash → password login impossible
        role: 'platform_engineer'
      });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'platform_engineer',
      permissions: user.permissions,
      status: user.status,
      expiration_date: user.expiration_date,
      grace_period_days: user.grace_period_days
    };
    cookies.set('user_session', JSON.stringify(sessionUser), {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 7
    });
    cookies.set('engineer_session', 'authenticated', {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 7
    });

    // Also a platform account session so /account works too
    const account = await ensureAccount(db, email, 'Dev Superadmin');
    const { token } = await createAccountSession(db, account.id);
    cookies.set(ACCOUNT_SESSION_COOKIE, token, {
      ...COOKIE_OPTS,
      maxAge: ACCOUNT_SESSION_TTL_SECONDS
    });

    return json({ success: true, as, email, goto: '/admin/dashboard' });
  }

  return json(
    { success: false, error: 'as must be new, existing, or superadmin' },
    { status: 400 }
  );
};

/**
 * Dev-only sign-out of everything (platform account + legacy cookies).
 */
export const DELETE: RequestHandler = async ({ cookies, platform }) => {
  if (!dev) {
    throw error(404, 'Not found');
  }

  const token = cookies.get(ACCOUNT_SESSION_COOKIE);
  if (token) {
    try {
      const { deleteAccountSession } = await import('$lib/server/db/account-sessions');
      await deleteAccountSession(getDB(platform), token);
    } catch {
      // cookie cleanup below is what matters in dev
    }
  }
  for (const name of [
    ACCOUNT_SESSION_COOKIE,
    'user_session',
    'admin_session',
    'engineer_session'
  ]) {
    cookies.delete(name, { path: '/' });
  }
  return json({ success: true });
};
