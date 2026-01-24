import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getLayoutRevisionById,
  publishLayoutRevision,
  createLayoutRevision,
  getCurrentLayoutRevision,
  revisionDataToLayout
} from '$lib/server/db/layout-revisions';
import { updateLayout } from '$lib/server/db/layouts';
import type { RequestHandler } from './$types';
import { logRevisionAction } from '$lib/server/activity-logger';
import type { LayoutRevisionData, ParsedRevision } from '$lib/types/revisions';

/**
 * POST /api/layouts/[layoutId]/revisions/[revisionId]/publish
 * Publish a specific layout revision (makes it the current/live version)
 * This creates a new revision at the head and applies it to the layout
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const layoutId = parseInt(params.layoutId);
  const revisionId = params.revisionId;
  const userId = locals.user?.id;

  if (isNaN(layoutId)) {
    throw error(400, 'Invalid layout ID');
  }

  try {
    // Get the revision to publish
    const revisionToPublish = (await getLayoutRevisionById(
      db,
      siteId,
      revisionId
    )) as ParsedRevision<LayoutRevisionData> | null;

    if (!revisionToPublish) {
      throw error(404, 'Revision not found');
    }

    // Verify this revision belongs to the specified layout
    if (revisionToPublish.entity_id !== String(layoutId)) {
      throw error(404, 'Revision not found for this layout');
    }

    // Get current revision to use as parent
    const currentRevision = await getCurrentLayoutRevision(db, siteId, layoutId);

    // Create new revision at head with the content from the old revision
    const newRevision = await createLayoutRevision(db, siteId, layoutId, revisionToPublish.data, {
      userId,
      message: `Published from revision ${revisionToPublish.revision_hash}`,
      parentRevisionId: currentRevision?.id || revisionToPublish.id
    });

    // Mark the new revision as current
    await publishLayoutRevision(db, siteId, layoutId, newRevision.id);

    // Apply the revision data to the layout
    const { layout: layoutData, widgets } = revisionDataToLayout(revisionToPublish.data);

    // Update layout metadata
    await updateLayout(db, siteId, layoutId, {
      name: layoutData.name,
      slug: layoutData.slug,
      description: layoutData.description
    });

    // Delete all current layout widgets and recreate from revision
    await db.prepare('DELETE FROM layout_widgets WHERE layout_id = ?').bind(layoutId).run();

    // Insert widgets from revision
    for (const widget of widgets) {
      await db
        .prepare(
          `
          INSERT INTO layout_widgets (id, layout_id, type, position, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
        )
        .bind(widget.id, layoutId, widget.type, widget.position, JSON.stringify(widget.config))
        .run();
    }

    // Get layout name for logging
    const layoutResult = await db
      .prepare('SELECT name FROM layouts WHERE id = ? AND site_id = ?')
      .bind(layoutId, siteId)
      .first<{ name: string }>();

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: 'published',
      entityType: 'layout',
      entityId: String(layoutId),
      entityName: layoutResult?.name,
      revisionId: newRevision.id
    });

    return json({
      success: true,
      revision: {
        ...newRevision,
        is_current: true
      }
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error publishing layout revision:', err);
    throw error(500, 'Failed to publish revision');
  }
};
