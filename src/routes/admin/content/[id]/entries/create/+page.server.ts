/**
 * Admin Create Content Entry page
 * Dynamic form generated from content type's field schema
 */

import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { getContentTypeById } from '$lib/server/db/contentTypes';
import { createContentEntry, getContentEntryBySlug } from '$lib/server/db/contentEntries';
import { validateFieldValues, sanitizeFieldValues } from '$lib/server/db/contentValidation';
import { createActivityLog } from '$lib/server/db/activity-logs';
import type { PageServerLoad, Actions } from './$types';
import type { ContentFieldValues } from '$lib/types/contentTypes';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const contentTypeId = params.id;

  const contentType = await getContentTypeById(db, siteId, contentTypeId);
  if (!contentType) {
    throw error(404, 'Content type not found');
  }

  return { contentType };
};

export const actions: Actions = {
  create: async ({ params, request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;

    const contentType = await getContentTypeById(db, siteId, contentTypeId);
    if (!contentType) {
      throw error(404, 'Content type not found');
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString()?.trim();
    const slug = formData.get('slug')?.toString()?.trim();
    const status = (formData.get('status')?.toString() || 'draft') as 'draft' | 'published';
    const fieldValuesRaw = formData.get('fieldValues')?.toString();

    if (!title) {
      return fail(400, { error: 'Title is required' });
    }
    if (!slug) {
      return fail(400, { error: 'Slug is required' });
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return fail(400, { error: 'Slug must be lowercase with hyphens only' });
    }

    // Check for duplicate slug within this content type
    const existing = await getContentEntryBySlug(db, siteId, contentTypeId, slug);
    if (existing) {
      return fail(400, { error: 'An entry with this slug already exists' });
    }

    // Parse and validate field values
    let fieldValues: ContentFieldValues = {};
    if (fieldValuesRaw) {
      try {
        fieldValues = JSON.parse(fieldValuesRaw);
      } catch {
        return fail(400, { error: 'Invalid field values' });
      }
    }

    // Validate against schema
    const validation = validateFieldValues(contentType.fieldsSchema, fieldValues);
    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => `${e.fieldSlug}: ${e.message}`).join('; ');
      return fail(400, { error: `Validation failed: ${errorMessages}` });
    }

    // Sanitize field values
    const sanitized = sanitizeFieldValues(contentType.fieldsSchema, fieldValues);

    try {
      const entry = await createContentEntry(db, siteId, {
        contentTypeId,
        title,
        slug,
        fieldValues: sanitized,
        status,
        authorId: locals.currentUser?.id
      });

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Created content entry',
        description: `Created "${title}" in ${contentType.name}`,
        entity_type: 'content_entry',
        entity_id: entry.id
      });

      throw redirect(303, `/admin/content/${contentTypeId}/entries/${entry.id}/edit`);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 303
      ) {
        throw err;
      }
      console.error('Failed to create entry:', err);
      return fail(500, { error: 'Failed to create entry' });
    }
  }
};
