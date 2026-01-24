import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPageById, getPageComponents } from '$lib/server/db/pages';
import {
  getPublishedRevision,
  getMostRecentDraftRevision,
  ensureInitialRevision
} from '$lib/server/db/revisions';
import {
  normalizeComponentPositions,
  needsPositionNormalization
} from '$lib/utils/componentPositions';
import { getAllColorThemes } from '$lib/server/db/color-themes';
import { getLayouts, getDefaultLayout, getLayoutComponents } from '$lib/server/db/layouts';
import { getComponentsWithChildrenCount } from '$lib/server/db/components';
import type { LayoutWidget, PageComponent } from '$lib/types/pages';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
  const siteId = locals.siteId;
  const db = platform?.env?.DB;

  if (!db) {
    throw error(500, 'Database connection not available');
  }

  // Load color themes for the site
  const colorThemes = await getAllColorThemes(db, siteId);

  // Load layouts for the site
  const layouts = await getLayouts(db, siteId);
  const defaultLayout = await getDefaultLayout(db, siteId);

  // Load custom components with children count for sidebar filtering
  const components = await getComponentsWithChildrenCount(db, siteId);

  // If no pageId, return empty state for new page creation
  if (!params.pageId) {
    // Load layout components for the default layout if available
    let layoutComponents: LayoutWidget[] = [];
    if (defaultLayout) {
      layoutComponents = await getLayoutComponents(db, defaultLayout.id);
    }

    return {
      page: null,
      pageComponents: [],
      pageProperties: undefined,
      layoutComponents,
      revisions: [],
      colorThemes,
      layouts,
      defaultLayoutId: defaultLayout?.id || null,
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
      isNewPage: true
    };
  }

  // Load existing page
  const page = await getPageById(db, siteId, params.pageId);
  if (!page) {
    throw error(404, 'Page not found');
  }

  // Load layout components for the page's layout (or default layout)
  let layoutComponents: LayoutWidget[] = [];
  const pageLayoutId = page.layout_id || defaultLayout?.id;
  if (pageLayoutId) {
    layoutComponents = await getLayoutComponents(db, pageLayoutId);
  }

  // Get page components from the database (current state)
  const dbWidgets = await getPageComponents(db, params.pageId);
  const currentComponents: PageComponent[] = dbWidgets.map((w) => ({
    id: w.id,
    page_id: w.page_id,
    type: w.type,
    config: typeof w.config === 'string' ? JSON.parse(w.config) : w.config,
    position: w.position,
    created_at: w.created_at,
    updated_at: w.updated_at
  }));

  // Ensure the page has at least one revision (creates initial if none exist)
  const revisions = await ensureInitialRevision(
    db,
    siteId,
    params.pageId,
    {
      title: page.title,
      slug: page.slug,
      status: page.status as 'draft' | 'published',
      colorTheme: page.colorTheme || undefined
    },
    currentComponents
  );

  // Load both published and latest draft revisions
  const publishedRevision = await getPublishedRevision(db, siteId, params.pageId);
  const latestDraft = await getMostRecentDraftRevision(db, siteId, params.pageId);

  let currentRevision: typeof publishedRevision = null;
  let currentRevisionIsPublished = false;

  // Determine which revision to load:
  // 1. If there's a draft newer than the published version, load the draft
  // 2. Otherwise, load the published version
  // 3. If no published version, load the draft
  // 4. If neither exists, currentRevision will be null
  if (latestDraft && publishedRevision) {
    // Compare timestamps - if draft is newer, use it
    const draftTime = new Date(latestDraft.created_at).getTime();
    const publishedTime = new Date(publishedRevision.created_at).getTime();

    if (draftTime > publishedTime) {
      currentRevision = latestDraft;
      currentRevisionIsPublished = false;
    } else {
      currentRevision = publishedRevision;
      currentRevisionIsPublished = true;
    }
  } else if (publishedRevision) {
    currentRevision = publishedRevision;
    currentRevisionIsPublished = true;
  } else if (latestDraft) {
    currentRevision = latestDraft;
    currentRevisionIsPublished = false;
  }

  // Use components from the selected revision, or empty array if no revision exists
  let pageComponents = currentRevision?.components || [];
  const currentRevisionId = currentRevision?.id || null;
  const pageProperties = currentRevision?.pageProperties || undefined;

  // Normalize component positions if needed (fixes duplicate positions bug)
  if (needsPositionNormalization(pageComponents)) {
    pageComponents = normalizeComponentPositions(pageComponents);
  }

  return {
    page,
    pageComponents: pageComponents,
    pageProperties,
    layoutComponents,
    revisions,
    currentRevisionId,
    currentRevisionIsPublished,
    colorThemes,
    layouts,
    defaultLayoutId: defaultLayout?.id || null,
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
    isNewPage: false
  };
};
