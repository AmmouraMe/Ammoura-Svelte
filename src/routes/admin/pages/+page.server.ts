import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db/connection';
import * as pagesDb from '$lib/server/db/pages';

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
