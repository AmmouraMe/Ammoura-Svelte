import { error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import { getPublishedRevision, getMostRecentDraftRevision } from '$lib/server/db/revisions';
import { getLayout, getLayoutComponents, getDefaultLayout } from '$lib/server/db/layouts';
import { resolveComponentRefs, getComponent } from '$lib/server/db/components';
import type { PageServerLoad } from './$types';
import { logPageAction } from '$lib/server/activity-logger';
import type { LayoutWidget, WidgetConfig, PositionConfig, ResponsiveValue } from '$lib/types/pages';

// Layout data structure for page-specific layout overrides
interface PageLayoutData {
  navbar: {
    type: 'navbar';
    config: WidgetConfig;
    position?: ResponsiveValue<PositionConfig>;
  } | null;
  footer: {
    type: 'footer';
    config: WidgetConfig;
    position?: ResponsiveValue<PositionConfig>;
  } | null;
  // Flag to indicate this page has a custom layout (even if it has no navbar/footer)
  hasCustomLayout: boolean;
}

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

    // Fetch revision content - use draft for preview, published otherwise
    let revision;
    if (isPreview && locals.isAdmin) {
      // For admin preview, try to get the most recent draft revision
      revision = await getMostRecentDraftRevision(db, siteId, page.id);
      // Fall back to published if no draft exists
      if (!revision) {
        revision = await getPublishedRevision(db, siteId, page.id);
      }
    } else {
      // For public viewing, always use published revision
      revision = await getPublishedRevision(db, siteId, page.id);
    }

    const rawComponents = revision?.components || [];
    const pageProperties = revision?.pageProperties;

    // Resolve component_ref types to actual component types for frontend rendering
    const components = await resolveComponentRefs(db, siteId, rawComponents);

    // Fetch the layout for this page (use page's layout_id or default layout)
    let layout = null;
    let layoutComponents: LayoutWidget[] = [];
    // Track if this page has a custom layout (not using default)
    const hasCustomLayout = page.layout_id !== null && page.layout_id !== undefined;

    if (page.layout_id) {
      layout = await getLayout(db, siteId, page.layout_id);
    } else {
      // Fall back to the site's default layout
      layout = await getDefaultLayout(db, siteId);
    }

    if (layout) {
      layoutComponents = await getLayoutComponents(db, layout.id);
    }

    // Resolve navbar/footer from the page's layout for root layout to use
    const pageLayoutData: PageLayoutData = {
      navbar: null,
      footer: null,
      hasCustomLayout
    };

    // Only process layout data if the page has a custom layout
    // (otherwise let root layout use its default)
    if (hasCustomLayout && layoutComponents.length > 0) {
      for (const widget of layoutComponents) {
        const widgetPosition = widget.config?.position as
          | ResponsiveValue<PositionConfig>
          | undefined;

        // Handle component_ref widgets that reference navbar or footer
        if (widget.type === 'component_ref' && widget.config?.componentId) {
          const component = await getComponent(db, siteId, widget.config.componentId as number);
          if (component) {
            if (component.type === 'navbar') {
              pageLayoutData.navbar = {
                type: 'navbar',
                config: component.config,
                position: widgetPosition
              };
            } else if (component.type === 'footer') {
              pageLayoutData.footer = {
                type: 'footer',
                config: component.config,
                position: widgetPosition
              };
            }
          }
        }
        // Handle direct navbar/footer widgets
        else if (widget.type === 'navbar') {
          pageLayoutData.navbar = {
            type: 'navbar',
            config: widget.config || {},
            position: widgetPosition
          };
        } else if (widget.type === 'footer') {
          pageLayoutData.footer = {
            type: 'footer',
            config: widget.config || {},
            position: widgetPosition
          };
        }
      }
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

    // Use the revision's title if available - this ensures draft preview shows draft title
    // and published page shows published title, even if the pages.title has been updated
    const pageWithRevisionTitle = revision?.title ? { ...page, title: revision.title } : page;

    return {
      page: pageWithRevisionTitle,
      components,
      layout,
      layoutComponents,
      colorTheme: page.colorTheme || null,
      isPreview: isPreview && locals.isAdmin,
      isAdmin: locals.isAdmin || false,
      currentUser: locals.currentUser || null,
      // Page properties for title display override
      pageShowPageTitle: pageProperties?.showPageTitle,
      // Page-specific layout data for root layout to use
      pageLayoutData
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error loading page:', err);
    throw error(500, 'Failed to load page');
  }
};
