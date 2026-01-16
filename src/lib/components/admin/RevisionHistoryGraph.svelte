<script lang="ts">
  // Accept any revision node type that has the common fields
  interface RevisionNodeLike {
    id: string;
    revision_hash: string;
    created_at: number;
    parent_revision_id?: string;
    is_current?: boolean;
    is_published?: boolean;
    message?: string;
    notes?: string;
    user_id?: string;
    created_by?: string;
    children: RevisionNodeLike[];
    depth: number;
    branch: number;
  }

  export let revisions: RevisionNodeLike[] = [];
  export let currentRevisionId: string | null = null;
  export let onSelectRevision: (revisionId: string) => void = () => {};

  // Branch colors for git-like visualization
  const BRANCH_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16' // lime
  ];

  function getBranchColor(branch: number): string {
    return BRANCH_COLORS[branch % BRANCH_COLORS.length];
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const date = new Date(timestamp * 1000);
    const diffMs = now - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else if (diffWeeks < 4) {
      return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    } else if (diffMonths < 12) {
      return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    } else {
      return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
    }
  }

  function formatHash(hash: string): string {
    return hash.substring(0, 7);
  }

  // Graph node with position information
  interface GraphNode {
    revision: RevisionNodeLike;
    lane: number;
    row: number;
    x: number;
    y: number;
  }

  // Constants for SVG graph - compact git-like appearance
  const LANE_WIDTH = 14;
  const ROW_HEIGHT = 40;
  const NODE_RADIUS = 4;
  const GRAPH_PADDING = 10;

  // Rail segment for continuous vertical lines
  interface RailSegment {
    lane: number;
    fromRow: number;
    toRow: number;
    color: string;
  }

  // Branch connection for diagonal lines
  interface BranchConnection {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    toLane: number;
    color: string;
  }

  interface LayoutResult {
    graphNodes: GraphNode[];
    rails: RailSegment[];
    branches: BranchConnection[];
  }

  function buildGraphLayout(nodes: RevisionNodeLike[]): LayoutResult {
    if (nodes.length === 0) {
      return { graphNodes: [], rails: [], branches: [] };
    }

    // Build maps for quick lookup
    const nodeById = new Map<string, RevisionNodeLike>();
    nodes.forEach((n) => nodeById.set(n.id, n));

    // Build parent-child relationships from the children arrays (already set by server)
    // This is more reliable than parent_revision_id since the server chains orphans together
    const childToParent = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();

    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        const childIds = node.children.map((c) => c.id);
        parentToChildren.set(node.id, childIds);
        node.children.forEach((child) => {
          childToParent.set(child.id, node.id);
        });
      }
    });

    // Assign lanes based on actual branching
    // Start with all nodes at lane 0, only branch when a parent has multiple children
    const nodeLane = new Map<string, number>();
    let maxLaneUsed = 0;

    // Process nodes in order (they're sorted by depth, so parents before children)
    nodes.forEach((node) => {
      const parentId = childToParent.get(node.id);
      if (!parentId) {
        // Root node - assign to lane 0
        nodeLane.set(node.id, 0);
      } else {
        const parentLane = nodeLane.get(parentId);
        const siblings = parentToChildren.get(parentId) || [];

        if (parentLane !== undefined) {
          // Parent exists - check if this is a branch
          const myIndex = siblings.indexOf(node.id);
          if (myIndex === 0) {
            // First child continues on parent's lane
            nodeLane.set(node.id, parentLane);
          } else {
            // Subsequent children get new lanes
            maxLaneUsed++;
            nodeLane.set(node.id, maxLaneUsed);
          }
        } else {
          // Parent not found - assign to lane 0
          nodeLane.set(node.id, 0);
        }
      }
    });

    const graphNodes: GraphNode[] = [];
    const nodePositions = new Map<string, { x: number; y: number; lane: number; row: number }>();

    // Build graph nodes with positions (reversed so newest at top)
    const totalNodes = nodes.length;
    nodes.forEach((node, index) => {
      const lane = nodeLane.get(node.id) ?? 0;
      // Reverse the row position: newest (last in original order) gets row 0
      const row = totalNodes - 1 - index;
      const x = GRAPH_PADDING + lane * LANE_WIDTH;
      const y = row * ROW_HEIGHT + ROW_HEIGHT / 2;

      nodePositions.set(node.id, { x, y, lane, row });
      graphNodes.push({
        revision: node,
        lane,
        row,
        x,
        y
      });
    });

    // Sort graphNodes by row so display order is top-to-bottom (newest first)
    graphNodes.sort((a, b) => a.row - b.row);

    // Build connections (lines between parent and child nodes)
    const branches: BranchConnection[] = [];

    // Draw a connection from each node to its parent (using the childToParent map)
    nodes.forEach((node) => {
      const parentId = childToParent.get(node.id);
      if (!parentId) return;

      const childPos = nodePositions.get(node.id);
      const parentPos = nodePositions.get(parentId);
      if (!childPos || !parentPos) return;

      const color = getBranchColor(childPos.lane);

      // Draw connection from parent to child
      branches.push({
        fromX: parentPos.x,
        fromY: parentPos.y,
        toX: childPos.x,
        toY: childPos.y,
        toLane: childPos.lane,
        color
      });
    });

    // Build rails: vertical line segments for continuous lanes
    // A rail exists from the first to last node on each lane
    const rails: RailSegment[] = [];
    const laneRanges = new Map<number, { minRow: number; maxRow: number }>();

    graphNodes.forEach((gn) => {
      const existing = laneRanges.get(gn.lane);
      if (existing) {
        existing.minRow = Math.min(existing.minRow, gn.row);
        existing.maxRow = Math.max(existing.maxRow, gn.row);
      } else {
        laneRanges.set(gn.lane, { minRow: gn.row, maxRow: gn.row });
      }
    });

    laneRanges.forEach((range, lane) => {
      if (range.maxRow > range.minRow) {
        rails.push({
          lane,
          fromRow: range.minRow,
          toRow: range.maxRow,
          color: getBranchColor(lane)
        });
      }
    });

    return { graphNodes, rails, branches };
  }

  $: layoutResult = buildGraphLayout(revisions);
  $: graphNodes = layoutResult.graphNodes;
  $: rails = layoutResult.rails;
  $: branches = layoutResult.branches;
  $: maxLane = graphNodes.length > 0 ? Math.max(...graphNodes.map((n) => n.lane)) : 0;
