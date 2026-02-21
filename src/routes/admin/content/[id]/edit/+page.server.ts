/**
 * Admin Edit Content Type page
 * Allows editing content type details and field schema
 */

import { error, fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getContentTypeById,
  updateContentType,
  updateContentTypeSchema,
  deleteContentType
} from '$lib/server/db/contentTypes';
import { getContentEntryCount } from '$lib/server/db/contentEntries';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { validateFieldSchema } from '$lib/server/db/contentSchemaValidation';
import type { PageServerLoad, Actions } from './$types';
import type { ContentFieldDefinition } from '$lib/types/contentTypes';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const contentTypeId = params.id;

  const contentType = await getContentTypeById(db, siteId, contentTypeId);
  if (!contentType) {
    throw error(404, 'Content type not found');
  }

  const entryCount = await getContentEntryCount(db, siteId, contentType.id);

  return { contentType, entryCount };
};

export const actions: Actions = {
  updateDetails: async ({ params, request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const description = formData.get('description')?.toString()?.trim() || '';
    const basePath = formData.get('basePath')?.toString()?.trim();
    const icon = formData.get('icon')?.toString()?.trim() || '📄';
    const status = formData.get('status')?.toString()?.trim() as 'active' | 'archived' | undefined;

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }
    if (!basePath || !basePath.startsWith('/')) {
      return fail(400, { error: 'Base path must start with /' });
    }

    try {
      await updateContentType(db, siteId, contentTypeId, {
        name,
        description,
        basePath,
        icon,
        status
      });

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Updated content type',
        description: `Updated content type "${name}"`,
        entity_type: 'content_type',
        entity_id: contentTypeId
      });

      return { success: true, message: 'Content type updated' };
    } catch (err) {
      console.error('Failed to update content type:', err);
      return fail(500, { error: 'Failed to update content type' });
    }
  },

  updateSchema: async ({ params, request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;
    const formData = await request.formData();

    const fieldsSchemaRaw = formData.get('fieldsSchema')?.toString();
    if (!fieldsSchemaRaw) {
      return fail(400, { error: 'Fields schema is required' });
    }

    let fieldsSchema: ContentFieldDefinition[];
    try {
      fieldsSchema = JSON.parse(fieldsSchemaRaw);
    } catch {
      return fail(400, { error: 'Invalid JSON for fields schema' });
    }

    // Validate schema structure and field configs
    const schemaValidation = validateFieldSchema(fieldsSchema);
    if (!schemaValidation.valid) {
      const firstError = schemaValidation.errors[0];
      return fail(400, { error: firstError.message, schemaErrors: schemaValidation.errors });
    }

    try {
      await updateContentTypeSchema(db, siteId, contentTypeId, fieldsSchema);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Updated content type schema',
        description: `Updated field schema for content type ${contentTypeId} (${fieldsSchema.length} fields)`,
        entity_type: 'content_type',
        entity_id: contentTypeId
      });

      return { success: true, message: 'Fields updated' };
    } catch (err) {
      console.error('Failed to update content type schema:', err);
      return fail(500, { error: 'Failed to update fields' });
    }
  },

  delete: async ({ params, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const contentTypeId = params.id;

    try {
      await deleteContentType(db, siteId, contentTypeId);

      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Deleted content type',
        description: `Deleted content type ${contentTypeId}`,
        entity_type: 'content_type',
        entity_id: contentTypeId
      });

      throw redirect(303, '/admin/content');
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 303
      ) {
        throw err;
      }
      console.error('Failed to delete content type:', err);
      return fail(500, { error: 'Failed to delete content type' });
    }
  }
};
