import { describe, it, expect } from 'vitest';
import type { RevisionNode } from '$lib/types/pages';

// Tree layout algorithm utilities that will be used by the component
export function calculateTreeLayout(
  revisions: RevisionNode[],
  nodeWidth: number = 30,
  levelHeight: number = 80
): TreeNode[] {
  if (revisions.length === 0) return [];

  // Build a map for quick lookup
  const revMap = new Map<string, RevisionNode>();
  revisions.forEach((rev) => revMap.set(rev.id, rev));

  // Group by depth for level-based layout
  const depthMap = new Map<number, RevisionNode[]>();
  let maxDepth = 0;

  revisions.forEach((rev) => {
    const depth = rev.depth || 0;
    maxDepth = Math.max(maxDepth, depth);

    if (!depthMap.has(depth)) {
      depthMap.set(depth, []);
    }
    depthMap.get(depth)!.push(rev);
  });

  // Assign lanes to revisions
  // Lane assignment: revisions that are in the same branch stay in the same lane
  // When a branch splits, the new branch gets a new lane
  const laneLookup = new Map<string, number>();
  const usedLanes = new Set<number>();
  let nextAvailableLane = 0;

  // Process revisions level by level (depth-first)
  for (let depth = 0; depth <= maxDepth; depth++) {
    const revsAtDepth = depthMap.get(depth) || [];

    // Sort by branch number, then by creation time
    revsAtDepth.sort((a, b) => {
      const branchA = a.branch || 0;
      const branchB = b.branch || 0;
      if (branchA !== branchB) return branchA - branchB;
      return a.created_at - b.created_at;
    });

    revsAtDepth.forEach((rev) => {
      const branch = rev.branch || 0;
      const parentId = rev.parent_revision_id;

      if (!parentId) {
        // Root revision - assign to lane 0
        laneLookup.set(rev.id, 0);
        usedLanes.add(0);
        nextAvailableLane = 1;
      } else {
        // Has a parent - check if parent's lane is available
        const parentLane = laneLookup.get(parentId);

        if (parentLane !== undefined) {
          // Check if this is continuing the same branch as parent
          const parent = revMap.get(parentId);
          if (parent && parent.branch === branch) {
            // Continue in parent's lane
            laneLookup.set(rev.id, parentLane);
          } else {
            // New branch - get a new lane
            laneLookup.set(rev.id, nextAvailableLane);
            usedLanes.add(nextAvailableLane);
            nextAvailableLane++;
          }
        } else {
          // Parent lane not found - assign next available
          laneLookup.set(rev.id, nextAvailableLane);
          usedLanes.add(nextAvailableLane);
          nextAvailableLane++;
        }
      }
    });
  }

  // Build tree nodes with positions
  const treeNodes: TreeNode[] = [];
  const laneWidth = nodeWidth + 20; // Space between lanes
  const startY = 20;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const revsAtDepth = depthMap.get(depth) || [];

    revsAtDepth.forEach((rev) => {
      const lane = laneLookup.get(rev.id) || 0;
      const x = 30 + lane * laneWidth;
      const y = startY + depth * levelHeight;

      treeNodes.push({
        revision: rev,
        level: depth,
        lane,
        x,
        y
      });
    });
  }

  return treeNodes;
}

export interface TreeNode {
  revision: RevisionNode;
  level: number;
  lane: number; // Which vertical lane (column) the node occupies
  x: number;
  y: number;
}

export interface Connection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  controlX1?: number;
  controlY1?: number;
  controlX2?: number;
  controlY2?: number;
  color: string;
  fromLane: number;
  toLane: number;
}

describe('RevisionHistoryGraph - Tree Layout', () => {
  describe('calculateTreeLayout', () => {
    it('should position a single root revision', () => {
      const revisions: RevisionNode[] = [
        {
          id: 'rev-1',
          page_id: 'page-1',
          revision_hash: 'abc123',
          parent_revision_id: undefined,
          title: 'Initial',
          slug: 'test',
          status: 'published',
          created_at: 1000,
          is_published: true,
          color_theme: '',
          components: [],
          children: [],
          depth: 0,
          branch: 0
        }
      ];

      const nodes = calculateTreeLayout(revisions);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].level).toBe(0);
      expect(nodes[0].lane).toBe(0);
      expect(nodes[0].y).toBe(20); // Starting y position
    });

    it('should position a linear chain of revisions in the same lane', () => {
      const revisions: RevisionNode[] = [
        {
          id: 'rev-1',
          page_id: 'page-1',
          revision_hash: 'abc123',
          parent_revision_id: undefined,
          title: 'Initial',
          slug: 'test',
          status: 'published',
          created_at: 1000,
          is_published: true,
          color_theme: '',
          components: [],
          children: [],
          depth: 0,
          branch: 0
        },
        {
          id: 'rev-2',
          page_id: 'page-1',
          revision_hash: 'def456',
          parent_revision_id: 'rev-1',
          title: 'Update 1',
          slug: 'test',
          status: 'draft',
          created_at: 2000,
          is_published: false,
          color_theme: '',
          components: [],
          children: [],
          depth: 1,
          branch: 0
        },
        {
          id: 'rev-3',
          page_id: 'page-1',
          revision_hash: 'ghi789',
          parent_revision_id: 'rev-2',
          title: 'Update 2',
          slug: 'test',
          status: 'draft',
          created_at: 3000,
          is_published: false,
          color_theme: '',
          components: [],
          children: [],
          depth: 2,
          branch: 0
        }
      ];

      const nodes = calculateTreeLayout(revisions);

      expect(nodes).toHaveLength(3);
      // All should be in the same lane
      expect(nodes[0].lane).toBe(0);
      expect(nodes[1].lane).toBe(0);
      expect(nodes[2].lane).toBe(0);
      // Y positions should increase
      expect(nodes[0].y).toBeLessThan(nodes[1].y);
      expect(nodes[1].y).toBeLessThan(nodes[2].y);
    });

    it('should position branching revisions in different lanes', () => {
      const revisions: RevisionNode[] = [
        {
          id: 'rev-1',
          page_id: 'page-1',
          revision_hash: 'abc123',
          parent_revision_id: undefined,
          title: 'Initial',
          slug: 'test',
          status: 'published',
          created_at: 1000,
          is_published: true,
          color_theme: '',
          components: [],
          children: [],
          depth: 0,
          branch: 0
        },
        {
          id: 'rev-2',
          page_id: 'page-1',
          revision_hash: 'def456',
          parent_revision_id: 'rev-1',
          title: 'Main branch',
          slug: 'test',
          status: 'draft',
          created_at: 2000,
          is_published: false,
          color_theme: '',
          components: [],
          children: [],
          depth: 1,
          branch: 0
        },
        {
          id: 'rev-3',
          page_id: 'page-1',
          revision_hash: 'ghi789',
          parent_revision_id: 'rev-1',
          title: 'Branch A',
          slug: 'test',
          status: 'draft',
          created_at: 2500,
          is_published: false,
          color_theme: '',
          components: [],
          children: [],
          depth: 1,
          branch: 1
        }
      ];

      const nodes = calculateTreeLayout(revisions);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].lane).toBe(0); // Root
      expect(nodes[1].lane).toBe(0); // Main branch continues in same lane
      expect(nodes[2].lane).toBe(1); // Branch A in new lane
      // Both children should be at the same depth
      expect(nodes[1].y).toBe(nodes[2].y);
    });
  });
});
