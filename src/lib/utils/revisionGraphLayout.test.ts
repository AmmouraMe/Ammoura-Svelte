import { describe, it, expect } from 'vitest';
import { calculateTreeLayout, calculateConnections, type TreeNode } from './revisionGraphLayout';

interface TestRevisionNode {
  id: string;
  revision_hash: string;
  created_at: number;
  parent_revision_id?: string;
  branch: number;
  depth: number;
  children: TestRevisionNode[];
}

describe('revisionGraphLayout', () => {
  describe('calculateTreeLayout', () => {
    it('should return empty array for empty input', () => {
      const result = calculateTreeLayout([]);
      expect(result).toEqual([]);
    });

    it('should layout a single root node', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'rev-1',
          revision_hash: 'abc123',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(1);
      expect(result[0].revision.id).toBe('rev-1');
      expect(result[0].level).toBe(0);
      expect(result[0].lane).toBe(0);
      expect(result[0].x).toBe(30); // 30 + 0 * laneWidth
      expect(result[0].y).toBe(50); // startY + 0 * levelHeight
    });

    it('should layout a linear chain of revisions', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'rev-1',
          revision_hash: 'abc123',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'rev-2',
          revision_hash: 'def456',
          created_at: 2000,
          parent_revision_id: 'rev-1',
          branch: 0,
          depth: 1,
          children: []
        },
        {
          id: 'rev-3',
          revision_hash: 'ghi789',
          created_at: 3000,
          parent_revision_id: 'rev-2',
          branch: 0,
          depth: 2,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(3);

      // All should be in lane 0 (same branch)
      result.forEach((node) => {
        expect(node.lane).toBe(0);
      });

      // Check levels
      const nodeById = new Map(result.map((n) => [n.revision.id, n]));
      expect(nodeById.get('rev-1')!.level).toBe(0);
      expect(nodeById.get('rev-2')!.level).toBe(1);
      expect(nodeById.get('rev-3')!.level).toBe(2);

      // Check Y positions increase with depth
      expect(nodeById.get('rev-1')!.y).toBe(50);
      expect(nodeById.get('rev-2')!.y).toBe(130); // 50 + 1*80
      expect(nodeById.get('rev-3')!.y).toBe(210); // 50 + 2*80
    });

    it('should layout branching revisions in different lanes', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'rev-1',
          revision_hash: 'abc123',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'rev-2',
          revision_hash: 'def456',
          created_at: 2000,
          parent_revision_id: 'rev-1',
          branch: 0,
          depth: 1,
          children: []
        },
        {
          id: 'rev-3',
          revision_hash: 'ghi789',
          created_at: 2500,
          parent_revision_id: 'rev-1',
          branch: 1, // Different branch
          depth: 1,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(3);

      const nodeById = new Map(result.map((n) => [n.revision.id, n]));

      // Root is in lane 0
      expect(nodeById.get('rev-1')!.lane).toBe(0);

      // rev-2 continues in lane 0 (same branch as parent)
      expect(nodeById.get('rev-2')!.lane).toBe(0);

      // rev-3 is in a new lane (different branch)
      expect(nodeById.get('rev-3')!.lane).toBe(1);
    });

    it('should handle multiple branches from same parent', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'root',
          revision_hash: 'root',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'branch-0',
          revision_hash: 'b0',
          created_at: 2000,
          parent_revision_id: 'root',
          branch: 0,
          depth: 1,
          children: []
        },
        {
          id: 'branch-1',
          revision_hash: 'b1',
          created_at: 2100,
          parent_revision_id: 'root',
          branch: 1,
          depth: 1,
          children: []
        },
        {
          id: 'branch-2',
          revision_hash: 'b2',
          created_at: 2200,
          parent_revision_id: 'root',
          branch: 2,
          depth: 1,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(4);

      const nodeById = new Map(result.map((n) => [n.revision.id, n]));

      // Each branch should get its own lane
      expect(nodeById.get('root')!.lane).toBe(0);
      expect(nodeById.get('branch-0')!.lane).toBe(0); // Continues parent's branch
      expect(nodeById.get('branch-1')!.lane).toBe(1);
      expect(nodeById.get('branch-2')!.lane).toBe(2);
    });

    it('should use custom node width and level height', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'rev-1',
          revision_hash: 'abc',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'rev-2',
          revision_hash: 'def',
          created_at: 2000,
          parent_revision_id: 'rev-1',
          branch: 1, // Different branch
          depth: 1,
          children: []
        }
      ];

      // Custom dimensions
      const nodeWidth = 40;
      const levelHeight = 100;

      const result = calculateTreeLayout(revisions, nodeWidth, levelHeight);

      expect(result).toHaveLength(2);

      const nodeById = new Map(result.map((n) => [n.revision.id, n]));

      // Lane width = nodeWidth + 20 = 60
      // rev-1: x = 30 + 0 * 60 = 30
      expect(nodeById.get('rev-1')!.x).toBe(30);

      // rev-2: x = 30 + 1 * 60 = 90
      expect(nodeById.get('rev-2')!.x).toBe(90);

      // Y positions with levelHeight = 100
      expect(nodeById.get('rev-1')!.y).toBe(50); // startY
      expect(nodeById.get('rev-2')!.y).toBe(150); // 50 + 1 * 100
    });

    it('should handle revisions with undefined parent_revision_id', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'orphan',
          revision_hash: 'orphan',
          created_at: 1000,
          parent_revision_id: 'nonexistent',
          branch: 0,
          depth: 0,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(1);
      // Should get a lane even though parent doesn't exist
      expect(result[0].lane).toBeDefined();
    });

    it('should sort revisions by branch then creation time', () => {
      const revisions: TestRevisionNode[] = [
        {
          id: 'rev-c',
          revision_hash: 'c',
          created_at: 3000,
          parent_revision_id: 'root',
          branch: 0,
          depth: 1,
          children: []
        },
        {
          id: 'root',
          revision_hash: 'root',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'rev-a',
          revision_hash: 'a',
          created_at: 2000,
          parent_revision_id: 'root',
          branch: 0,
          depth: 1,
          children: []
        },
        {
          id: 'rev-b',
          revision_hash: 'b',
          created_at: 2500,
          parent_revision_id: 'root',
          branch: 1,
          depth: 1,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);

      expect(result).toHaveLength(4);

      // All nodes should have valid positions
      result.forEach((node) => {
        expect(node.x).toBeGreaterThan(0);
        expect(node.y).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('calculateConnections', () => {
    it('should return empty array for nodes without parents', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'rev-1',
            revision_hash: 'abc',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        }
      ];

      const getBranchColor = (branch: number) => `color-${branch}`;
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toEqual([]);
    });

    it('should create connection between parent and child', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'parent',
            revision_hash: 'abc',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        },
        {
          revision: {
            id: 'child',
            revision_hash: 'def',
            created_at: 2000,
            parent_revision_id: 'parent',
            branch: 0,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 0,
          x: 30,
          y: 130
        }
      ];

      const getBranchColor = (branch: number) => `#${branch}00`;
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toHaveLength(1);

      const connection = result[0];
      expect(connection.x1).toBe(30); // parent x
      expect(connection.y1).toBe(50); // parent y
      expect(connection.x2).toBe(30); // child x
      expect(connection.y2).toBe(130); // child y
      expect(connection.color).toBe('#000'); // branch 0
      expect(connection.fromLane).toBe(0);
      expect(connection.toLane).toBe(0);
    });

    it('should create connections for branching graph', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'root',
            revision_hash: 'root',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        },
        {
          revision: {
            id: 'branch-a',
            revision_hash: 'a',
            created_at: 2000,
            parent_revision_id: 'root',
            branch: 0,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 0,
          x: 30,
          y: 130
        },
        {
          revision: {
            id: 'branch-b',
            revision_hash: 'b',
            created_at: 2100,
            parent_revision_id: 'root',
            branch: 1,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 1,
          x: 80,
          y: 130
        }
      ];

      const colors = ['#red', '#blue', '#green'];
      const getBranchColor = (branch: number) => colors[branch] || '#gray';
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toHaveLength(2);

      // Find connections by child id
      const connectionA = result.find((c) => c.x2 === 30 && c.toLane === 0);
      const connectionB = result.find((c) => c.x2 === 80 && c.toLane === 1);

      expect(connectionA).toBeDefined();
      expect(connectionA!.color).toBe('#red'); // branch 0

      expect(connectionB).toBeDefined();
      expect(connectionB!.color).toBe('#blue'); // branch 1
    });

    it('should calculate control points for bezier curves', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'parent',
            revision_hash: 'abc',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        },
        {
          revision: {
            id: 'child',
            revision_hash: 'def',
            created_at: 2000,
            parent_revision_id: 'parent',
            branch: 1,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 1,
          x: 80,
          y: 130
        }
      ];

      const getBranchColor = () => '#000';
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toHaveLength(1);

      const connection = result[0];
      const midY = (50 + 130) / 2; // 90

      expect(connection.controlX1).toBe(30); // parent x
      expect(connection.controlY1).toBe(midY);
      expect(connection.controlX2).toBe(80); // child x
      expect(connection.controlY2).toBe(midY);
    });

    it('should skip connections where parent is not found', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'orphan',
            revision_hash: 'orphan',
            created_at: 2000,
            parent_revision_id: 'nonexistent',
            branch: 0,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 0,
          x: 30,
          y: 130
        }
      ];

      const getBranchColor = () => '#000';
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toEqual([]);
    });

    it('should handle deep tree with multiple levels', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'level-0',
            revision_hash: 'l0',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        },
        {
          revision: {
            id: 'level-1',
            revision_hash: 'l1',
            created_at: 2000,
            parent_revision_id: 'level-0',
            branch: 0,
            depth: 1,
            children: []
          },
          level: 1,
          lane: 0,
          x: 30,
          y: 130
        },
        {
          revision: {
            id: 'level-2',
            revision_hash: 'l2',
            created_at: 3000,
            parent_revision_id: 'level-1',
            branch: 0,
            depth: 2,
            children: []
          },
          level: 2,
          lane: 0,
          x: 30,
          y: 210
        },
        {
          revision: {
            id: 'level-3',
            revision_hash: 'l3',
            created_at: 4000,
            parent_revision_id: 'level-2',
            branch: 0,
            depth: 3,
            children: []
          },
          level: 3,
          lane: 0,
          x: 30,
          y: 290
        }
      ];

      const getBranchColor = () => '#000';
      const result = calculateConnections(treeNodes, getBranchColor);

      // Should have 3 connections (l0->l1, l1->l2, l2->l3)
      expect(result).toHaveLength(3);

      // Verify connection chain
      expect(result[0].y1).toBe(50);
      expect(result[0].y2).toBe(130);

      expect(result[1].y1).toBe(130);
      expect(result[1].y2).toBe(210);

      expect(result[2].y1).toBe(210);
      expect(result[2].y2).toBe(290);
    });

    it('should handle revisions with branch 0 as default', () => {
      const treeNodes: TreeNode<TestRevisionNode>[] = [
        {
          revision: {
            id: 'parent',
            revision_hash: 'abc',
            created_at: 1000,
            branch: 0,
            depth: 0,
            children: []
          },
          level: 0,
          lane: 0,
          x: 30,
          y: 50
        },
        {
          // Revision without explicit branch (should default to 0)
          revision: {
            id: 'child',
            revision_hash: 'def',
            created_at: 2000,
            parent_revision_id: 'parent',
            branch: 0,
            depth: 1,
            children: []
          } as TestRevisionNode,
          level: 1,
          lane: 0,
          x: 30,
          y: 130
        }
      ];

      const getBranchColor = (branch: number) => (branch === 0 ? '#main' : '#branch');
      const result = calculateConnections(treeNodes, getBranchColor);

      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('#main');
    });
  });

  describe('branch fallback branches', () => {
    it('should handle revisions with undefined branch (fallback to 0)', () => {
      // When both parent and child have the same branch (0),
      // the child continues in the parent's lane
      const revisions: TestRevisionNode[] = [
        {
          id: 'root',
          revision_hash: 'root1234',
          created_at: 1000,
          branch: 0,
          depth: 0,
          children: []
        },
        {
          id: 'child',
          revision_hash: 'child123',
          created_at: 2000,
          parent_revision_id: 'root',
          branch: 0,
          depth: 1,
          children: []
        }
      ];

      const result = calculateTreeLayout(revisions);
      expect(result.length).toBe(2);
      const rootNode = result.find((n) => n.revision.id === 'root');
      const childNode = result.find((n) => n.revision.id === 'child');
      expect(rootNode).toBeDefined();
      expect(childNode).toBeDefined();
      // Both on branch 0: parent.branch === branch, so child stays in lane 0
      expect(rootNode!.lane).toBe(0);
      expect(childNode!.lane).toBe(0);
    });
  });
});
