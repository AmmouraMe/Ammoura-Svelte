import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllColorThemes } from '$lib/server/db/color-themes';
import { getComponentsWithChildrenCount } from '$lib/server/db/components';
import { buildLayoutRevisionTree, ensureLayoutHasRevision } from '$lib/server/db/layout-revisions';
import type { RevisionNode as GenericRevisionNode, LayoutRevisionData } from '$lib/types/revisions';
import type { ComponentType, PageStatus, RevisionNode, PageComponent } from '$lib/types/pages';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  const siteId = locals.siteId;
  const db = platform?.env?.DB;

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  // Load color themes for the site
  const colorThemes = await getAllColorThemes(db, siteId);

  // Load custom components with children count for sidebar filtering
  const components = await getComponentsWithChildrenCount(db, siteId);

  // If no layoutId, return empty state for new layout creation with default Yield widget
  if (!params.layoutId) {
    return {
      layout: null,
      components: [
        {
          id: crypto.randomUUID(),
          layout_id: 0,
          type: 'yield',
          position: 0,
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      revisions: [],
      colorThemes,
      customComponents: components,
      userName: locals.currentUser?.name || locals.currentUser?.email,
      currentUser: locals.currentUser
        ? {
            id: locals.currentUser.id,
            name: locals.currentUser.name,
            email: locals.currentUser.email,
            role: locals.currentUser.role
          }
        : null,
      isNewLayout: true
    };
  }

  // Load existing layout
  const layoutResult = await db
    .prepare('SELECT * FROM layouts WHERE id = ? AND site_id = ?')
    .bind(params.layoutId, siteId)
    .first();

  if (!layoutResult) {
    throw error(404, 'Layout not found');
  }

  const layout = {
    id: layoutResult.id as number,
    site_id: layoutResult.site_id as string,
    name: layoutResult.name as string,
    description: layoutResult.description as string | undefined,
    slug: layoutResult.slug as string,
    is_default: !!layoutResult.is_default,
    created_at: layoutResult.created_at as string,
    updated_at: layoutResult.updated_at as string
  };

  // Load layout widgets
  const widgetsResult = await db
    .prepare('SELECT * FROM layout_widgets WHERE layout_id = ? ORDER BY position')
    .bind(params.layoutId)
    .all();

  const widgets =
    widgetsResult.results?.map((w) => ({
      id: w.id as string,
      layout_id: w.layout_id as number,
      type: w.type as string,
      position: w.position as number,
      config: typeof w.config === 'string' ? JSON.parse(w.config) : w.config,
      created_at: w.created_at as string,
      updated_at: w.updated_at as string
    })) || [];

  // Ensure layout has at least one revision (creates initial if none exist)
  const currentUserId = locals.currentUser?.id?.toString();
  await ensureLayoutHasRevision(
    db,
    siteId,
    layout.id,
    {
      name: layout.name,
      description: layout.description,
      slug: layout.slug,
      is_default: layout.is_default
    },
    widgets.map((w) => ({
      id: w.id,
      type: w.type,
      position: w.position,
      config: w.config as Record<string, unknown>
    })),
    currentUserId
  );

  // Get revision tree for this layout (with children/depth/branch populated)
  const revisionTree = await buildLayoutRevisionTree(db, siteId, layout.id);

  // Find the current (published) revision
  const currentRevision = revisionTree.find((r) => r.is_current);

  // Recursively map revisions to RevisionNode format for compatibility with AdvancedBuilder
  // This preserves the tree structure (children, depth, branch) from buildLayoutRevisionTree
  const mapRevision = (r: GenericRevisionNode<LayoutRevisionData>): RevisionNode => ({
    id: r.id,
    page_id: String(layout.id), // Use layout id for compatibility with RevisionNode
    revision_hash: r.revision_hash,
    parent_revision_id: r.parent_revision_id,
    title: r.data.name,
    slug: r.data.slug,
    status: (r.is_current ? 'published' : 'draft') as PageStatus,
    color_theme: undefined,
    components: r.data.widgets.map((w) => ({
      id: w.id,
      page_id: String(layout.id),
      type: w.type as ComponentType,
      position: w.position,
      config: w.config,
      created_at: r.created_at,
      updated_at: r.created_at
    })) as PageComponent[],
    is_published: r.is_current,
    created_by: r.user_id,
    created_at: r.created_at,
    notes: r.message,
    // Preserve tree structure from buildLayoutRevisionTree
    children: r.children.map(mapRevision),
    depth: r.depth,
    branch: r.branch
  });

  const mappedRevisions: RevisionNode[] = revisionTree.map(mapRevision);

  return {
    layout,
    components: widgets,
    revisions: mappedRevisions,
    currentRevisionId: currentRevision?.id || null,
    currentRevisionIsPublished: currentRevision?.is_current || false,
    colorThemes,
    customComponents: components,
    userName: locals.currentUser?.name || locals.currentUser?.email,
    currentUser: locals.currentUser
      ? {
          id: locals.currentUser.id,
          name: locals.currentUser.name,
          email: locals.currentUser.email,
          role: locals.currentUser.role
        }
      : null,
    isNewLayout: false
  };
};
