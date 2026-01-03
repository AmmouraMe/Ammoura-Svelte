/**
 * Generic revision service for tracking changes across multiple entity types
 * This is a reusable, type-safe service for managing revisions of any entity (pages, products, etc.)
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import { generateRevisionHash } from '$lib/utils/revisionHash';
import type {
  Revision,
  ParsedRevision,
  CreateRevisionInput,
  GetRevisionsOptions,
  RevisionNode,
  EntityType
} from '$lib/types/revisions';

/**
 * Create a new revision for an entity
 */
export async function createRevision<T = unknown>(
  db: D1Database,
  siteId: string,
  input: CreateRevisionInput<T>
): Promise<ParsedRevision<T>> {
  // Verify entity context (we don't validate existence here, that's the caller's responsibility)
  // Get all existing revision hashes to ensure uniqueness
  const existingRevisions = await db
    .prepare('SELECT revision_hash FROM revisions WHERE entity_type = ? AND entity_id = ?')
    .bind(input.entity_type, input.entity_id)
    .all<{ revision_hash: string }>();

  const existingHashes = existingRevisions.results?.map((r) => r.revision_hash) || [];

  // Generate unique revision hash
  let revisionHash = generateRevisionHash();
  while (existingHashes.includes(revisionHash)) {
    revisionHash = generateRevisionHash();
  }

  const revisionId = nanoid();
  const now = Math.floor(Date.now() / 1000);
  const dataJson = JSON.stringify(input.data);

  await db
    .prepare(
      `
      INSERT INTO revisions (
        id, site_id, entity_type, entity_id, revision_hash, parent_revision_id,
        data, user_id, created_at, is_current, message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      revisionId,
      siteId,
      input.entity_type,
      input.entity_id,
      revisionHash,
      input.parent_revision_id || null,
      dataJson,
      input.user_id || null,
      now,
      0, // New revisions are not current by default
      input.message || null
    )
    .run();

  return {
    id: revisionId,
    site_id: siteId,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    revision_hash: revisionHash,
    parent_revision_id: input.parent_revision_id,
    data: input.data,
    user_id: input.user_id,
    created_at: now,
    is_current: false,
    message: input.message
  };
}

/**
 * Get all revisions for an entity, ordered by creation date (newest first)
 */
export async function getRevisions<T = unknown>(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string,
  options: GetRevisionsOptions = {}
): Promise<ParsedRevision<T>[]> {
  let query = `
    SELECT * FROM revisions
    WHERE site_id = ? AND entity_type = ? AND entity_id = ?
  `;

  const params: unknown[] = [siteId, entityType, entityId];

  if (options.include_current_only) {
    query += ' AND is_current = 1';
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit !== undefined) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset !== undefined) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<Revision>();

  return (result.results || []).map((rev) => ({
    ...rev,
    data: JSON.parse(rev.data) as T
  }));
}

/**
 * Get a specific revision by ID
 */
export async function getRevisionById<T = unknown>(
  db: D1Database,
  siteId: string,
  revisionId: string
): Promise<ParsedRevision<T> | null> {
  const result = await db
    .prepare('SELECT * FROM revisions WHERE id = ? AND site_id = ?')
    .bind(revisionId, siteId)
    .first<Revision>();

  if (!result) return null;

  return {
    ...result,
    data: JSON.parse(result.data) as T
  };
}

/**
 * Get a specific revision by hash
 */
export async function getRevisionByHash<T = unknown>(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string,
  revisionHash: string
): Promise<ParsedRevision<T> | null> {
  const result = await db
    .prepare(
      'SELECT * FROM revisions WHERE site_id = ? AND entity_type = ? AND entity_id = ? AND revision_hash = ?'
    )
    .bind(siteId, entityType, entityId, revisionHash)
    .first<Revision>();

  if (!result) return null;

  return {
    ...result,
    data: JSON.parse(result.data) as T
  };
}

/**
 * Get the current (live) revision for an entity
 */
export async function getCurrentRevision<T = unknown>(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string
): Promise<ParsedRevision<T> | null> {
  const result = await db
    .prepare(
      `
      SELECT * FROM revisions
      WHERE site_id = ? AND entity_type = ? AND entity_id = ? AND is_current = 1
      ORDER BY created_at DESC
      LIMIT 1
    `
    )
    .bind(siteId, entityType, entityId)
    .first<Revision>();

  if (!result) return null;

  return {
    ...result,
    data: JSON.parse(result.data) as T
  };
}

/**
 * Mark a revision as current (and unmark all others for the same entity)
 * This is used when publishing/restoring a revision
 */
export async function setCurrentRevision(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string,
  revisionId: string
): Promise<void> {
  const batch = [
    // Unmark all other revisions
    db
      .prepare(
        'UPDATE revisions SET is_current = 0 WHERE site_id = ? AND entity_type = ? AND entity_id = ?'
      )
      .bind(siteId, entityType, entityId),

    // Mark the specified revision as current
    db.prepare('UPDATE revisions SET is_current = 1 WHERE id = ?').bind(revisionId)
  ];

  await db.batch(batch);
}

/**
 * Restore a revision - creates a new revision with the old content at the head
 * This is like "git revert" - we're applying an old commit to the current head
 */
export async function restoreRevision<T = unknown>(
  db: D1Database,
  siteId: string,
  revisionId: string,
  userId?: string
): Promise<ParsedRevision<T>> {
  // Get the revision to restore
  const revisionToRestore = await getRevisionById<T>(db, siteId, revisionId);
  if (!revisionToRestore) {
    throw new Error('Revision not found');
  }

  // Get the currently published revision (if any) to use as parent
  const currentRevision = await getCurrentRevision<T>(
    db,
    siteId,
    revisionToRestore.entity_type,
    revisionToRestore.entity_id
  );

  // Create a new revision at the head with the content from the old revision
  const newRevision = await createRevision<T>(db, siteId, {
    entity_type: revisionToRestore.entity_type,
    entity_id: revisionToRestore.entity_id,
    data: revisionToRestore.data,
    message: `Restored from revision ${revisionToRestore.revision_hash}`,
    user_id: userId,
    parent_revision_id: currentRevision?.id || revisionToRestore.id
  });

  // Mark the new revision as current
  await setCurrentRevision(
    db,
    siteId,
    revisionToRestore.entity_type,
    revisionToRestore.entity_id,
    newRevision.id
  );

  return newRevision;
}

/**
 * Build a revision tree structure for visualization
 * Returns an array of revision nodes with parent-child relationships
 */
export async function buildRevisionTree<T = unknown>(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string
): Promise<RevisionNode<T>[]> {
  // Get all revisions for the entity
  const revisions = await getRevisions<T>(db, siteId, entityType, entityId);

  if (revisions.length === 0) {
    return [];
  }

  // Create a map of revision ID to node
  const nodeMap = new Map<string, RevisionNode<T>>();

  // Initialize all nodes
  revisions.forEach((revision) => {
    nodeMap.set(revision.id, {
      ...revision,
      children: [],
      depth: 0,
      branch: 0
    });
  });

  // Build parent-child relationships
  const rootNodes: RevisionNode<T>[] = [];
  const parentlessRevisions: ParsedRevision<T>[] = [];

  revisions.forEach((revision) => {
    const node = nodeMap.get(revision.id)!;

    if (revision.parent_revision_id) {
      const parent = nodeMap.get(revision.parent_revision_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as parentless
        parentlessRevisions.push(revision);
      }
    } else {
      // No parent - collect for chaining
      parentlessRevisions.push(revision);
    }
  });

  // Chain all parentless revisions chronologically into a single vertical line
  // This ensures proper vertical layout (root at top, descendants below)
  if (parentlessRevisions.length > 0) {
    // Sort by creation time (oldest first)
    parentlessRevisions.sort((a, b) => a.created_at - b.created_at);

    // First parentless becomes the root, rest become a vertical chain
    for (let i = 0; i < parentlessRevisions.length; i++) {
      const node = nodeMap.get(parentlessRevisions[i].id)!;
      if (i === 0) {
        // Oldest parentless revision is the root
        rootNodes.push(node);
      } else {
        // Chain to the previous parentless revision
        const prevNode = nodeMap.get(parentlessRevisions[i - 1].id)!;
        prevNode.children.push(node);
      }
    }
  }

  // Calculate depths and branches using BFS
  let currentBranch = 0;
  const queue: Array<{ node: RevisionNode<T>; depth: number; branch: number }> = [];

  // Sort root nodes by creation time (oldest first)
  rootNodes.sort((a, b) => a.created_at - b.created_at);

  rootNodes.forEach((root) => {
    queue.push({ node: root, depth: 0, branch: currentBranch });
    currentBranch++;
  });

  const result: RevisionNode<T>[] = [];

  while (queue.length > 0) {
    const { node, depth, branch } = queue.shift()!;
    node.depth = depth;
    node.branch = branch;
    result.push(node);

    // Sort children by creation time
    node.children.sort((a, b) => a.created_at - b.created_at);

    // First child continues on the same branch
    if (node.children.length > 0) {
      queue.push({
        node: node.children[0],
        depth: depth + 1,
        branch: branch
      });

      // Additional children create new branches
      for (let i = 1; i < node.children.length; i++) {
        queue.push({
          node: node.children[i],
          depth: depth + 1,
          branch: currentBranch++
        });
      }
    }
  }

  // Sort result by depth (root first), then by creation time (oldest first within a level)
  // This matches the graph layout where root is at top and time flows downward
  result.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.created_at - b.created_at;
  });

  return result;
}

/**
 * Get the head revisions (revisions without children)
 * These represent the current tips of each branch
 */
export async function getHeadRevisions<T = unknown>(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string
): Promise<ParsedRevision<T>[]> {
  const allRevisions = await getRevisions<T>(db, siteId, entityType, entityId);
  const childIds = new Set(
    allRevisions.filter((r) => r.parent_revision_id).map((r) => r.parent_revision_id)
  );

  // Head revisions are those that are not parents of any other revision
  return allRevisions.filter((r) => !childIds.has(r.id));
}

/**
 * Delete old revisions (for cleanup/pruning)
 * This is useful for maintaining database size
 */
export async function deleteOldRevisions(
  db: D1Database,
  siteId: string,
  entityType: EntityType,
  entityId: string,
  olderThanSeconds: number
): Promise<number> {
  const cutoffTime = Math.floor(Date.now() / 1000) - olderThanSeconds;

  const result = await db
    .prepare(
      `
      DELETE FROM revisions
      WHERE site_id = ? AND entity_type = ? AND entity_id = ?
        AND created_at < ? AND is_current = 0
    `
    )
    .bind(siteId, entityType, entityId, cutoffTime)
    .run();

  return result.meta?.changes || 0;
}
