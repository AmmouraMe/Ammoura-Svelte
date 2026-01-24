import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as revisionsDb from '$lib/server/db/revisions';
import type { RequestHandler } from './$types';
import { logRevisionAction } from '$lib/server/activity-logger';
import { getPageById } from '$lib/server/db/pages';

/**
 * POST /api/pages/[id]/revisions/[revisionId]/publish
 * Publish a specific revision by marking it as published (no new revision created).
 * This is used when the user has a saved draft revision that they want to publish directly.
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const pageId = params.id;
  const revisionId = params.revisionId;
  const userId = locals.user?.id;

  try {
    // Get the revision to publish
    const revision = await revisionsDb.getRevisionById(db, siteId, pageId, revisionId);
    if (!revision) {
      throw error(404, 'Revision not found');
    }

    // Mark the existing revision as published without creating a new one
    await revisionsDb.markRevisionAsPublished(db, pageId, revisionId, {
      title: revision.title,
      slug: revision.slug,
      colorTheme: revision.color_theme,
      components: revision.components
    });

    // Get page name for logging
    const page = await getPageById(db, siteId, pageId);

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: 'published',
      entityType: 'page',
      entityId: pageId,
      entityName: page?.title,
      revisionId
    });

    return json({ success: true, revisionId });
  } catch (err) {
    console.error('Error publishing revision:', err);
    throw error(500, 'Failed to publish revision');
  }
};
