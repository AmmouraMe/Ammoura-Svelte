/**
 * Database functions for page revisions
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  PageRevision,
  ParsedPageRevision,
  PageComponent,
  PageProperties,
  CreateRevisionData,
  RevisionNode
} from '$lib/types/pages';
import { nanoid } from 'nanoid';
import { generateRevisionHash } from '$lib/utils/revisionHash';

/**
 * Get all revisions for a page, ordered by creation date (newest first)
 */
export async function getPageRevisions(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<ParsedPageRevision[]> {
  const result = await db
    .prepare(
      `
      SELECT pr.* 
      FROM page_revisions pr
      INNER JOIN pages p ON pr.page_id = p.id
      WHERE p.site_id = ? AND pr.page_id = ?
      ORDER BY pr.created_at DESC
    `
    )
    .bind(siteId, pageId)
    .all<PageRevision>();

  return (result.results || []).map((rev) => ({
    ...rev,
    components: JSON.parse(rev.widgets_snapshot) as PageComponent[],
    pageProperties: rev.page_properties
      ? (JSON.parse(rev.page_properties) as PageProperties)
      : undefined
  }));
}

/**
 * Get a specific revision by ID
 */
export async function getRevisionById(
  db: D1Database,
  siteId: string,
  pageId: string,
  revisionId: string
): Promise<ParsedPageRevision | null> {
  const result = await db
    .prepare(
      `
      SELECT pr.* 
      FROM page_revisions pr
      INNER JOIN pages p ON pr.page_id = p.id
      WHERE p.site_id = ? AND pr.page_id = ? AND pr.id = ?
    `
    )
    .bind(siteId, pageId, revisionId)
    .first<PageRevision>();

  if (!result) return null;

  return {
    ...result,
    components: JSON.parse(result.widgets_snapshot) as PageComponent[],
    pageProperties: result.page_properties
      ? (JSON.parse(result.page_properties) as PageProperties)
      : undefined
  };
}

/**
 * Create a new revision for a page
 */
export async function createRevision(
  db: D1Database,
  siteId: string,
  pageId: string,
  data: CreateRevisionData & { created_by?: string; parent_revision_id?: string | null }
): Promise<ParsedPageRevision> {
  // Verify page exists and belongs to site
  const page = await db
    .prepare('SELECT id FROM pages WHERE id = ? AND site_id = ?')
    .bind(pageId, siteId)
    .first();

  if (!page) {
    throw new Error('Page not found');
  }

  // Get all existing revision hashes for this page to ensure uniqueness
  const existingRevisions = await db
    .prepare('SELECT revision_hash FROM page_revisions WHERE page_id = ?')
    .bind(pageId)
    .all<{ revision_hash: string }>();

  const existingHashes = existingRevisions.results?.map((r) => r.revision_hash) || [];

  // Generate unique revision hash
  let revisionHash = generateRevisionHash();
  while (existingHashes.includes(revisionHash)) {
    revisionHash = generateRevisionHash();
  }

  const revisionId = nanoid();
  const now = Math.floor(Date.now() / 1000);
  const componentsSnapshot = JSON.stringify(data.components);
  const pagePropertiesJson = data.pageProperties ? JSON.stringify(data.pageProperties) : null;

  await db
    .prepare(
      `
      INSERT INTO page_revisions (
        id, page_id, revision_hash, parent_revision_id, title, slug, status, color_theme,
        widgets_snapshot, page_properties, created_by, created_at, is_published, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      revisionId,
      pageId,
      revisionHash,
      data.parent_revision_id || null,
      data.title,
      data.slug,
      data.status,
      data.colorTheme || null,
      componentsSnapshot,
      pagePropertiesJson,
      data.created_by || null,
      now,
      data.status === 'published' ? 1 : 0,
      data.notes || null
    )
    .run();

  // Update the page's draft_revision_id when creating a draft revision
  // This is used by the admin pages list to show draft status
  if (data.status === 'draft') {
    await db
      .prepare('UPDATE pages SET draft_revision_id = ? WHERE id = ?')
      .bind(revisionId, pageId)
      .run();
  }

  return {
    id: revisionId,
    page_id: pageId,
    revision_hash: revisionHash,
    parent_revision_id: data.parent_revision_id ?? undefined,
    title: data.title,
    slug: data.slug,
    status: data.status,
    color_theme: data.colorTheme || undefined,
    components: data.components,
    pageProperties: data.pageProperties,
    created_by: data.created_by,
    created_at: now,
    is_published: data.status === 'published',
    notes: data.notes
  };
}

/**
 * Publish a revision - creates a new revision at the head with the old revision as parent
 * This is like "git cherry-pick" - we're applying an old commit to the current head
 */
export async function publishRevision(
  db: D1Database,
  siteId: string,
  pageId: string,
  revisionId: string,
  createdBy?: string
): Promise<ParsedPageRevision> {
  // Get the revision to publish
  const revisionToPublish = await getRevisionById(db, siteId, pageId, revisionId);
  if (!revisionToPublish) {
    throw new Error('Revision not found');
  }

  // Get the currently published revision (if any) to use as parent
  const currentPublished = await getPublishedRevision(db, siteId, pageId);

  // Create a new revision at the head with the content from the old revision
  // This preserves the history graph
  const newRevision = await createRevision(db, siteId, pageId, {
    title: revisionToPublish.title,
    slug: revisionToPublish.slug,
    status: 'published',
    colorTheme: revisionToPublish.color_theme,
    components: revisionToPublish.components,
    pageProperties: revisionToPublish.pageProperties,
    notes: `Published from revision ${revisionToPublish.revision_hash}`,
    created_by: createdBy,
    parent_revision_id: currentPublished?.id || revisionToPublish.id
  });

  // Update page FIRST, outside the batch, to ensure it runs
  await db
    .prepare(
      `
      UPDATE pages 
      SET title = ?, slug = ?, status = ?, color_theme = ?, published_revision_id = ?, draft_revision_id = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .bind(
      newRevision.title,
      newRevision.slug,
      'published',
      newRevision.color_theme || null,
      newRevision.id,
      newRevision.id,
      Math.floor(Date.now() / 1000),
      pageId
    )
    .run();

  // Start a batch of operations for revisions and widgets
  const batch = [
    // Unmark all other revisions as published
    db.prepare('UPDATE page_revisions SET is_published = 0 WHERE page_id = ?').bind(pageId),

    // Mark the new revision as published
    db
      .prepare('UPDATE page_revisions SET is_published = 1, status = ? WHERE id = ?')
      .bind('published', newRevision.id)
  ];

  // Delete all current components for the page
  batch.push(db.prepare('DELETE FROM page_widgets WHERE page_id = ?').bind(pageId));

  // Insert components from the new revision
  for (const component of newRevision.components) {
    const componentId = component.id.startsWith('temp-') ? nanoid() : component.id;
    batch.push(
      db
        .prepare(
          `
          INSERT INTO page_widgets (id, page_id, type, config, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          componentId,
          pageId,
          component.type,
          JSON.stringify(component.config),
          component.position,
          component.created_at || Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000)
        )
    );
  }

  console.log('[publishRevision] Executing batch with:', {
    pageId,
    newRevisionId: newRevision.id,
    batchOperationsCount: batch.length
  });

  const batchResults = await db.batch(batch);

  console.log('[publishRevision] Batch results:', {
    resultsCount: batchResults.length,
    results: batchResults.map((r, i) => ({
      index: i,
      success: r.success,
      changes: r.meta?.changes
    }))
  });

  return newRevision;
}

/**
 * Mark an existing revision as published without creating a new revision.
 * This updates the page, marks the revision as published, and syncs page_widgets.
 * Use this when creating a revision with status='published' directly from the builder.
 */
export async function markRevisionAsPublished(
  db: D1Database,
  pageId: string,
  revisionId: string,
  revisionData: {
    title: string;
    slug: string;
    colorTheme?: string;
    components: PageComponent[];
  }
): Promise<void> {
  // Update page with the new published revision
  await db
    .prepare(
      `
      UPDATE pages 
      SET title = ?, slug = ?, status = ?, color_theme = ?, published_revision_id = ?, draft_revision_id = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .bind(
      revisionData.title,
      revisionData.slug,
      'published',
      revisionData.colorTheme || null,
      revisionId,
      revisionId, // Set draft to same as published since we just published
      Math.floor(Date.now() / 1000),
      pageId
    )
    .run();

  // Start a batch of operations
  const batch = [
    // Unmark all other revisions as published
    db.prepare('UPDATE page_revisions SET is_published = 0 WHERE page_id = ?').bind(pageId),

    // Mark this revision as published
    db
      .prepare('UPDATE page_revisions SET is_published = 1, status = ? WHERE id = ?')
      .bind('published', revisionId)
  ];

  // Delete all current components for the page
  batch.push(db.prepare('DELETE FROM page_widgets WHERE page_id = ?').bind(pageId));

  // Insert components from the revision
  for (const component of revisionData.components) {
    const componentId = component.id.startsWith('temp-') ? nanoid() : component.id;
    batch.push(
      db
        .prepare(
          `
          INSERT INTO page_widgets (id, page_id, type, config, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          componentId,
          pageId,
          component.type,
          JSON.stringify(component.config),
          component.position,
          component.created_at || Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000)
        )
    );
  }

  await db.batch(batch);
}

/**
 * Get the currently published revision for a page
 */
export async function getPublishedRevision(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<ParsedPageRevision | null> {
  const result = await db
    .prepare(
      `
      SELECT pr.* 
      FROM page_revisions pr
      INNER JOIN pages p ON pr.page_id = p.id
      WHERE p.site_id = ? AND pr.page_id = ? AND pr.is_published = 1
      ORDER BY pr.created_at DESC
      LIMIT 1
    `
    )
    .bind(siteId, pageId)
    .first<PageRevision>();

  if (!result) return null;

  return {
    ...result,
    components: JSON.parse(result.widgets_snapshot) as PageComponent[],
    pageProperties: result.page_properties
      ? (JSON.parse(result.page_properties) as PageProperties)
      : undefined
  };
}

/**
 * Get the most recent draft revision for a page
 */
export async function getMostRecentDraftRevision(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<ParsedPageRevision | null> {
  const result = await db
    .prepare(
      `
      SELECT pr.* 
      FROM page_revisions pr
      INNER JOIN pages p ON pr.page_id = p.id
      WHERE p.site_id = ? AND pr.page_id = ? AND pr.status = 'draft'
      ORDER BY pr.created_at DESC
      LIMIT 1
    `
    )
    .bind(siteId, pageId)
    .first<PageRevision>();

  if (!result) return null;

  return {
    ...result,
    components: JSON.parse(result.widgets_snapshot) as PageComponent[],
    pageProperties: result.page_properties
      ? (JSON.parse(result.page_properties) as PageProperties)
      : undefined
  };
}

/**
 * Build a revision tree structure for visualization
 * Returns an array of revision nodes with parent-child relationships
 */
export async function buildRevisionTree(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<RevisionNode[]> {
  // Get all revisions for the page
  const revisions = await getPageRevisions(db, siteId, pageId);

  if (revisions.length === 0) {
    return [];
  }

  // Create a map of revision ID to node
  const nodeMap = new Map<string, RevisionNode>();

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
  const rootNodes: RevisionNode[] = [];
  const parentlessRevisions: ParsedPageRevision[] = [];

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
  const queue: Array<{ node: RevisionNode; depth: number; branch: number }> = [];

  // Sort root nodes by creation time (oldest first)
  rootNodes.sort((a, b) => a.created_at - b.created_at);

  rootNodes.forEach((root) => {
    queue.push({ node: root, depth: 0, branch: currentBranch });
    currentBranch++;
  });

  const result: RevisionNode[] = [];
  const processedNodes = new Set<string>();

  while (queue.length > 0) {
    const { node, depth, branch } = queue.shift()!;
    node.depth = depth;
    node.branch = branch;
    result.push(node);
    processedNodes.add(node.id);

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
export async function getHeadRevisions(
  db: D1Database,
  siteId: string,
  pageId: string
): Promise<ParsedPageRevision[]> {
  const allRevisions = await getPageRevisions(db, siteId, pageId);
  const childIds = new Set(
    allRevisions.filter((r) => r.parent_revision_id).map((r) => r.parent_revision_id)
  );

  // Head revisions are those that are not parents of any other revision
  return allRevisions.filter((r) => !childIds.has(r.id));
}

/**
 * Ensure a page has at least one initial revision
 * If no revisions exist, creates an initial revision with the current page state
 */
export async function ensureInitialRevision(
  db: D1Database,
  siteId: string,
  pageId: string,
  page: {
    title: string;
    slug: string;
    status: 'draft' | 'published';
    colorTheme?: string;
  },
  components: PageComponent[]
): Promise<RevisionNode[]> {
  // Check if revisions already exist
  const existingRevisions = await getPageRevisions(db, siteId, pageId);

  if (existingRevisions.length > 0) {
    // Revisions exist, return the tree
    return buildRevisionTree(db, siteId, pageId);
  }

  // No revisions exist, create the initial revision
  const initialRevision = await createRevision(db, siteId, pageId, {
    title: page.title,
    slug: page.slug,
    status: page.status,
    colorTheme: page.colorTheme,
    components,
    notes: 'Initial revision'
  });

  // If the page was published, mark this revision as published
  if (page.status === 'published') {
    await db
      .prepare('UPDATE page_revisions SET is_published = 1 WHERE id = ?')
      .bind(initialRevision.id)
      .run();

    // Also update the page's published_revision_id
    await db
      .prepare('UPDATE pages SET published_revision_id = ? WHERE id = ?')
      .bind(initialRevision.id, pageId)
      .run();
  }

  return buildRevisionTree(db, siteId, pageId);
}
