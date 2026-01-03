import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getLayoutRevisions,
  buildLayoutRevisionTree,
  createLayoutRevision,
  layoutToRevisionData
} from '$lib/server/db/layout-revisions';
import type { RequestHandler } from './$types';
import { logRevisionAction } from '$lib/server/activity-logger';

/**
 * GET /api/layouts/[layoutId]/revisions
 * Get revision tree structure for a layout (includes branching graph)
 */
export const GET: RequestHandler = async ({ params, platform, locals, url }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const layoutId = parseInt(params.layoutId);

  if (isNaN(layoutId)) {
    throw error(400, 'Invalid layout ID');
  }

  try {
    // Check if client wants the tree structure or just a flat list
    const includeTree = url.searchParams.get('tree') === 'true';

    if (includeTree) {
      const tree = await buildLayoutRevisionTree(db, siteId, layoutId);
      return json(tree);
    } else {
      const revisions = await getLayoutRevisions(db, siteId, layoutId);
      return json(revisions);
    }
  } catch (err) {
    console.error('Error fetching layout revisions:', err);
    throw error(500, 'Failed to fetch revisions');
  }
};

/**
 * POST /api/layouts/[layoutId]/revisions
 * Create a new revision for a layout
 */
export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const layoutId = parseInt(params.layoutId);
  const userId = locals.user?.id;

  if (isNaN(layoutId)) {
    throw error(400, 'Invalid layout ID');
  }

  try {
    const data = (await request.json()) as {
      name: string;
      description?: string;
      slug: string;
      is_default: boolean;
      widgets: Array<{
        id: string;
        type: string;
        position: number;
        config: Record<string, unknown>;
      }>;
      message?: string;
      parentRevisionId?: string;
    };

    const revisionData = layoutToRevisionData(
      {
        name: data.name,
        description: data.description,
        slug: data.slug,
        is_default: data.is_default
      },
      data.widgets
    );

    const revision = await createLayoutRevision(db, siteId, layoutId, revisionData, {
      userId,
      message: data.message,
      parentRevisionId: data.parentRevisionId
    });

    // Get layout name for logging
    const layoutResult = await db
      .prepare('SELECT name FROM layouts WHERE id = ? AND site_id = ?')
      .bind(layoutId, siteId)
      .first<{ name: string }>();

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: 'created',
      entityType: 'layout',
      entityId: String(layoutId),
      entityName: layoutResult?.name,
      revisionId: revision.id,
      revisionMessage: data.message,
      parentRevisionId: data.parentRevisionId
    });

    return json(revision);
  } catch (err) {
    console.error('Error creating layout revision:', err);
    throw error(500, 'Failed to create revision');
  }
};
