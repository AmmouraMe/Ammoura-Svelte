/**
 * Admin Create Content Type page
 * Allows creating from a template or from scratch
 */

import { fail, redirect } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import { createContentType, getContentTypeBySlug } from '$lib/server/db/contentTypes';
import { createActivityLog } from '$lib/server/db/activity-logs';
import { getAllContentTypeTemplates, getContentTypeTemplate } from '$lib/server/contentTemplates';
import type { PageServerLoad, Actions } from './$types';
import type { ContentFieldDefinition } from '$lib/types/contentTypes';

export const load: PageServerLoad = async () => {
  const templates = getAllContentTypeTemplates();
  return { templates };
};

export const actions: Actions = {
  create: async ({ request, platform, locals }) => {
    const db = getDB(platform);
    const siteId = locals.siteId;
    const formData = await request.formData();

    const name = formData.get('name')?.toString()?.trim();
    const slug = formData.get('slug')?.toString()?.trim();
    const description = formData.get('description')?.toString()?.trim() || '';
    const basePath = formData.get('basePath')?.toString()?.trim();
    const icon = formData.get('icon')?.toString()?.trim() || '📄';
    const templateId = formData.get('templateId')?.toString()?.trim();
    const fieldsSchemaRaw = formData.get('fieldsSchema')?.toString();

    // Validation
    if (!name) {
      return fail(400, { error: 'Name is required', name, slug, description, basePath, icon });
    }
    if (!slug) {
      return fail(400, { error: 'Slug is required', name, slug, description, basePath, icon });
    }
    if (!basePath) {
      return fail(400, {
        error: 'Base path is required',
        name,
        slug,
        description,
        basePath,
        icon
      });
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return fail(400, {
        error: 'Slug must be lowercase alphanumeric with hyphens only',
        name,
        slug,
        description,
        basePath,
        icon
      });
    }

    // Validate base path format
    if (!basePath.startsWith('/')) {
      return fail(400, {
        error: 'Base path must start with /',
        name,
        slug,
        description,
        basePath,
        icon
      });
    }

    // Check for duplicate slug
    const existing = await getContentTypeBySlug(db, siteId, slug);
    if (existing) {
      return fail(400, {
        error: 'A content type with this slug already exists',
        name,
        slug,
        description,
        basePath,
        icon
      });
    }

    // Resolve fields schema: from template or from custom JSON
    let fieldsSchema: ContentFieldDefinition[] = [];

    if (templateId) {
      const template = getContentTypeTemplate(templateId);
      if (template) {
        fieldsSchema = template.fieldsSchema;
      }
    }

    if (fieldsSchemaRaw) {
      try {
        fieldsSchema = JSON.parse(fieldsSchemaRaw);
      } catch {
        return fail(400, {
          error: 'Invalid fields schema JSON',
          name,
          slug,
          description,
          basePath,
          icon
        });
      }
    }

    let contentType;
    try {
      contentType = await createContentType(db, siteId, {
        name,
        slug,
        description,
        basePath,
        icon,
        fieldsSchema
      });
    } catch (err) {
      console.error('Failed to create content type:', err);
      return fail(500, {
        error: 'Failed to create content type',
        name,
        slug,
        description,
        basePath,
        icon
      });
    }

    // Log activity after successful creation (non-blocking)
    try {
      await createActivityLog(db, siteId, {
        user_id: locals.currentUser?.id || 'unknown',
        action: 'Created content type',
        description: `Created content type "${name}" (${slug})`,
        entity_type: 'content_type',
        entity_id: contentType.id
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }

    throw redirect(303, `/admin/content/${contentType.id}/edit`);
  }
};
