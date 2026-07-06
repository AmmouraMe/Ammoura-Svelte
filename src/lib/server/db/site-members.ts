/**
 * Site membership: which platform accounts can manage which sites.
 * Roles: owner (full control incl. delete/transfer), admin, editor.
 */

import { execute, executeOne, getCurrentTimestamp } from './connection.js';
import type { Site } from './sites.js';

export type SiteMemberRole = 'owner' | 'admin' | 'editor';

export interface SiteMember {
  site_id: string;
  account_id: string;
  role: SiteMemberRole;
  created_at: number;
}

export interface MemberSite extends Site {
  member_role: SiteMemberRole;
}

export async function addSiteMember(
  db: D1Database,
  siteId: string,
  accountId: string,
  role: SiteMemberRole
): Promise<SiteMember> {
  const timestamp = getCurrentTimestamp();
  await db
    .prepare(
      `INSERT INTO site_members (site_id, account_id, role, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(siteId, accountId, role, timestamp)
    .run();
  return { site_id: siteId, account_id: accountId, role, created_at: timestamp };
}

export async function getSiteMember(
  db: D1Database,
  siteId: string,
  accountId: string
): Promise<SiteMember | null> {
  return await executeOne<SiteMember>(
    db,
    'SELECT * FROM site_members WHERE site_id = ? AND account_id = ?',
    [siteId, accountId]
  );
}

/**
 * All sites an account belongs to, with the account's role on each.
 */
export async function getSitesForAccount(db: D1Database, accountId: string): Promise<MemberSite[]> {
  const result = await execute<MemberSite>(
    db,
    `SELECT sites.*, site_members.role AS member_role
     FROM site_members
     JOIN sites ON sites.id = site_members.site_id
     WHERE site_members.account_id = ?
     ORDER BY sites.created_at ASC`,
    [accountId]
  );
  return result.results || [];
}

export async function getMembersForSite(db: D1Database, siteId: string): Promise<SiteMember[]> {
  const result = await execute<SiteMember>(
    db,
    'SELECT * FROM site_members WHERE site_id = ? ORDER BY created_at ASC',
    [siteId]
  );
  return result.results || [];
}

export async function updateSiteMemberRole(
  db: D1Database,
  siteId: string,
  accountId: string,
  role: SiteMemberRole
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE site_members SET role = ? WHERE site_id = ? AND account_id = ?')
    .bind(role, siteId, accountId)
    .run();
  return (result.meta?.changes || 0) > 0;
}

export async function removeSiteMember(
  db: D1Database,
  siteId: string,
  accountId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM site_members WHERE site_id = ? AND account_id = ?')
    .bind(siteId, accountId)
    .run();
  return (result.meta?.changes || 0) > 0;
}
