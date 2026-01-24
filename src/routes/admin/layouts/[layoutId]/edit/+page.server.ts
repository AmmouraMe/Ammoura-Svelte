import type { PageServerLoad } from './$types';
import { getLayout, getLayoutWidgets } from '$lib/server/db/layouts';
import { getComponents } from '$lib/server/db/components';
import { error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const layoutId = parseInt(params.layoutId);

  if (isNaN(layoutId)) {
    throw error(400, 'Invalid layout ID');
  }

  try {
    const layout = await getLayout(db, siteId, layoutId);

    if (!layout) {
      throw error(404, 'Layout not found');
    }

    const widgets = await getLayoutWidgets(db, layoutId);
    const components = await getComponents(db, siteId);

    return {
      layout,
      widgets,
      components
    };
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('Failed to load layout:', err);
    throw error(500, 'Failed to load layout');
  }
};
