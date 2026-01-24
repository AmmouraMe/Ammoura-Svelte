import type { PageServerLoad, Actions } from './$types';
import { getComponent, updateComponent } from '$lib/server/db/components';
import { error, fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import type { WidgetConfig } from '$lib/types/pages';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    const component = await getComponent(db, siteId, componentId);
    if (!component) {
      throw error(404, 'Component not found');
    }

    return {
      component
    };
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('Failed to load component:', err);
    throw error(500, 'Failed to load component');
  }
};

export const actions: Actions = {
  default: async ({ params, request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const componentId = parseInt(params.id);

    if (isNaN(componentId)) {
      return fail(400, { error: 'Invalid component ID' });
    }

    try {
      const formData = await request.formData();
      const name = formData.get('name')?.toString();
      const description = formData.get('description')?.toString() || null;
      const configJson = formData.get('config')?.toString() || '{}';

      if (!name) {
        return fail(400, { error: 'Name is required', name, description: description || '' });
      }

      let config: WidgetConfig;
      try {
        config = JSON.parse(configJson);
      } catch (_err) {
        return fail(400, {
          error: 'Invalid JSON configuration',
          name,
          description: description || ''
        });
      }

      await updateComponent(db, siteId, componentId, {
        name,
        config: config as Record<string, unknown>,
        description: description || undefined
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to update component:', err);
      return fail(500, { error: 'Failed to update component' });
    }
  }
};