</script>

<div class="revision-graph-container">
  {#if revisions.length === 0}
    <div class="empty-state">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        class="empty-icon"
      >
        <circle cx="12" cy="12" r="10" stroke-width="1.5" />
        <path d="M12 6v6l4 2" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <p>No revision history yet</p>
      <span class="empty-hint">Save changes to create your first revision</span>
    </div>
  {:else}
    <div class="graph-wrapper">
      <!-- SVG Graph visualization -->
      <div class="graph-svg-container">
        <svg
          width={(maxLane + 1) * LANE_WIDTH + GRAPH_PADDING * 2}
          height={graphNodes.length * ROW_HEIGHT}
          class="graph-svg"
        >
          <!-- Draw continuous vertical rails first (behind everything) -->
          {#each rails as rail}
            {@const x = GRAPH_PADDING + rail.lane * LANE_WIDTH}
            {@const y1 = rail.fromRow * ROW_HEIGHT + ROW_HEIGHT / 2}
            {@const y2 = rail.toRow * ROW_HEIGHT + ROW_HEIGHT / 2}
            <line x1={x} {y1} x2={x} {y2} stroke={rail.color} stroke-width="2" class="graph-rail" />
          {/each}

          <!-- Draw branch connections (lines from parent to child) -->
          {#each branches as branch}
            {@const sameColumn = branch.fromX === branch.toX}
            {#if sameColumn}
              <!-- Same column: straight vertical line -->
              <line
                x1={branch.fromX}
                y1={branch.fromY}
                x2={branch.toX}
                y2={branch.toY}
                stroke={branch.color}
                stroke-width="2"
                class="graph-connection"
              />
            {:else}
              <!-- Different column: stepped connection to avoid overlap -->
              <!-- With reversed order, parent is below (higher Y) and child is above (lower Y) -->
              <!-- Go up from parent, then step over to child's column, then continue up -->
              {@const stepY = branch.fromY - ROW_HEIGHT * 0.4}
              <path
                d="M {branch.fromX} {branch.fromY} 
                   L {branch.fromX} {stepY}
                   L {branch.toX} {stepY}
                   L {branch.toX} {branch.toY}"
                stroke={branch.color}
                stroke-width="2"
                fill="none"
                stroke-linejoin="round"
                class="graph-branch"
              />
            {/if}
          {/each}

          <!-- Draw nodes on top -->
          {#each graphNodes as node}
            {@const revision = node.revision}
            {@const x = node.x}
            {@const y = node.y}
            {@const color = getBranchColor(node.lane)}
            {@const isSelected = revision.id === currentRevisionId}
            {@const isPublished = revision.is_current || revision.is_published}

            <!-- Node glow for selected -->
            {#if isSelected}
              <circle
                cx={x}
                cy={y}
                r={NODE_RADIUS + 4}
                fill={color}
                opacity="0.3"
                class="node-glow"
              />
            {/if}

            <!-- Main node circle -->
            <circle
              cx={x}
              cy={y}
              r={NODE_RADIUS}
              fill={isPublished ? color : 'var(--color-bg-primary, #1e293b)'}
              stroke={color}
              stroke-width="2"
              class="graph-node"
              class:selected={isSelected}
              class:published={isPublished}
              role="button"
              tabindex="0"
              on:click={() => onSelectRevision(revision.id)}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRevision(revision.id);
                }
              }}
            />

            <!-- Published indicator (checkmark) -->
            {#if isPublished}
              <path
                d="M {x - 3} {y} l 2 2 l 4 -4"
                stroke="white"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="published-check"
              />
            {/if}
          {/each}
        </svg>
      </div>

      <!-- Revision details list -->
      <div class="graph-details">
        {#each graphNodes as node}
          {@const revision = node.revision}
          {@const isSelected = revision.id === currentRevisionId}
          {@const isPublished = revision.is_current || revision.is_published}
          {@const color = getBranchColor(node.lane)}

          <button
            type="button"
            class="revision-row"
            class:selected={isSelected}
            class:published={isPublished}
            style="--branch-color: {color}"
            on:click={() => onSelectRevision(revision.id)}
          >
            <div class="revision-main">
              <span class="revision-hash" style="color: {color}"
                >{formatHash(revision.revision_hash)}</span
              >
              <span class="revision-message"
                >{revision.notes || revision.message || 'No description'}</span
              >
            </div>
            <div class="revision-meta">
              <span class="revision-date" title={formatDate(revision.created_at)}
                >{formatRelativeTime(revision.created_at)}</span
              >
              {#if revision.user_id || revision.created_by}
                <span class="revision-author">{revision.user_id || revision.created_by}</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .revision-graph-container {
    width: 100%;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    background: var(--color-bg-primary, #0f172a);
    border-radius: 8px;
    border: 1px solid var(--color-border-secondary, #334155);
    /* Let content determine height, parent modal controls scrolling */
    overflow: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-icon {
    color: var(--color-text-tertiary, #64748b);
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #94a3b8);
    font-family: system-ui, sans-serif;
  }

  .empty-hint {
    font-size: 0.75rem;
    color: var(--color-text-tertiary, #64748b);
    font-family: system-ui, sans-serif;
  }

  .graph-wrapper {
    display: flex;
    /* Removed min-width: max-content to prevent overflow on mobile */
  }

  .graph-svg-container {
    flex-shrink: 0;
    background: var(--color-bg-secondary, #1e293b);
    border-right: 1px solid var(--color-border-secondary, #334155);
  }

  .graph-svg {
    display: block;
  }

  .graph-rail {
    opacity: 0.6;
  }

  .graph-branch {
    opacity: 0.7;
  }

  .graph-node {
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .graph-node:hover {
    transform-origin: center;
    filter: brightness(1.2);
  }

  .graph-node.selected {
    filter: drop-shadow(0 0 4px currentColor);
  }

  .node-glow {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.5;
    }
  }

  .published-check {
    pointer-events: none;
  }

  .graph-details {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .revision-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 40px !important;
    min-height: 40px !important;
    max-height: 40px !important;
    box-sizing: border-box;
    padding: 0 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border-secondary, #1e293b);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
    color: var(--color-text-primary, #e2e8f0);
    font-family: inherit;
    width: 100%;
  }
  .revision-row:hover {
    background: var(--color-bg-secondary, #1e293b);
  }

  .revision-row.selected {
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid var(--branch-color, #3b82f6);
  }

  .revision-row.published {
    background: rgba(16, 185, 129, 0.05);
  }

  .revision-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .revision-hash {
    font-weight: 600;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .revision-message {
    font-size: 0.8125rem;
    color: var(--color-text-secondary, #94a3b8);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .revision-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    font-size: 0.75rem;
    color: var(--color-text-tertiary, #64748b);
  }

  .revision-date {
    white-space: nowrap;
  }

  .revision-author {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    .revision-graph-container {
      /* Ensure container doesn't overflow */
      max-width: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .graph-wrapper {
      /* Keep side-by-side layout on mobile so dots/lines stay on left */
      flex-direction: row;
      width: 100%;
    }

    .graph-svg-container {
      /* Keep the graph on the left, just make it more compact */
      flex-shrink: 0;
      border-right: 1px solid var(--color-border-secondary, #334155);
    }

    .graph-details {
      /* Prevent details from overflowing */
      flex: 1;
      min-width: 0; /* Allow text truncation */
      max-width: 100%;
      overflow: hidden;
    }

    .revision-row {
      /* MUST keep 40px height to align with SVG nodes */
      height: 40px !important;
      min-height: 40px !important;
      max-height: 40px !important;
      flex-wrap: nowrap;
      padding: 0 0.375rem;
      gap: 0.25rem;
    }

    .revision-main {
      flex: 1;
      min-width: 0;
      flex-direction: row;
      align-items: center;
      gap: 0.375rem;
    }

    .revision-hash {
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .revision-message {
      /* Truncate on mobile to save space */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      font-size: 0.75rem;
    }

    .revision-meta {
      /* Hide meta on very small screens to save space */
      display: none;
    }
  }

  /* Show meta on slightly larger mobile screens */
  @media (min-width: 400px) and (max-width: 640px) {
    .revision-meta {
      display: flex;
      flex-shrink: 0;
      font-size: 0.625rem;
    }

    .revision-author {
      display: none;
    }
  }
</style>
