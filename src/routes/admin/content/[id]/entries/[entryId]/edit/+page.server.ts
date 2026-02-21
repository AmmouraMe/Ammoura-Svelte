/**
 * Admin Edit Content Entry page
 * Pre-populated form with existing entry data and field schema
 */

import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getContentTypeById } from '$lib/server/db/contentTypes';
import {
  getContentEntryById,
  getContentEntryBySlug,
  updateContentEntry,
  deleteContentEntry,
  publishContentEntry,
  unpublishContentEntry,
  getEntryTags,
  setEntryTags
} from '$lib/server/db/contentEntries';
import { validateFieldValues, sanitizeFieldValues } from '$lib/server/db/contentValidation';
import { createActivityLog } from '$lib/server/db/activity-logs';
import type { PageServerLoad, Actions } from './$types';
import type { ContentFieldValues } from '$lib/types/contentTypes';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const contentTypeId = params.id;
  const entryId = params.entryId;

  const contentType = await getContentTypeById(db, siteId, contentTypeId);
  if (!contentType) {
    throw error(404, 'Content type not found');
  }

  const entry = await getContentEntryById(db, siteId, entryId);
  if (!entry || entry.contentTypeId !== contentTypeId) {
    throw error(404, 'Entry not found');
  }

  const tags = await getEntryTags(db, siteId, entryId);

  return { contentType, entry, tags };
};

export const actions: Actions = {
  update: async ({ params, request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;
    const entryId = params.entryId;

    const contentType = await getContentTypeById(db, siteId, contentTypeId);
    if (!contentType) {
      throw error(404, 'Content type not found');
    }

    const entry = await getContentEntryById(db, siteId, entryId);
    if (!entry) {
      throw error(404, 'Entry not found');
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const slug = formData.get('slug')?.toString()?.trim();
    const fieldValuesRaw = formData.get('fieldValues')?.toString();
    const tagsRaw = formData.get('tags')?.toString()?.trim() || '';

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }
    if (!slug) {
      return fail(400, { error: 'Slug is required' });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return fail(400, { error: 'Slug must be lowercase with hyphens only' });
    }

    // Check for duplicate slug (excluding current entry)
    if (slug !== entry.slug) {
      const existing = await getContentEntryBySlug(db, siteId, contentTypeId, slug);
      if (existing && existing.id !== entryId) {
        return fail(400, { error: 'An entry with this slug already exists' });
      }
    }

    let fieldValues: ContentFieldValues = {};
    if (fieldValuesRaw) {
      try {
        fieldValues = JSON.parse(fieldValuesRaw);
      } catch {
        return fail(400, { error: 'Invalid field values' });
      }
    }

    const validation = validateFieldValues(contentType.fieldsSchema, fieldValues);
    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => `${e.fieldSlug}: ${e.message}`).join('; ');
      return fail(400, { error: `Validation failed: ${errorMessages}` });
    }

    const sanitized = sanitizeFieldValues(contentType.fieldsSchema, fieldValues);

    // Parse tags
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updateContentEntry(db, siteId, entryId, {
        title,
        slug,
        fieldValues: sanitized
      });

      if (tags.length > 0) {
        await setEntryTags(
          db,
          siteId,
          contentTypeId,
          entryId,
          tags.map((t) => ({ tagName: t }))
        );
      } else {
        await setEntryTags(db, siteId, contentTypeId, entryId, []);
      }

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Updated content entry',
        description: `Updated "${title}" in ${contentType.name}`,
        entity_type: 'content_entry',
        entity_id: entryId
      });

      return { success: true, message: 'Entry updated successfully' };
    } catch (err) {
      console.error('Failed to update entry:', err);
      return fail(500, { error: 'Failed to update entry' });
    }
  },

  publish: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const entryId = params.entryId;

    try {
      await publishContentEntry(db, siteId, entryId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Published content entry',
        description: `Published entry ${entryId}`,
        entity_type: 'content_entry',
        entity_id: entryId
      });

      return { success: true, message: 'Entry published' };
    } catch (err) {
      console.error('Failed to publish entry:', err);
      return fail(500, { error: 'Failed to publish entry' });
    }
  },

  unpublish: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const entryId = params.entryId;

    try {
      await unpublishContentEntry(db, siteId, entryId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Unpublished content entry',
        description: `Unpublished entry ${entryId}`,
        entity_type: 'content_entry',
        entity_id: entryId
      });

      return { success: true, message: 'Entry unpublished' };
    } catch (err) {
      console.error('Failed to unpublish entry:', err);
      return fail(500, { error: 'Failed to unpublish entry' });
    }
  },

  delete: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;
    const entryId = params.entryId;

    try {
      const entry = await getContentEntryById(db, siteId, entryId);
      await deleteContentEntry(db, siteId, entryId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Deleted content entry',
        description: `Deleted "${entry?.title || entryId}"`,
        entity_type: 'content_entry',
        entity_id: entryId
      });

      throw redirect(303, `/admin/content/${contentTypeId}/entries`);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 303
      ) {
        throw err;
      }
      console.error('Failed to delete entry:', err);
      return fail(500, { error: 'Failed to delete entry' });
    }
  }
};
