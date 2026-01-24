import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as revisionsDb from '$lib/server/db/revisions';
import type { RequestHandler } from './$types';

/**
 * GET /api/pages/[id]/revisions/[revisionId]
 * Get a specific revision
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;
  const revisionId = params.revisionId;

  try {
    const revision = await revisionsDb.getRevisionById(db, siteId, pageId, revisionId);
    if (!revision) {
      throw error(404, 'Revision not found');
    }

    // Note: GET/view operations should not be logged per project guidelines
    // ("Read-only operations (viewing lists, reading data)" should NOT be logged)

    return json(revision);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching revision:', err);
    throw error(500, 'Failed to fetch revision');
  }
};
