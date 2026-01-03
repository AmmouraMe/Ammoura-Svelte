import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as revisionsDb from '$lib/server/db/revisions';
import type { RequestHandler } from './$types';
import type { CreateRevisionData } from '$lib/types/pages';
import { logRevisionAction } from '$lib/server/activity-logger';
import { getPageById } from '$lib/server/db/pages';

/**
 * GET /api/pages/[id]/revisions
 * Get revision tree structure for a page (includes branching graph)
 */
export const GET: RequestHandler = async ({ params, platform, locals, url }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;

  try {
    // Check if client wants the tree structure or just a flat list
    const includeTree = url.searchParams.get('tree') === 'true';

    if (includeTree) {
      const tree = await revisionsDb.buildRevisionTree(db, siteId, pageId);
      return json(tree);
    } else {
      const revisions = await revisionsDb.getPageRevisions(db, siteId, pageId);
      return json(revisions);
    }
  } catch (err) {
    console.error('Error fetching revisions:', err);
    throw error(500, 'Failed to fetch revisions');
  }
};

/**
 * POST /api/pages/[id]/revisions
 * Create a new revision for a page
 * Query params:
 *   - publish=true: Create revision and publish in one step (avoids creating duplicate draft)
 */
export const POST: RequestHandler = async ({ params, request, platform, locals, url }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;
  const userId = locals.user?.id;
  const shouldPublish = url.searchParams.get('publish') === 'true';

  try {
    const data = (await request.json()) as CreateRevisionData;

    // If publishing directly, force status to 'published'
    if (shouldPublish) {
      data.status = 'published';
    }

    const revision = await revisionsDb.createRevision(db, siteId, pageId, {
      ...data,
      created_by: userId
    });

    // If publishing, also update the page and mark revision as published
    if (shouldPublish) {
      await revisionsDb.markRevisionAsPublished(db, pageId, revision.id, {
        title: data.title,
        slug: data.slug,
        colorTheme: data.colorTheme,
        components: data.components
      });
    }

    // Get page name for logging
    const page = await getPageById(db, siteId, pageId);

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: shouldPublish ? 'published' : 'created',
      entityType: 'page',
      entityId: pageId,
      entityName: page?.title,
      revisionId: revision.id,
      revisionMessage: data.notes,
      parentRevisionId: revision.parent_revision_id || undefined
    });

    return json(revision);
  } catch (err) {
    console.error('Error creating revision:', err);
    throw error(500, 'Failed to create revision');
  }
};
