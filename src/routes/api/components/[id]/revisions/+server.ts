import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getComponentRevisions,
  buildComponentRevisionTree,
  createComponentRevision,
  componentToRevisionData
} from '$lib/server/db/component-revisions';
import { getComponent } from '$lib/server/db/components';
import type { RequestHandler } from './$types';
import { logRevisionAction } from '$lib/server/activity-logger';

/**
 * GET /api/components/[id]/revisions
 * Get revision tree structure for a component (includes branching graph)
 */
export const GET: RequestHandler = async ({ params, platform, locals, url }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    // Check if client wants the tree structure or just a flat list
    const includeTree = url.searchParams.get('tree') === 'true';

    if (includeTree) {
      const tree = await buildComponentRevisionTree(db, siteId, componentId);
      return json(tree);
    } else {
      const revisions = await getComponentRevisions(db, siteId, componentId);
      return json(revisions);
    }
  } catch (err) {
    console.error('Error fetching component revisions:', err);
    throw error(500, 'Failed to fetch revisions');
  }
};

/**
 * POST /api/components/[id]/revisions
 * Create a new revision for a component
 */
export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);
  const userId = locals.user?.id;

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    const data = (await request.json()) as {
      name: string;
      description?: string;
      type: string;
      config: Record<string, unknown>;
      message?: string;
      parentRevisionId?: string;
    };

    const revisionData = componentToRevisionData({
      name: data.name,
      description: data.description,
      type: data.type,
      config: data.config
    });

    const revision = await createComponentRevision(db, siteId, componentId, revisionData, {
      userId,
      message: data.message,
      parentRevisionId: data.parentRevisionId
    });

    // Get component name for logging
    const component = await getComponent(db, siteId, componentId);

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: 'created',
      entityType: 'component',
      entityId: String(componentId),
      entityName: component?.name,
      revisionId: revision.id,
      revisionMessage: data.message,
      parentRevisionId: data.parentRevisionId
    });

    return json(revision);
  } catch (err) {
    console.error('Error creating component revision:', err);
    throw error(500, 'Failed to create revision');
  }
};
