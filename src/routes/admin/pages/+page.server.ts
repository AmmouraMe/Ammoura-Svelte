import type { PageServerLoad, Actions } from './$types';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';
import { fail } from '@sveltejs/kit';
import { createActivityLog } from '$lib/server/db/activity-logs';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  const allPages = await pagesDb.getAllPagesWithRevisionInfo(db, siteId);

  // Separate built-in pages from custom pages
  const builtInPages = allPages.filter((page) => page.is_builtin);
  const customPages = allPages.filter((page) => !page.is_builtin);

  return {
    pages: customPages,
    builtInPages
  };
};

export const actions: Actions = {
  delete: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const userId = locals.user?.id;

    const formData = await request.formData();
    const pageId = formData.get('pageId')?.toString();

    if (!pageId) {
      return fail(400, { error: 'Page ID is required' });
    }

    try {
      // Get page info before deleting for the activity log
      const page = await pagesDb.getPageById(db, siteId, pageId);

      if (!page) {
        return fail(404, { error: 'Page not found' });
      }

      if (page.is_builtin) {
        return fail(403, { error: 'Cannot delete built-in pages' });
      }

      await pagesDb.deletePage(db, siteId, pageId);

      // Log the activity
      if (userId) {
        await createActivityLog(db, siteId, {
          user_id: userId,
          action: 'Deleted page',
          entity_type: 'page',
          entity_id: pageId,
          entity_name: page.title,
          description: `Deleted page "${page.title}" (/${page.slug})`
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete page:', error);
      return fail(500, { error: 'Failed to delete page' });
    }
  }
};
