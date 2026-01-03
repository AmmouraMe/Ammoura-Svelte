/**
 * Database functions for layout revisions
 * Provides CRUD operations for tracking layout changes using the generic revisions system
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  ParsedRevision,
  RevisionNode,
  LayoutRevisionData,
  LayoutWidgetData
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
 * Get the original (first published) revision for a layout
 * This is used for resetting layouts to their default state
 */
export async function getOriginalLayoutRevision(
  db: D1Database,
  siteId: string,
  layoutId: number
): Promise<ParsedRevision<LayoutRevisionData> | null> {
  // Get all revisions ordered by creation date (oldest first)
  const result = await db
    .prepare(
      `
      SELECT * FROM revisions
      WHERE site_id = ? AND entity_type = 'layout' AND entity_id = ?
      ORDER BY created_at ASC
      LIMIT 1
    `
    )
    .bind(siteId, String(layoutId))
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
    entity_type: 'layout',
    data: JSON.parse(result.data) as LayoutRevisionData
  };
}

/**
 * Get all revisions for a layout
 */
export async function getLayoutRevisions(
  db: D1Database,
  siteId: string,
  layoutId: number
): Promise<ParsedRevision<LayoutRevisionData>[]> {
  return getRevisions<LayoutRevisionData>(db, siteId, 'layout', String(layoutId));
}

/**
 * Get a specific layout revision by ID
 */
export async function getLayoutRevisionById(
  db: D1Database,
  siteId: string,
  revisionId: string
): Promise<ParsedRevision<LayoutRevisionData> | null> {
  return getRevisionById<LayoutRevisionData>(db, siteId, revisionId);
}

/**
 * Get the current (published) revision for a layout
 */
export async function getCurrentLayoutRevision(
  db: D1Database,
  siteId: string,
  layoutId: number
): Promise<ParsedRevision<LayoutRevisionData> | null> {
  return getCurrentRevision<LayoutRevisionData>(db, siteId, 'layout', String(layoutId));
}

/**
 * Create a new revision for a layout
 */
export async function createLayoutRevision(
  db: D1Database,
  siteId: string,
  layoutId: number,
  data: LayoutRevisionData,
  options?: {
    userId?: string;
    message?: string;
    parentRevisionId?: string;
  }
): Promise<ParsedRevision<LayoutRevisionData>> {
  return createRevision<LayoutRevisionData>(db, siteId, {
    entity_type: 'layout',
    entity_id: String(layoutId),
    data,
    user_id: options?.userId,
    message: options?.message,
    parent_revision_id: options?.parentRevisionId
  });
}

/**
 * Publish a layout revision (make it the current/live version)
 */
export async function publishLayoutRevision(
  db: D1Database,
  siteId: string,
  layoutId: number,
  revisionId: string
): Promise<void> {
  await setCurrentRevision(db, siteId, 'layout', String(layoutId), revisionId);
}

/**
 * Create an initial revision for a layout and mark it as published
 * This is used when loading a layout to establish its initial state
 */
export async function createInitialLayoutRevision(
  db: D1Database,
  siteId: string,
  layoutId: number,
  data: LayoutRevisionData,
  options?: {
    userId?: string;
    message?: string;
  }
): Promise<ParsedRevision<LayoutRevisionData>> {
  // Create the revision
  const revision = await createLayoutRevision(db, siteId, layoutId, data, {
    userId: options?.userId,
    message: options?.message || 'Initial layout configuration'
  });

  // Mark it as the current (published) revision
  await publishLayoutRevision(db, siteId, layoutId, revision.id);

  return {
    ...revision,
    is_current: true
  };
}

/**
 * Build revision tree for a layout (for visualization)
 */
export async function buildLayoutRevisionTree(
  db: D1Database,
  siteId: string,
  layoutId: number
): Promise<RevisionNode<LayoutRevisionData>[]> {
  return buildRevisionTree<LayoutRevisionData>(db, siteId, 'layout', String(layoutId));
}

/**
 * Reset a layout to its original default revision
 * This restores the layout to its first published state
 */
export async function resetLayoutToOriginal(
  db: D1Database,
  siteId: string,
  layoutId: number
): Promise<LayoutRevisionData | null> {
  // Get the original (first) revision
  const originalRevision = await getOriginalLayoutRevision(db, siteId, layoutId);

  if (!originalRevision) {
    return null;
  }

  // Apply the original revision data to the layout
  await db
    .prepare(
      `
      UPDATE layouts 
      SET name = ?, description = ?, slug = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `
    )
    .bind(
      originalRevision.data.name,
      originalRevision.data.description || null,
      originalRevision.data.slug,
      originalRevision.data.is_default ? 1 : 0,
      layoutId
    )
    .run();

  // Delete all current layout widgets
  await db.prepare('DELETE FROM layout_widgets WHERE layout_id = ?').bind(layoutId).run();

  // Restore widgets from the original revision
  for (const widget of originalRevision.data.widgets) {
    await db
      .prepare(
        `
        INSERT INTO layout_widgets (id, layout_id, type, position, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      )
      .bind(widget.id, layoutId, widget.type, widget.position, JSON.stringify(widget.config))
      .run();
  }

  // Mark the original revision as current
  await publishLayoutRevision(db, siteId, layoutId, originalRevision.id);

  return originalRevision.data;
}

/**
 * Convert layout and widgets to revision data format
 */
export function layoutToRevisionData(
  layout: {
    name: string;
    description?: string;
    slug: string;
    is_default: boolean;
  },
  widgets: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown> | string;
  }>
): LayoutRevisionData {
  return {
    name: layout.name,
    description: layout.description,
    slug: layout.slug,
    is_default: layout.is_default,
    widgets: widgets.map((w) => ({
      id: w.id,
      type: w.type,
      position: w.position,
      config: typeof w.config === 'string' ? JSON.parse(w.config) : w.config
    }))
  };
}

/**
 * Convert revision data back to layout and widgets format
 */
export function revisionDataToLayout(data: LayoutRevisionData): {
  layout: {
    name: string;
    description?: string;
    slug: string;
    is_default: boolean;
  };
  widgets: LayoutWidgetData[];
} {
  return {
    layout: {
      name: data.name,
      description: data.description,
      slug: data.slug,
      is_default: data.is_default
    },
    widgets: data.widgets
  };
}

/**
 * Ensure a layout has at least one revision (creates initial if none exist)
 */
export async function ensureLayoutHasRevision(
  db: D1Database,
  siteId: string,
  layoutId: number,
  layout: {
    name: string;
    description?: string;
    slug: string;
    is_default: boolean;
  },
  widgets: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown> | string;
  }>,
  userId?: string
): Promise<ParsedRevision<LayoutRevisionData>> {
  // Check if any revisions exist
  const existingRevisions = await getLayoutRevisions(db, siteId, layoutId);

  if (existingRevisions.length > 0) {
    // Return the current revision or the most recent one
    const current = existingRevisions.find((r) => r.is_current);
    return current || existingRevisions[0];
  }

  // Create initial revision
  const revisionData = layoutToRevisionData(layout, widgets);
  return createInitialLayoutRevision(db, siteId, layoutId, revisionData, {
    userId,
    message: 'Initial layout configuration'
  });
}
