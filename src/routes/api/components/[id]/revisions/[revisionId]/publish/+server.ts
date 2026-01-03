import { json, error } from '@sveltejs/kit';
import { getDB } from '$lib/server/db/connection';
import {
  getComponentRevisionById,
  publishComponentRevision,
  revisionDataToComponent
} from '$lib/server/db/component-revisions';
import { getComponent, saveComponentWithChildren } from '$lib/server/db/components';
import type { RequestHandler } from './$types';
import { logRevisionAction } from '$lib/server/activity-logger';
import type {
  ComponentRevisionData,
  ParsedRevision,
  ComponentChildData
} from '$lib/types/revisions';

/**
 * Prepare children for saveComponentWithChildren.
 * Revision data stores children in two possible formats:
 * 1. Flat array with parent_id references (from draft saves)
 * 2. Nested array with children property (from some older code paths)
 *
 * This function handles both cases and returns a flat array with parent_id references.
 */
function prepareChildrenForSave(children: ComponentChildData[] | undefined): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}> {
  if (!children || children.length === 0) {
    return [];
  }

  // Check if children are in flat format (have parent_id references)
  // If any child has parent_id defined, treat as flat format
  const isFlat = children.some((c) => c.parent_id !== undefined);

  if (isFlat) {
    // Already flat format - preserve parent_id references
    return children.map((child) => {
      // Clone config without nested children (if any)
      const { children: _nested, ...configWithoutChildren } = child.config as Record<
        string,
        unknown
      > & { children?: ComponentChildData[] };

      return {
        id: child.id,
        type: child.type,
        position: child.position,
        config: configWithoutChildren,
        parent_id: child.parent_id
      };
    });
  }

  // Nested format - flatten recursively
  return flattenNestedChildren(children, undefined);
}

/**
 * Flatten nested ComponentChildData structure into a flat array with parent_id references.
 */
function flattenNestedChildren(
  children: ComponentChildData[],
  parentId: string | undefined
): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}> {
  const result: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }> = [];

  for (const child of children) {
    // Clone config without the children property
    const { children: nestedChildren, ...configWithoutChildren } = child.config as Record<
      string,
      unknown
    > & { children?: ComponentChildData[] };

    // Add this child with the parent_id
    result.push({
      id: child.id,
      type: child.type,
      position: child.position,
      config: configWithoutChildren,
      parent_id: parentId
    });

    // Recursively flatten nested children
    const childNested = child.children || nestedChildren;
    if (childNested && Array.isArray(childNested)) {
      result.push(...flattenNestedChildren(childNested as ComponentChildData[], child.id));
    }
  }

  return result;
}

/**
 * POST /api/components/[id]/revisions/[revisionId]/publish
 * Publish a specific component revision by marking it as published (no new revision created).
 * This is used when the user has a saved draft revision that they want to publish directly.
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  const db = getDB(platform);
  const siteId = locals.siteId;
  const componentId = parseInt(params.id);
  const revisionId = params.revisionId;
  const userId = locals.user?.id;

  if (isNaN(componentId)) {
    throw error(400, 'Invalid component ID');
  }

  try {
    // Get the revision to publish
    const revisionToPublish = (await getComponentRevisionById(
      db,
      siteId,
      revisionId
    )) as ParsedRevision<ComponentRevisionData> | null;

    if (!revisionToPublish) {
      throw error(404, 'Revision not found');
    }

    // Verify this revision belongs to the specified component
    if (revisionToPublish.entity_id !== String(componentId)) {
      throw error(404, 'Revision not found for this component');
    }

    // Get current component to check type and is_global
    const component = await getComponent(db, siteId, componentId);
    if (!component) {
      throw error(404, 'Component not found');
    }

    // Mark the existing revision as published without creating a new one
    await publishComponentRevision(db, siteId, componentId, revisionId);

    // Apply the revision data to the component
    const componentData = revisionDataToComponent(revisionToPublish.data);

    // Get children from the revision data
    // Handle both formats:
    // 1. Normalized format: data.children at top level (from draft saves via componentToRevisionData)
    // 2. Legacy format: data.config.children (from migrations that snapshot component.config directly)
    const revisionChildren =
      revisionToPublish.data.children ||
      (revisionToPublish.data.config?.children as ComponentChildData[] | undefined);

    // Prepare children for saving - handles both flat (with parent_id) and nested formats
    const children = prepareChildrenForSave(revisionChildren);

    // Save the component with the new data
    await saveComponentWithChildren(db, siteId, componentId, {
      name: componentData.name,
      description: componentData.description,
      type: componentData.type,
      config: componentData.config,
      children
    });

    // Log activity
    await logRevisionAction(db, {
      siteId,
      userId: userId || null,
      action: 'published',
      entityType: 'component',
      entityId: String(componentId),
      entityName: component.name,
      revisionId
    });

    return json({
      success: true,
      revision: {
        id: revisionId,
        is_current: true
      }
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error publishing component revision:', err);
    throw error(500, 'Failed to publish revision');
  }
};
