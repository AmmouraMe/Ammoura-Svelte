import type { PageServerLoad, Actions } from './$types';
import { createComponent } from '$lib/server/db/components';
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import type { WidgetType, WidgetConfig } from '$lib/types/pages';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      const formData = await request.formData();
      const name = formData.get('name')?.toString();
      const description = formData.get('description')?.toString() || null;
      const widgetType = formData.get('widget_type')?.toString() as WidgetType;
      const configJson = formData.get('config')?.toString() || '{}';

      if (!name || !widgetType) {
        return fail(400, {
          error: 'Name and widget type are required',
          name,
          description: description || '',
          widgetType
        });
      }

      let config: WidgetConfig;
      try {
        config = JSON.parse(configJson);
      } catch (_err) {
        return fail(400, {
          error: 'Invalid JSON configuration',
          name,
          description: description || '',
          widgetType
        });
      }

      const component = await createComponent(db, siteId, {
        name,
        type: widgetType,
        config: config as Record<string, unknown>,
        description: description || undefined
      });

      throw redirect(303, `/admin/components/${component.id}/edit`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('Failed to create component:', err);
      return fail(500, { error: 'Failed to create component' });
    }
  }
};
