import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import {
  getDB,
  getAccountByEmail,
  createAccount,
  createAccountSession,
  createEmailVerificationToken
} from '$lib/server/db';
import { sendEmail, buildVerificationEmail } from '$lib/server/email';
import {
  ACCOUNT_SESSION_COOKIE,
  ACCOUNT_SESSION_TTL_SECONDS
} from '$lib/server/db/account-sessions';
import { hashPassword } from '$lib/server/password';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Platform account signup (tenancy plan T1). Creates a global account —
 * distinct from site-scoped storefront users — and starts a session.
 */
export const POST: RequestHandler = async ({ request, cookies, platform, url }) => {
  try {
    const data = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
    };

    const email = data.email?.trim().toLowerCase() || '';
    const name = data.name?.trim() || '';
    const password = data.password || '';

    if (!EMAIL_PATTERN.test(email)) {
      return json({ success: false, error: 'A valid email address is required' }, { status: 400 });
    }
    if (!name) {
      return json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return json(
        { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const db = getDB(platform);

    const existing = await getAccountByEmail(db, email);
    if (existing) {
      return json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const account = await createAccount(db, {
      email,
      name,
      password_hash: await hashPassword(password)
    });

    // Send the verification email; signup must succeed even if this fails
    try {
      const verifyToken = await createEmailVerificationToken(db, account.id);
      const verifyUrl = `${url.origin}/verify-email?token=${verifyToken}`;
      await sendEmail(platform?.env as Record<string, unknown> | undefined, {
        to: account.email,
        ...buildVerificationEmail(account.name, verifyUrl)
      });
    } catch (error) {
      console.error('Verification email failed:', error);
    }

    const { token } = await createAccountSession(db, account.id);
    cookies.set(ACCOUNT_SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: ACCOUNT_SESSION_TTL_SECONDS
    });

    return json({
      success: true,
      account: { id: account.id, email: account.email, name: account.name }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return json({ success: false, error: 'An error occurred during signup' }, { status: 500 });
  }
};
