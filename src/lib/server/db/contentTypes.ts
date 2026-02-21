/**
 * Content Types repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  DBContentType,
  ContentType,
  CreateContentTypeData,
  UpdateContentTypeData,
  ContentFieldDefinition
} from '../../types/contentTypes.js';
import { parseContentType } from '../../types/contentTypes.js';

/**
 * Get all content types for a site
 */
export async function getContentTypes(db: D1Database, siteId: string): Promise<ContentType[]> {
  const result = await execute<DBContentType>(
    db,
    'SELECT * FROM content_types WHERE site_id = ? AND status = ? ORDER BY name ASC',
    [siteId, 'active']
  );
  return (result.results || []).map(parseContentType);
}

/**
 * Get all content types for a site including archived
 */
export async function getAllContentTypes(db: D1Database, siteId: string): Promise<ContentType[]> {
  const result = await execute<DBContentType>(
    db,
    'SELECT * FROM content_types WHERE site_id = ? ORDER BY name ASC',
    [siteId]
  );
  return (result.results || []).map(parseContentType);
}

/**
 * Get a content type by ID (scoped by site)
 */
export async function getContentTypeById(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentType | null> {
  const row = await executeOne<DBContentType>(
    db,
    'SELECT * FROM content_types WHERE id = ? AND site_id = ?',
    [id, siteId]
  );
  return row ? parseContentType(row) : null;
}

/**
 * Get a content type by slug (scoped by site)
 */
export async function getContentTypeBySlug(
  db: D1Database,
  siteId: string,
  slug: string
): Promise<ContentType | null> {
  const row = await executeOne<DBContentType>(
    db,
    'SELECT * FROM content_types WHERE slug = ? AND site_id = ?',
    [slug, siteId]
  );
  return row ? parseContentType(row) : null;
}

/**
 * Get a content type by base path (scoped by site)
 * Used for routing — matches content type from URL path
 */
export async function getContentTypeByBasePath(
  db: D1Database,
  siteId: string,
  basePath: string
): Promise<ContentType | null> {
  const row = await executeOne<DBContentType>(
    db,
    'SELECT * FROM content_types WHERE base_path = ? AND site_id = ?',
    [basePath, siteId]
  );
  return row ? parseContentType(row) : null;
}

/**
 * Resolve a URL slug to a content type and optional entry slug.
 * Finds active content types whose base_path is a prefix of the slug.
 * Returns the matching content type and the remaining entry slug portion.
 *
 * e.g., slug="/blog/my-post", basePath="/blog" → entrySlug="my-post"
 * e.g., slug="/blog", basePath="/blog" → entrySlug=null (listing page)
 */
export async function resolveContentRoute(
  db: D1Database,
  siteId: string,
  slug: string
): Promise<{ contentType: ContentType; entrySlug: string | null } | null> {
  // Fetch all active content types for this site
  const types = await getContentTypes(db, siteId);

  // Sort by base_path length descending to match the most specific path first
  const sorted = types
    .filter((t) => t.basePath && slug.startsWith(t.basePath))
    .sort((a, b) => (b.basePath?.length ?? 0) - (a.basePath?.length ?? 0));

  if (sorted.length === 0) return null;

  const contentType = sorted[0];
  const basePath = contentType.basePath!;

  // Exact match = listing page
  if (slug === basePath) {
    return { contentType, entrySlug: null };
  }

  // Must have a slash after basePath for it to be a valid entry route
  const remainder = slug.slice(basePath.length);
  if (!remainder.startsWith('/')) return null;

  const entrySlug = remainder.slice(1); // Remove leading slash
  if (!entrySlug) return null;

  return { contentType, entrySlug };
}

/**
 * Create a new content type (scoped by site)
 */
export async function createContentType(
  db: D1Database,
  siteId: string,
  data: CreateContentTypeData
): Promise<ContentType> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const fieldsSchema = JSON.stringify(data.fieldsSchema);

  await db
    .prepare(
      `INSERT INTO content_types (id, site_id, name, slug, description, base_path, icon, fields_schema, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.name,
      data.slug,
      data.description || null,
      data.basePath,
      data.icon || null,
      fieldsSchema,
      timestamp,
      timestamp
    )
    .run();

  const created = await getContentTypeById(db, siteId, id);
  if (!created) {
    throw new Error('Failed to create content type');
  }
  return created;
}

/**
 * Update an existing content type (scoped by site)
 */
export async function updateContentType(
  db: D1Database,
  siteId: string,
  id: string,
  data: UpdateContentTypeData
): Promise<ContentType | null> {
  const existing = await getContentTypeById(db, siteId, id);
  if (!existing) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  const setClauses: string[] = ['updated_at = ?'];
  const params: unknown[] = [timestamp];

  if (data.name !== undefined) {
    setClauses.push('name = ?');
    params.push(data.name);
  }
  if (data.slug !== undefined) {
    setClauses.push('slug = ?');
    params.push(data.slug);
  }
  if (data.description !== undefined) {
    setClauses.push('description = ?');
    params.push(data.description);
  }
  if (data.basePath !== undefined) {
    setClauses.push('base_path = ?');
    params.push(data.basePath);
  }
  if (data.icon !== undefined) {
    setClauses.push('icon = ?');
    params.push(data.icon);
  }
  if (data.fieldsSchema !== undefined) {
    setClauses.push('fields_schema = ?');
    params.push(JSON.stringify(data.fieldsSchema));
  }
  if (data.status !== undefined) {
    setClauses.push('status = ?');
    params.push(data.status);
  }
  if (data.listingPageId !== undefined) {
    setClauses.push('listing_page_id = ?');
    params.push(data.listingPageId);
  }
  if (data.entryTemplatePageId !== undefined) {
    setClauses.push('entry_template_page_id = ?');
    params.push(data.entryTemplatePageId);
  }

  params.push(id, siteId);

  await db
    .prepare(`UPDATE content_types SET ${setClauses.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getContentTypeById(db, siteId, id);
}

/**
 * Delete a content type (scoped by site)
 * This will cascade-delete all associated content entries and tags
 */
export async function deleteContentType(
  db: D1Database,
  siteId: string,
  id: string
): Promise<boolean> {
  const existing = await getContentTypeById(db, siteId, id);
  if (!existing) {
    return false;
  }

  await db.prepare('DELETE FROM content_types WHERE id = ? AND site_id = ?').bind(id, siteId).run();

  return true;
}

/**
 * Archive a content type (soft delete)
 */
export async function archiveContentType(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentType | null> {
  return await updateContentType(db, siteId, id, { status: 'archived' });
}

/**
 * Update the fields schema of a content type
 */
export async function updateContentTypeSchema(
  db: D1Database,
  siteId: string,
  id: string,
  fieldsSchema: ContentFieldDefinition[]
): Promise<ContentType | null> {
  return await updateContentType(db, siteId, id, { fieldsSchema });
}

/**
 * Get content type count for a site
 */
export async function getContentTypeCount(db: D1Database, siteId: string): Promise<number> {
  const result = await executeOne<{ count: number }>(
    db,
    'SELECT COUNT(*) as count FROM content_types WHERE site_id = ? AND status = ?',
    [siteId, 'active']
  );
  return result?.count ?? 0;
}
