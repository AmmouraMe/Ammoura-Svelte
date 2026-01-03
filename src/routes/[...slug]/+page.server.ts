import { error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import { getPublishedRevision } from '$lib/server/db/revisions';
import { getLayout, getLayoutComponents, getDefaultLayout } from '$lib/server/db/layouts';
import { resolveComponentRefs } from '$lib/server/db/components';
import type { PageServerLoad } from './$types';
import { logPageAction } from '$lib/server/activity-logger';
import type { LayoutWidget } from '$lib/types/pages';

export const load: PageServerLoad = async ({
  params,
  platform,
  locals,
  url,
  getClientAddress,
  request
}) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  // Construct the full slug path
  const slug = '/' + (params.slug || '');

  // Check if this is a preview request
  const isPreview = url.searchParams.has('preview');

  try {
    // Fetch page by slug
    const page = await pagesDb.getPageBySlug(db, siteId, slug);

    // If page doesn't exist, let SvelteKit's 404 handler take over
    if (!page) {
      throw error(404, 'Page not found');
    }

    // Only show published pages on the frontend, unless it's a preview by an admin
    if (page.status !== 'published') {
      if (!isPreview || !locals.isAdmin) {
        throw error(404, 'Page not found');
      }
    }

    // Fetch components from published revision (Builder content)
    const publishedRevision = await getPublishedRevision(db, siteId, page.id);
    const rawComponents = publishedRevision?.components || [];

    // Resolve component_ref types to actual component types for frontend rendering
    const components = await resolveComponentRefs(db, siteId, rawComponents);

    // Fetch the layout for this page (use page's layout_id or default layout)
    let layout = null;
    let layoutComponents: LayoutWidget[] = [];

    if (page.layout_id) {
      layout = await getLayout(db, siteId, page.layout_id);
    } else {
      // Fall back to the site's default layout
      layout = await getDefaultLayout(db, siteId);
    }

    if (layout) {
      layoutComponents = await getLayoutComponents(db, layout.id);
    }

    // Log page view (only for published pages, not previews)
    if (!isPreview && page.status === 'published') {
      try {
        await logPageAction(db, {
          siteId,
          userId: locals.currentUser?.id || null,
          action: 'viewed',
          pageId: page.id,
          pageName: page.title,
          pageUrl: slug,
          ipAddress: getClientAddress(),
          userAgent: request.headers.get('user-agent')
        });
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log page view:', logError);
      }
    }

    return {
      page,
      components,
      layout,
      layoutComponents,
      colorTheme: page.colorTheme || null,
      isPreview: isPreview && page.status === 'draft',
      isAdmin: locals.isAdmin || false,
      currentUser: locals.currentUser || null
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error loading page:', err);
    throw error(500, 'Failed to load page');
  }
};
