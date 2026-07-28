/**
 * Site repository for multi-tenant site management
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';

export interface Site {
  id: string;
  name: string;
  domain: string;
  slug: string | null;
  description: string | null;
  settings: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: number;
  updated_at: number;
}

export interface CreateSiteData {
  name: string;
  domain: string;
  description?: string;
  settings?: Record<string, unknown>;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateSiteData {
  name?: string;
  domain?: string;
  description?: string;
  settings?: Record<string, unknown>;
  status?: 'active' | 'inactive' | 'maintenance';
}

/**
 * Get a site by ID
 */
export async function getSiteById(db: D1Database, id: string): Promise<Site | null> {
  return await executeOne<Site>(db, 'SELECT * FROM sites WHERE id = ?', [id]);
}

/**
 * Get a site by domain
 */
export async function getSiteByDomain(db: D1Database, domain: string): Promise<Site | null> {
  return await executeOne<Site>(db, 'SELECT * FROM sites WHERE domain = ?', [domain]);
}

/**
 * Get a site by its platform-subdomain slug
 */
export async function getSiteBySlug(db: D1Database, slug: string): Promise<Site | null> {
  return await executeOne<Site>(db, 'SELECT * FROM sites WHERE slug = ?', [slug]);
}

/**
 * Get all sites
 */
export async function getAllSites(db: D1Database): Promise<Site[]> {
  const result = await execute<Site>(db, 'SELECT * FROM sites ORDER BY created_at DESC');
  return result.results || [];
}

export interface SiteOverview extends Site {
  hostnames: string | null;
  owner_email: string | null;
  member_count: number;
}

/**
 * All sites with their attached hostnames, owning account, and member count —
 * for the platform-engineer sites overview (/admin/sites).
 */
export async function getAllSitesWithDetails(db: D1Database): Promise<SiteOverview[]> {
  const result = await execute<SiteOverview>(
    db,
    `SELECT
       s.*,
       (SELECT GROUP_CONCAT(d.hostname, ', ')
          FROM site_domains d
         WHERE d.site_id = s.id AND d.status != 'removed') AS hostnames,
       (SELECT a.email
          FROM site_members m JOIN accounts a ON a.id = m.account_id
         WHERE m.site_id = s.id AND m.role = 'owner'
         ORDER BY m.created_at LIMIT 1) AS owner_email,
       (SELECT COUNT(*) FROM site_members m WHERE m.site_id = s.id) AS member_count
     FROM sites s
     ORDER BY s.created_at DESC`
  );
  return result.results || [];
}

/**
 * Create a new site
 */
export async function createSite(db: D1Database, data: CreateSiteData): Promise<Site> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const settingsJson = data.settings ? JSON.stringify(data.settings) : null;

  await db
    .prepare(
      `INSERT INTO sites (id, name, domain, description, settings, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.name,
      data.domain,
      data.description || null,
      settingsJson,
      data.status || 'active',
      timestamp,
      timestamp
    )
    .run();

  const site = await getSiteById(db, id);
  if (!site) {
    throw new Error('Failed to create site');
  }
  return site;
}

/**
 * Update a site
 */
export async function updateSite(
  db: D1Database,
  id: string,
  data: UpdateSiteData
): Promise<Site | null> {
  const site = await getSiteById(db, id);
  if (!site) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.domain !== undefined) {
    updates.push('domain = ?');
    params.push(data.domain);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.settings !== undefined) {
    updates.push('settings = ?');
    params.push(JSON.stringify(data.settings));
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length === 0) {
    return site;
  }

  updates.push('updated_at = ?');
  params.push(timestamp);
  params.push(id);

  await db
    .prepare(`UPDATE sites SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  return await getSiteById(db, id);
}

/**
 * Delete a site
 */
export async function deleteSite(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
  return (result.meta?.changes || 0) > 0;
}
