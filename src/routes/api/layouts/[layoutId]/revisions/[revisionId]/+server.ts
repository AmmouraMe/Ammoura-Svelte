import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getLayoutRevisionById } from '$lib/server/db/layout-revisions';
import type { RequestHandler } from './$types';
import type { LayoutRevisionData, ParsedRevision } from '$lib/types/revisions';
import type { PageComponent, ComponentType } from '$lib/types/pages';

/**
 * Response format for layout revision that matches ParsedPageRevision structure
 * This allows AdvancedBuilder to use the same code for all entity types
 */
interface LayoutRevisionResponse {
  id: string;
  page_id: string;
  revision_hash: string;
  parent_revision_id?: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  color_theme?: string;
  components: PageComponent[];
  is_published: boolean;
  created_by?: string;
  created_at: number;
  notes?: string;
  pageProperties?: Record<string, string>;
}

/**
 * Convert layout revision data to PageComponent format for AdvancedBuilder
 */
function revisionDataToComponents(
  layoutId: number,
  data: LayoutRevisionData,
  createdAt: number
): PageComponent[] {
  return data.widgets.map((widget) => ({
    id: widget.id,
    page_id: String(layoutId),
    type: widget.type as ComponentType,
    position: widget.position,
    config: widget.config,
    created_at: createdAt,
    updated_at: createdAt
  }));
}

/**
 * GET /api/layouts/[layoutId]/revisions/[revisionId]
 * Get a specific layout revision
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const layoutId = parseInt(params.layoutId);
  const revisionId = params.revisionId;

  if (isNaN(layoutId)) {
    throw error(400, 'Invalid layout ID');
  }

  try {
    const revision = (await getLayoutRevisionById(
      db,
      siteId,
      revisionId
    )) as ParsedRevision<LayoutRevisionData> | null;

    if (!revision) {
      throw error(404, 'Revision not found');
    }

    // Verify this revision belongs to the specified layout
    if (revision.entity_id !== String(layoutId)) {
      throw error(404, 'Revision not found for this layout');
    }

    // Convert to response format compatible with AdvancedBuilder
    const response: LayoutRevisionResponse = {
      id: revision.id,
      page_id: String(layoutId),
      revision_hash: revision.revision_hash,
      parent_revision_id: revision.parent_revision_id,
      title: revision.data.name,
      slug: revision.data.slug,
      status: revision.is_current ? 'published' : 'draft',
      components: revisionDataToComponents(layoutId, revision.data, revision.created_at),
      is_published: revision.is_current,
      created_by: revision.user_id,
      created_at: revision.created_at,
      notes: revision.message,
      // Layouts don't have page properties like components do
      pageProperties: undefined
    };

    return json(response);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching layout revision:', err);
    throw error(500, 'Failed to fetch revision');
  }
};
