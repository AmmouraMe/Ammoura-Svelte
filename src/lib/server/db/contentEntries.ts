/**
 * Content Entries repository with multi-tenant support
 * All queries are scoped by site_id
 */

import { executeOne, execute, generateId, getCurrentTimestamp } from './connection.js';
import type {
  DBContentEntry,
  ContentEntry,
  CreateContentEntryData,
  UpdateContentEntryData,
  ContentEntryQueryOptions,
  DBContentEntryTag,
  ContentEntryTag,
  ContentTagData
} from '../../types/contentTypes.js';
import { parseContentEntry, parseContentEntryTag } from '../../types/contentTypes.js';

/**
 * Get content entries for a content type with filtering and pagination
 */
export async function getContentEntries(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  options: ContentEntryQueryOptions = {}
): Promise<{ entries: ContentEntry[]; total: number }> {
  const {
    status,
    authorId,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
    search
  } = options;

  // Build WHERE clauses
  const whereClauses: string[] = ['ce.site_id = ?', 'ce.content_type_id = ?'];
  const params: unknown[] = [siteId, contentTypeId];

  if (status) {
    whereClauses.push('ce.status = ?');
    params.push(status);
  }
  if (authorId) {
    whereClauses.push('ce.author_id = ?');
    params.push(authorId);
  }
  if (search) {
    whereClauses.push('ce.title LIKE ?');
    params.push(`%${search}%`);
  }

  // Handle tag filtering with subquery
  if (options.tagName) {
    whereClauses.push(
      'ce.id IN (SELECT entry_id FROM content_entry_tags WHERE tag_name = ? AND site_id = ?)'
    );
    params.push(options.tagName, siteId);
    if (options.tagCategory) {
      // Remove the last subquery and replace with category-aware one
      whereClauses.pop();
      params.pop();
      params.pop();
      whereClauses.push(
        'ce.id IN (SELECT entry_id FROM content_entry_tags WHERE tag_name = ? AND tag_category = ? AND site_id = ?)'
      );
      params.push(options.tagName, options.tagCategory, siteId);
    }
  }

  const whereClause = whereClauses.join(' AND ');

  // Validate sort column
  const validSortColumns = ['created_at', 'updated_at', 'published_at', 'sort_order', 'title'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await executeOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM content_entries ce WHERE ${whereClause}`,
    params
  );
  const total = countResult?.count ?? 0;

  // Get entries
  const queryParams = [...params, limit, offset];
  const result = await execute<DBContentEntry>(
    db,
    `SELECT ce.* FROM content_entries ce WHERE ${whereClause} ORDER BY ce.${sortColumn} ${sortDir} LIMIT ? OFFSET ?`,
    queryParams
  );

  return {
    entries: (result.results || []).map(parseContentEntry),
    total
  };
}

/**
 * Get a content entry by ID (scoped by site)
 */
export async function getContentEntryById(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentEntry | null> {
  const row = await executeOne<DBContentEntry>(
    db,
    'SELECT * FROM content_entries WHERE id = ? AND site_id = ?',
    [id, siteId]
  );
  return row ? parseContentEntry(row) : null;
}

/**
 * Get a content entry by slug within a content type
 */
export async function getContentEntryBySlug(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  slug: string
): Promise<ContentEntry | null> {
  const row = await executeOne<DBContentEntry>(
    db,
    'SELECT * FROM content_entries WHERE content_type_id = ? AND slug = ? AND site_id = ?',
    [contentTypeId, slug, siteId]
  );
  return row ? parseContentEntry(row) : null;
}

/**
 * Create a new content entry (scoped by site)
 */
export async function createContentEntry(
  db: D1Database,
  siteId: string,
  data: CreateContentEntryData
): Promise<ContentEntry> {
  const id = generateId();
  const timestamp = getCurrentTimestamp();
  const fieldValues = JSON.stringify(data.fieldValues);
  const status = data.status || 'draft';
  const publishedAt = status === 'published' ? timestamp : null;

  await db
    .prepare(
      `INSERT INTO content_entries (id, site_id, content_type_id, title, slug, field_values, page_id, status, published_at, author_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      siteId,
      data.contentTypeId,
      data.title,
      data.slug,
      fieldValues,
      data.pageId || null,
      status,
      publishedAt,
      data.authorId || null,
      data.sortOrder ?? 0,
      timestamp,
      timestamp
    )
    .run();

  const created = await getContentEntryById(db, siteId, id);
  if (!created) {
    throw new Error('Failed to create content entry');
  }
  return created;
}

/**
 * Update an existing content entry (scoped by site)
 */
export async function updateContentEntry(
  db: D1Database,
  siteId: string,
  id: string,
  data: UpdateContentEntryData
): Promise<ContentEntry | null> {
  const existing = await getContentEntryById(db, siteId, id);
  if (!existing) {
    return null;
  }

  const timestamp = getCurrentTimestamp();
  const setClauses: string[] = ['updated_at = ?'];
  const params: unknown[] = [timestamp];

  if (data.title !== undefined) {
    setClauses.push('title = ?');
    params.push(data.title);
  }
  if (data.slug !== undefined) {
    setClauses.push('slug = ?');
    params.push(data.slug);
  }
  if (data.fieldValues !== undefined) {
    setClauses.push('field_values = ?');
    params.push(JSON.stringify(data.fieldValues));
  }
  if (data.pageId !== undefined) {
    setClauses.push('page_id = ?');
    params.push(data.pageId);
  }
  if (data.status !== undefined) {
    setClauses.push('status = ?');
    params.push(data.status);

    // Auto-set published_at when publishing
    if (data.status === 'published' && !existing.publishedAt) {
      setClauses.push('published_at = ?');
      params.push(timestamp);
    }
  }
  if (data.authorId !== undefined) {
    setClauses.push('author_id = ?');
    params.push(data.authorId);
  }
  if (data.sortOrder !== undefined) {
    setClauses.push('sort_order = ?');
    params.push(data.sortOrder);
  }

  params.push(id, siteId);

  await db
    .prepare(`UPDATE content_entries SET ${setClauses.join(', ')} WHERE id = ? AND site_id = ?`)
    .bind(...params)
    .run();

  return await getContentEntryById(db, siteId, id);
}

/**
 * Delete a content entry (scoped by site)
 */
export async function deleteContentEntry(
  db: D1Database,
  siteId: string,
  id: string
): Promise<boolean> {
  const existing = await getContentEntryById(db, siteId, id);
  if (!existing) {
    return false;
  }

  await db
    .prepare('DELETE FROM content_entries WHERE id = ? AND site_id = ?')
    .bind(id, siteId)
    .run();

  return true;
}

/**
 * Publish a content entry
 */
export async function publishContentEntry(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentEntry | null> {
  return await updateContentEntry(db, siteId, id, { status: 'published' });
}

/**
 * Unpublish a content entry (revert to draft)
 */
export async function unpublishContentEntry(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentEntry | null> {
  return await updateContentEntry(db, siteId, id, { status: 'draft' });
}

/**
 * Archive a content entry
 */
export async function archiveContentEntry(
  db: D1Database,
  siteId: string,
  id: string
): Promise<ContentEntry | null> {
  return await updateContentEntry(db, siteId, id, { status: 'archived' });
}

/**
 * Get published content entries for a content type (for public rendering)
 */
export async function getPublishedEntries(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'published_at' | 'sort_order' | 'title' | 'created_at';
    sortOrder?: 'asc' | 'desc';
    tagName?: string;
    tagCategory?: string;
  } = {}
): Promise<ContentEntry[]> {
  const { entries } = await getContentEntries(db, siteId, contentTypeId, {
    status: 'published',
    sortBy: options.sortBy || 'published_at',
    sortOrder: options.sortOrder || 'desc',
    limit: options.limit,
    offset: options.offset,
    tagName: options.tagName,
    tagCategory: options.tagCategory
  });
  return entries;
}

/**
 * Get entry count for a content type
 */
export async function getContentEntryCount(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  status?: string
): Promise<number> {
  if (status) {
    const result = await executeOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM content_entries WHERE site_id = ? AND content_type_id = ? AND status = ?',
      [siteId, contentTypeId, status]
    );
    return result?.count ?? 0;
  }
  const result = await executeOne<{ count: number }>(
    db,
    'SELECT COUNT(*) as count FROM content_entries WHERE site_id = ? AND content_type_id = ?',
    [siteId, contentTypeId]
  );
  return result?.count ?? 0;
}

// ============================================================================
// Tags
// ============================================================================

/**
 * Get all tags for a content entry
 */
export async function getEntryTags(
  db: D1Database,
  siteId: string,
  entryId: string
): Promise<ContentEntryTag[]> {
  const result = await execute<DBContentEntryTag>(
    db,
    'SELECT * FROM content_entry_tags WHERE entry_id = ? AND site_id = ? ORDER BY tag_category, tag_name',
    [entryId, siteId]
  );
  return (result.results || []).map(parseContentEntryTag);
}

/**
 * Set tags for a content entry (replaces all existing tags)
 */
export async function setEntryTags(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  entryId: string,
  tags: ContentTagData[]
): Promise<ContentEntryTag[]> {
  const timestamp = getCurrentTimestamp();

  // Delete existing tags
  await db
    .prepare('DELETE FROM content_entry_tags WHERE entry_id = ? AND site_id = ?')
    .bind(entryId, siteId)
    .run();

  // Insert new tags
  for (const tag of tags) {
    const tagId = generateId();
    await db
      .prepare(
        `INSERT INTO content_entry_tags (id, site_id, content_type_id, entry_id, tag_name, tag_category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(tagId, siteId, contentTypeId, entryId, tag.tagName, tag.tagCategory || 'tag', timestamp)
      .run();
  }

  return await getEntryTags(db, siteId, entryId);
}

/**
 * Get all unique tags for a content type, optionally filtered by category
 */
export async function getContentTypeTags(
  db: D1Database,
  siteId: string,
  contentTypeId: string,
  category?: string
): Promise<Array<{ tagName: string; tagCategory: string; count: number }>> {
  if (category) {
    const result = await execute<{
      tag_name: string;
      tag_category: string;
      count: number;
    }>(
      db,
      `SELECT tag_name, tag_category, COUNT(*) as count 
       FROM content_entry_tags 
       WHERE site_id = ? AND content_type_id = ? AND tag_category = ?
       GROUP BY tag_name, tag_category 
       ORDER BY count DESC, tag_name ASC`,
      [siteId, contentTypeId, category]
    );
    return (result.results || []).map((r) => ({
      tagName: r.tag_name,
      tagCategory: r.tag_category,
      count: r.count
    }));
  }

  const result = await execute<{
    tag_name: string;
    tag_category: string;
    count: number;
  }>(
    db,
    `SELECT tag_name, tag_category, COUNT(*) as count 
     FROM content_entry_tags 
     WHERE site_id = ? AND content_type_id = ?
     GROUP BY tag_name, tag_category 
     ORDER BY tag_category, count DESC, tag_name ASC`,
    [siteId, contentTypeId]
  );
  return (result.results || []).map((r) => ({
    tagName: r.tag_name,
    tagCategory: r.tag_category,
    count: r.count
  }));
}
