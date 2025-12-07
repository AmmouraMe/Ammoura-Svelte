/**
 * Database functions for component revisions
 * Provides CRUD operations for tracking component changes using the generic revisions system
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  ParsedRevision,
  RevisionNode,
  ComponentRevisionData,
  ComponentChildData
} from '$lib/types/revisions';
import {
  createRevision,
  getRevisions,
  getRevisionById,
  getCurrentRevision,
  setCurrentRevision,
  buildRevisionTree
} from './revisions-service';

/**
 * Get the original (first published) revision for a component
 * This is used for resetting built-in components to their default state
 */
export async function getOriginalComponentRevision(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<ParsedRevision<ComponentRevisionData> | null> {
  // Get all revisions ordered by creation date (oldest first)
  const result = await db
    .prepare(
      `
      SELECT * FROM revisions
      WHERE site_id = ? AND entity_type = 'component' AND entity_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `
    )
    .bind(siteId, String(componentId))
    .first<{
      id: string;
      site_id: string;
      entity_type: string;
      entity_id: string;
      revision_hash: string;
      parent_revision_id?: string;
      data: string;
      user_id?: string;
      created_at: number;
      is_current: boolean;
      message?: string;
    }>();

  if (!result) return null;

  return {
    ...result,
    entity_type: 'component',
    data: JSON.parse(result.data) as ComponentRevisionData
  };
}

/**
 * Get all revisions for a component
 */
export async function getComponentRevisions(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<ParsedRevision<ComponentRevisionData>[]> {
  return getRevisions<ComponentRevisionData>(db, siteId, 'component', String(componentId));
}

/**
 * Get a specific component revision by ID
 */
export async function getComponentRevisionById(
  db: D1Database,
  siteId: string,
  revisionId: string
): Promise<ParsedRevision<ComponentRevisionData> | null> {
  return getRevisionById<ComponentRevisionData>(db, siteId, revisionId);
}

/**
 * Get the current (published) revision for a component
 */
export async function getCurrentComponentRevision(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<ParsedRevision<ComponentRevisionData> | null> {
  return getCurrentRevision<ComponentRevisionData>(db, siteId, 'component', String(componentId));
}

/**
 * Create a new revision for a component
 */
export async function createComponentRevision(
  db: D1Database,
  siteId: string,
  componentId: number,
  data: ComponentRevisionData,
  options?: {
    userId?: string;
    message?: string;
    parentRevisionId?: string;
  }
): Promise<ParsedRevision<ComponentRevisionData>> {
  return createRevision<ComponentRevisionData>(db, siteId, {
    entity_type: 'component',
    entity_id: String(componentId),
    data,
    user_id: options?.userId,
    message: options?.message,
    parent_revision_id: options?.parentRevisionId
  });
}

/**
 * Publish a component revision (make it the current/live version)
 */
export async function publishComponentRevision(
  db: D1Database,
  siteId: string,
  componentId: number,
  revisionId: string
): Promise<void> {
  await setCurrentRevision(db, siteId, 'component', String(componentId), revisionId);
}

/**
 * Create an initial revision for a component and mark it as published
 * This is used when creating built-in components to establish their default state
 */
export async function createInitialComponentRevision(
  db: D1Database,
  siteId: string,
  componentId: number,
  data: ComponentRevisionData,
  options?: {
    userId?: string;
    message?: string;
  }
): Promise<ParsedRevision<ComponentRevisionData>> {
  // Create the revision
  const revision = await createComponentRevision(db, siteId, componentId, data, {
    userId: options?.userId,
    message: options?.message || 'Initial default configuration'
  });

  // Mark it as the current (published) revision
  await publishComponentRevision(db, siteId, componentId, revision.id);

  return {
    ...revision,
    is_current: true
  };
}

/**
 * Build revision tree for a component (for visualization)
 */
export async function buildComponentRevisionTree(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<RevisionNode<ComponentRevisionData>[]> {
  return buildRevisionTree<ComponentRevisionData>(db, siteId, 'component', String(componentId));
}

/**
 * Reset a component to its original default revision
 * This restores the component to its first published state
 */
export async function resetComponentToOriginal(
  db: D1Database,
  siteId: string,
  componentId: number
): Promise<ComponentRevisionData | null> {
  // Get the original (first) revision
  const originalRevision = await getOriginalComponentRevision(db, siteId, componentId);

  if (!originalRevision) {
    return null;
  }

  // Apply the original revision data to the component
  await db
    .prepare(
      `
      UPDATE components 
      SET config = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
    .bind(JSON.stringify(originalRevision.data.config), componentId)
    .run();

  // Clear any component widgets (they're stored in config.children now)
  await db.prepare('DELETE FROM component_widgets WHERE component_id = ?').bind(componentId).run();

  // Mark the original revision as current
  await publishComponentRevision(db, siteId, componentId, originalRevision.id);

  return originalRevision.data;
}

/**
 * Convert component config and children to revision data format
 */
export function componentToRevisionData(component: {
  name: string;
  description?: string;
  type: string;
  config: Record<string, unknown>;
}): ComponentRevisionData {
  const config = { ...component.config };
  const children = config.children as ComponentChildData[] | undefined;

  // Remove children from config as they're stored separately in revision data
  delete config.children;

  return {
    name: component.name,
    description: component.description,
    type: component.type,
    config,
    children
  };
}

/**
 * Convert revision data back to component format
 */
export function revisionDataToComponent(data: ComponentRevisionData): {
  name: string;
  description?: string;
  type: string;
  config: Record<string, unknown>;
} {
  const config = { ...data.config };

  // Merge children back into config if present
  if (data.children && data.children.length > 0) {
    config.children = data.children;
  }

  return {
    name: data.name,
    description: data.description,
    type: data.type,
    config
  };
}
