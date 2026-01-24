import type { PageServerLoad, Actions } from './$types';
import { createLayout } from '$lib/server/db/layouts';
import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';

export const load: PageServerLoad = async () => {
  return {};
};

export const actions: Actions = {
  default: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;

    try {
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const slug = formData.get('slug') as string;
      const isDefault = formData.get('is_default') === 'on';

      if (!name || !slug) {
        return fail(400, { error: 'Name and slug are required' });
      }

      const layout = await createLayout(db, siteId, {
        name,
        description: description || undefined,
        slug,
        is_default: isDefault
      });

      throw redirect(303, `/admin/layouts/${layout.id}/edit`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('Failed to create layout:', err);
      return fail(500, { error: 'Failed to create layout' });
    }
  }
};
