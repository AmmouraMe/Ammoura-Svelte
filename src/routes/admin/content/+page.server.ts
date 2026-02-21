/**
 * Admin Content Types listing page
 * Lists all content types with counts and management actions
 */

import { fail } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getAllContentTypes,
  deleteContentType,
  archiveContentType
} from '$lib/server/db/contentTypes';
import { getContentEntryCount } from '$lib/server/db/contentEntries';
import { createActivityLog } from '$lib/server/db/activity-logs';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;

  try {
    const contentTypes = await getAllContentTypes(db, siteId);

    // Fetch entry counts for each content type
    const contentTypesWithCounts = await Promise.all(
      contentTypes.map(async (ct) => {
        const entryCount = await getContentEntryCount(db, siteId, ct.id);
        const publishedCount = await getContentEntryCount(db, siteId, ct.id, 'published');
        return { ...ct, entryCount, publishedCount };
      })
    );

    return { contentTypes: contentTypesWithCounts };
  } catch (err) {
    console.error('Failed to load content types:', err);
    return { contentTypes: [] };
  }
};

export const actions: Actions = {
  delete: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const formData = await request.formData();
    const contentTypeId = formData.get('contentTypeId')?.toString();

    if (!contentTypeId) {
      return fail(400, { error: 'Content type ID is required' });
    }

    try {
      await deleteContentType(db, siteId, contentTypeId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Deleted content type',
        description: `Content type ${contentTypeId} was deleted`,
        entity_type: 'content_type',
        entity_id: contentTypeId
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to delete content type:', err);
      return fail(500, { error: 'Failed to delete content type' });
    }
  },

  archive: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const formData = await request.formData();
    const contentTypeId = formData.get('contentTypeId')?.toString();

    if (!contentTypeId) {
      return fail(400, { error: 'Content type ID is required' });
    }

    try {
      await archiveContentType(db, siteId, contentTypeId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Archived content type',
        description: `Content type ${contentTypeId} was archived`,
        entity_type: 'content_type',
        entity_id: contentTypeId
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to archive content type:', err);
      return fail(500, { error: 'Failed to archive content type' });
    }
  }
};
