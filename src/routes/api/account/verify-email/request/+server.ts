import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB, createEmailVerificationToken } from '$lib/server/db';
import { sendEmail, buildVerificationEmail } from '$lib/server/email';

/**
 * Re-send the verification email for the signed-in account.
 */
export const POST: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.account) {
    return json({ success: false, error: 'Not signed in' }, { status: 401 });
  }
  if (locals.account.email_verified_at) {
    return json({ success: true, alreadyVerified: true });
  }

  const db = getDB(platform);
  const token = await createEmailVerificationToken(db, locals.account.id);
  const verifyUrl = `${url.origin}/verify-email?token=${token}`;
  await sendEmail(platform?.env as Record<string, unknown> | undefined, {
    to: locals.account.email,
    ...buildVerificationEmail(locals.account.name, verifyUrl)
  });

  return json({ success: true });
};
