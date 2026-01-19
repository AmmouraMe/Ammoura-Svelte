import type { PageServerLoad, Actions } from './$types';
import { getLayouts, deleteLayout, updateLayout } from '$lib/server/db/layouts';
import { error, fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const allLayouts = await getLayouts(db, siteId);

    // Separate built-in layouts from custom layouts
    const builtInLayouts = allLayouts.filter((layout) => layout.is_builtin);
    const layouts = allLayouts.filter((layout) => !layout.is_builtin);

    return {
      layouts,
      builtInLayouts
    };
  } catch (err) {
    console.error('Failed to load layouts:', err);
    throw error(500, 'Failed to load layouts');
  }
};

export const actions: Actions = {
  setDefault: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      const formData = await request.formData();
      const layoutId = parseInt(formData.get('layoutId') as string);

      if (!layoutId) {
        return fail(400, { error: 'Layout ID is required' });
      }

      await updateLayout(db, siteId, layoutId, { is_default: true });

      return { success: true };
    } catch (err) {
      console.error('Failed to set default layout:', err);
      return fail(500, { error: 'Failed to set default layout' });
    }
  },

  delete: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      const formData = await request.formData();
      const layoutId = parseInt(formData.get('layoutId') as string);

      if (!layoutId) {
        return fail(400, { error: 'Layout ID is required' });
      }

      await deleteLayout(db, siteId, layoutId);

      return { success: true };
    } catch (err) {
      console.error('Failed to delete layout:', err);
      return fail(500, { error: (err as Error).message || 'Failed to delete layout' });
    }
  }
};
