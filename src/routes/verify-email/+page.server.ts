import type { PageServerLoad } from './$types';
import { getDB, consumeEmailVerificationToken } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, platform }) => {
  const token = url.searchParams.get('token') || '';
  if (!token) {
    return { verified: false, reason: 'missing' as const };
  }

  const db = getDB(platform);
  const account = await consumeEmailVerificationToken(db, token);

  if (!account) {
    return { verified: false, reason: 'invalid' as const };
  }
  return { verified: true, email: account.email };
};
