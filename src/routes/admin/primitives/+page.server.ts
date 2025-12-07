import type { PageServerLoad, Actions } from './$types';
import { getComponents, getComponent, resetBuiltInComponent } from '$lib/server/db/components';
import { error, fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const allComponents = await getComponents(db, siteId);

    // Get only primitive components (excluding deprecated 'flex' type)
    const primitiveComponents = allComponents.filter((c) => c.is_primitive && c.type !== 'flex');

    return {
      primitiveComponents
    };
  } catch (err) {
    console.error('Failed to load primitives:', err);
    throw error(500, 'Failed to load primitives');
  }
};

export const actions: Actions = {
  reset: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      const formData = await request.formData();
      const componentId = parseInt(formData.get('id')?.toString() || '');

      if (isNaN(componentId)) {
        return fail(400, { error: 'Invalid component ID' });
      }

      // Get the component to check if it's a primitive
      const component = await getComponent(db, siteId, componentId);
      if (!component) {
        return fail(404, { error: 'Primitive not found' });
      }

      if (!component.is_primitive) {
        return fail(400, { error: 'Only primitives can be reset' });
      }

      // Reset the primitive to its original configuration
      await resetBuiltInComponent(db, String(siteId), componentId, component.type);

      return { success: true };
    } catch (err) {
      console.error('Failed to reset primitive:', err);
      return fail(500, { error: 'Failed to reset primitive' });
    }
  }
};
