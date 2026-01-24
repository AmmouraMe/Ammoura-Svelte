import type { PageServerLoad } from './$types';
import { getDB, getAllProducts, getProductFulfillmentOptions } from '$lib/server/db';
import * as pagesDb from '$lib/server/db/pages';
import { getPublishedRevision } from '$lib/server/db/revisions';
import { resolveComponentRefs } from '$lib/server/db/components';
import * as colorThemes from '$lib/server/db/color-themes';
import type { PageComponent, PageProperties } from '$lib/types/pages';

export const load: PageServerLoad = async ({ platform, locals }) => {
  // If platform is not available (development without D1), fall back to empty array
  if (!platform?.env?.DB) {
    return {
      products: [],
      page: null,
      components: [],
      isAdmin: false,
      systemLightTheme: 'vibrant',
      systemDarkTheme: 'midnight'
    };
  }

  try {
    const db = getDB(platform);
    const siteId = locals.siteId || 'default-site';

    // Get system default theme IDs
    const [systemLightThemeId, systemDarkThemeId] = await Promise.all([
      colorThemes.getThemePreference(db, siteId, 'system-light-theme'),
      colorThemes.getThemePreference(db, siteId, 'system-dark-theme')
    ]);

    // Check if a page exists for the home route '/'
    const page = await pagesDb.getPageBySlug(db, siteId, '/');

    let components: PageComponent[] = [];
    let pageProperties: PageProperties | undefined;
    if (page && page.status === 'published') {
      // Fetch components from published revision (Builder content)
      const publishedRevision = await getPublishedRevision(db, siteId, page.id);
      const rawComponents = publishedRevision?.components || [];
      pageProperties = publishedRevision?.pageProperties;

      // Resolve component_ref types to actual component types for frontend rendering
      components = await resolveComponentRefs(db, siteId, rawComponents);
    }

    // Fetch products from D1 database
    const dbProducts = await getAllProducts(db, siteId);

    // Transform database products to match the Product type
    const products = await Promise.all(
      dbProducts.map(async (p) => {
        const fulfillmentOptions = await getProductFulfillmentOptions(db, siteId, p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category: p.category,
          stock: p.stock,
          type: p.type,
          tags: JSON.parse(p.tags || '[]') as string[],
          fulfillmentOptions
        };
      })
    );

    return {
      products,
      page,
      components,
      pageProperties,
      colorTheme: page?.colorTheme || null,
      isAdmin: locals.isAdmin || false,
      systemLightTheme: systemLightThemeId || 'vibrant',
      systemDarkTheme: systemDarkThemeId || 'midnight'
    };
  } catch (error) {
    console.error('Error loading home page:', error);
    // Return empty arrays on error to prevent page from breaking
    return {
      products: [],
      page: null,
      components: [],
      isAdmin: false,
      systemLightTheme: 'vibrant',
      systemDarkTheme: 'midnight'
    };
  }
};
