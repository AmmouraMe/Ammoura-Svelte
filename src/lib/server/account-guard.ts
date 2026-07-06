/**
 * Authorization helper for account-scoped site management endpoints:
 * the request must carry a valid account session AND that account must be a
 * member of the site with one of the allowed roles.
 */

import { getSiteMember, type SiteMember, type SiteMemberRole } from './db/site-members.js';
import type { Account } from './db/accounts.js';

export interface SiteAccess {
  account: Account;
  member: SiteMember;
}

export async function requireSiteRole(
  db: D1Database,
  account: Account | undefined,
  siteId: string,
  roles: SiteMemberRole[] = ['owner', 'admin']
): Promise<SiteAccess | null> {
  if (!account || !siteId) {
    return null;
  }
  const member = await getSiteMember(db, siteId, account.id);
  if (!member || !roles.includes(member.role)) {
    return null;
  }
  return { account, member };
}
