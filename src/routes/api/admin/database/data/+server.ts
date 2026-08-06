import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db/connection';

const MAX_LIMIT = 200;

/**
 * Columns the database navigator never renders. It is a platform-engineer
 * tool, so it does read across every tenant by design — but browsing a table
 * should not spill credential material into a browser tab, a screenshot or a
 * support session. Redacted rather than dropped so the column still shows.
 */
const REDACTED_COLUMNS = new Set([
  'password_hash',
  'api_key',
  'api_key_encrypted',
  'secret',
  'secret_encrypted',
  'client_secret',
  'client_secret_encrypted',
  'access_token',
  'refresh_token',
  'token',
  'encryption_key',
  'stripe_secret_key',
  'webhook_secret'
]);

function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = REDACTED_COLUMNS.has(key.toLowerCase()) && value != null ? '••• redacted' : value;
  }
  return out;
}

/** Clamp a query-string integer; `?limit=abc` used to reach D1 as NaN. */
function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = parseInt(raw || '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

export const GET: RequestHandler = async ({ platform, locals, url }) => {
  try {
    // Check authentication
    if (!locals.currentUser) {
      throw error(401, 'Unauthorized');
    }

    const user = locals.currentUser;

    // Only platform engineers can access table data
    if (user.role !== 'platform_engineer') {
      throw error(403, 'Access denied. Platform engineer role required.');
    }

    const tableName = url.searchParams.get('table');
    const page = clampInt(url.searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clampInt(url.searchParams.get('limit'), 50, 1, MAX_LIMIT);

    if (!tableName) {
      throw error(400, 'Table name is required');
    }

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw error(400, 'Invalid table name');
    }

    const db = getDB(platform);

    // Get total count
    const countResult = (await db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
      .first()) as { count: number } | null;

    const totalRows = countResult?.count || 0;
    const totalPages = Math.ceil(totalRows / limit);
    const offset = (page - 1) * limit;

    // Get paginated data
    const dataResult = await db
      .prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all();

    return json({
      tableName,
      data: ((dataResult.results || []) as Array<Record<string, unknown>>).map(redactRow),
      pagination: {
        page,
        limit,
        totalRows,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Table data fetch error:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    throw error(500, 'Failed to retrieve table data');
  }
};
