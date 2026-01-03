<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus, GripVertical, Trash2 } from 'lucide-svelte';
  import type { PageComponent } from '$lib/types/pages';

  export let containerId: string;
  export let children: PageComponent[] = [];
  export let isActive = false;
  export let allowedTypes: string[] = [];
  export let containerStyles = '';
  export let displayMode: 'flex' | 'grid' | 'block' = 'flex';
  export let showLayoutHints = true;
  // Optional: Label for the drop zone (useful for nested containers)
  export let label = '';

  // Derive flex direction from containerStyles to apply correct child sizing
  $: isColumnLayout =
    containerStyles.includes('flex-direction: column') ||
    containerStyles.includes('flex-direction:column');

  const dispatch = createEventDispatcher<{
    drop: { containerId: string; componentType: string; insertIndex: number };
    reorder: { containerId: string; fromIndex: number; toIndex: number };
    childClick: { childId: string };
    delete: { childId: string; index: number };
  }>();

  let dropZoneElement: HTMLElement;
  let isDragOver = false;
  let dropIndicatorIndex: number | null = null;
  let dragEnterCounter = 0; // Track nested dragenter/dragleave events
  let hoveredChildId: string | null = null; // Track which child is being hovered (JS-based, not CSS)

  // Check if a drag event contains a droppable component type
  function isValidDrag(event: DragEvent): boolean {
    if (!event.dataTransfer) return false;
    const hasComponentType = event.dataTransfer.types.includes('component-type');
    const hasReorder = event.dataTransfer.types.includes('component-reorder');
    return hasComponentType || hasReorder;
  }

  function handleDragEnter(event: DragEvent): void {
    if (!isValidDrag(event)) return;

    event.preventDefault();
    event.stopPropagation();
    dragEnterCounter++;

    if (dragEnterCounter === 1) {
      isDragOver = true;
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (!isValidDrag(event)) return;

    event.preventDefault();
    event.stopPropagation(); // Critical: prevent parent containers from handling

    if (!event.dataTransfer) return;

    const isReorder = event.dataTransfer.types.includes('component-reorder');
    event.dataTransfer.dropEffect = isReorder ? 'move' : 'copy';

    // Calculate drop position based on mouse position
    calculateDropPosition(event);
  }

  function handleDragLeave(event: DragEvent): void {
    if (!isValidDrag(event)) return;

    event.stopPropagation();
    dragEnterCounter--;

    if (dragEnterCounter <= 0) {
      dragEnterCounter = 0;
      isDragOver = false;
      dropIndicatorIndex = null;
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation(); // Critical: prevent parent containers from handling

    if (!event.dataTransfer) return;

    // Reset drag state
    isDragOver = false;
    dragEnterCounter = 0;
    const insertIndex = dropIndicatorIndex !== null ? dropIndicatorIndex : children.length;
    dropIndicatorIndex = null;

    // Check if this is a reorder operation (moving within or between containers)
    if (event.dataTransfer.types.includes('component-reorder')) {
      const fromIndex = parseInt(event.dataTransfer.getData('component-reorder'));
      const fromContainerId = event.dataTransfer.getData('container-id');

      // Only handle reorder within the same container
      if (fromContainerId === containerId && !isNaN(fromIndex)) {
        dispatch('reorder', { containerId, fromIndex, toIndex: insertIndex });
      }
      return;
    }

    // Handle new component drop from sidebar
    const componentType = event.dataTransfer.getData('component-type');
    if (componentType) {
      // Check if type is allowed
      if (allowedTypes.length > 0 && !allowedTypes.includes(componentType)) {
        return;
      }

      dispatch('drop', { containerId, componentType, insertIndex });
    }
  }

  function calculateDropPosition(event: DragEvent): void {
    if (!dropZoneElement) return;

    // Get direct child elements only (not nested)
    const childElements = Array.from(
      dropZoneElement.querySelectorAll(':scope > .child-component')
    ) as HTMLElement[];

    if (childElements.length === 0) {
      dropIndicatorIndex = 0;
      return;
    }

    const mouseY = event.clientY;
    const mouseX = event.clientX;

    // Determine layout direction from container styles
    const isHorizontal =
      displayMode === 'flex' &&
      (containerStyles.includes('row') || !containerStyles.includes('column'));

    let closestIndex = 0;
    let closestDistance = Infinity;

    childElements.forEach((child, index) => {
      const rect = child.getBoundingClientRect();

      if (isHorizontal) {
        // For horizontal layouts, use X position
        const childCenter = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - childCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = mouseX < childCenter ? index : index + 1;
        }
      } else {
        // For vertical layouts, use Y position
        const childCenter = rect.top + rect.height / 2;
        const distance = Math.abs(mouseY - childCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = mouseY < childCenter ? index : index + 1;
        }
      }
    });

    dropIndicatorIndex = closestIndex;
  }

  function handleChildDragStart(event: DragEvent, index: number): void {
    if (!event.dataTransfer) return;

    // Stop propagation to prevent parent containers from starting a drag
    event.stopPropagation();

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('component-reorder', index.toString());
    event.dataTransfer.setData('container-id', containerId);

    // Create a subtle drag preview
    const dragImage = document.createElement('div');
    dragImage.style.cssText = 'position: absolute; top: -9999px; opacity: 0.5;';
    dragImage.textContent = '📦';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }

  function handleChildDelete(event: MouseEvent, childId: string, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    dispatch('delete', { childId, index });
  }

  function handleChildClick(event: MouseEvent, childId: string): void {
    event.stopPropagation();
    // Clear hover and focus state when clicking - the selection moves to the properties panel
    hoveredChildren.clear();
    hoveredChildren = hoveredChildren; // Trigger reactivity
    focusedChildId = null;
    // Blur the clicked element to prevent focus from keeping controls visible
    (event.currentTarget as HTMLElement)?.blur();
    dispatch('childClick', { childId });
  }

  // Robust hover tracking that only shows controls on the INNERMOST hovered element.
  // Key insight: We track hover per-element but only show controls if no nested element is also hovered.
  // We use a Set to track all currently hovered child IDs in this container.
  let hoveredChildren = new Set<string>();

  // Track which child is focused (for keyboard accessibility)
  let focusedChildId: string | null = null;

  // Reactive: determine which child should show controls (if any)
  // Only the hovered child that has no other hovered descendants gets controls
  $: hoveredChildId = (() => {
    // If exactly one child is hovered, show its controls
    // If multiple are hovered (shouldn't happen with proper mouseenter/leave), show none
    if (hoveredChildren.size === 1) {
      return [...hoveredChildren][0];
    }
    return null;
  })();

  function handleChildMouseEnter(event: MouseEvent, childId: string): void {
    // Only trigger if entering from outside this specific element
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;

    // Check if we're entering from outside this child (not from a descendant)
    if (!related || !target.contains(related)) {
      hoveredChildren.add(childId);
      hoveredChildren = hoveredChildren; // Trigger reactivity
    }
  }

  function handleChildMouseLeave(event: MouseEvent, childId: string): void {
    // Only trigger if leaving to outside this specific element
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;

    // Check if we're leaving to outside this child (not to a descendant)
    if (!related || !target.contains(related)) {
      hoveredChildren.delete(childId);
      hoveredChildren = hoveredChildren; // Trigger reactivity
    }
  }

  function handleChildFocus(childId: string): void {
    focusedChildId = childId;
  }

  function handleChildBlur(event: FocusEvent, childId: string): void {
    // Only clear focus if we're blurring to something outside this child
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;

    if (!related || !target.contains(related)) {
      if (focusedChildId === childId) {
        focusedChildId = null;
      }
    }
  }
</script>

<div
  bind:this={dropZoneElement}
  class="container-drop-zone"
  class:active={isActive}
  class:drag-over={isDragOver}
  class:empty={children.length === 0}
  class:flex-layout={displayMode === 'flex'}
  class:flex-column={displayMode === 'flex' && isColumnLayout}
  class:flex-row={displayMode === 'flex' && !isColumnLayout}
  class:grid-layout={displayMode === 'grid'}
  class:show-hints={showLayoutHints}
  style={containerStyles}
  on:dragenter={handleDragEnter}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="region"
  aria-label={label || 'Component drop zone'}
  data-drop-zone-id={containerId}
>
  {#if label && showLayoutHints}
    <div class="drop-zone-label">{label}</div>
  {/if}

  {#if children.length === 0}
    <div class="empty-state" class:drag-active={isDragOver}>
      <Plus size={24} />
      <p>Drop components here</p>
      {#if label}
        <span class="hint">{label}</span>
      {:else}
        <span class="hint">Drag from the sidebar</span>
      {/if}
    </div>
  {:else}
    {#each children as child, index (child.id)}
      <div
        class="child-component"
        class:drop-before={dropIndicatorIndex === index && isDragOver}
        class:is-hovered={hoveredChildId === child.id}
        class:is-focused={focusedChildId === child.id}
        draggable="true"
        on:dragstart={(e) => handleChildDragStart(e, index)}
        on:click={(e) => handleChildClick(e, child.id)}
        on:mouseenter={(e) => handleChildMouseEnter(e, child.id)}
        on:mouseleave={(e) => handleChildMouseLeave(e, child.id)}
        on:focus={() => handleChildFocus(child.id)}
        on:blur={(e) => handleChildBlur(e, child.id)}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dispatch('childClick', { childId: child.id });
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            dispatch('delete', { childId: child.id, index });
          }
        }}
      >
        <!-- Hover controls: drag handle and delete button -->
        <div class="child-controls">
          <button
            type="button"
            class="control-btn drag-handle"
            title="Drag to reorder"
            on:mousedown|stopPropagation
            on:click|stopPropagation
          >
            <GripVertical size={14} />
          </button>
          <button
            type="button"
            class="control-btn delete-btn"
            title="Delete component"
            on:click|stopPropagation={(e) => handleChildDelete(e, child.id, index)}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <slot name="child" {child} {index} />
      </div>
    {/each}
    {#if dropIndicatorIndex === children.length && isDragOver}
      <div class="drop-indicator-end" />
    {/if}
  {/if}
</div>

<style>
  .container-drop-zone {
    position: relative;
    min-height: 40px;
    width: 100%;
    border: 2px dashed transparent;
    border-radius: 6px;
    padding: 4px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  /* Layout modes */
  .container-drop-zone.flex-layout {
    display: flex;
    /* flex-wrap is set via inline style to allow components to control their own wrapping behavior */
  }

  /* Default flex row containers should wrap if not specified otherwise */
  .container-drop-zone.flex-layout.flex-row {
    flex-wrap: wrap; /* Default for row layouts; can be overridden by inline style */
  }

  /* Flex column containers should not wrap (wrapping doesn't make sense for columns) */
  .container-drop-zone.flex-layout.flex-column {
    flex-wrap: nowrap;
  }

  .container-drop-zone.grid-layout {
    display: grid;
  }

  /* Active state (when selected) */
  .container-drop-zone.active {
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.02);
  }

  /* Drag over state - make it very obvious */
  .container-drop-zone.drag-over {
    border-color: #3b82f6;
    border-style: solid;
    background: rgba(59, 130, 246, 0.08);
    box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  /* Empty state styling */
  .container-drop-zone.empty {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-style: dashed;
    border-color: rgba(148, 163, 184, 0.4);
  }

  .container-drop-zone.empty.drag-over {
    border-color: #3b82f6;
    border-style: solid;
  }

  /* Drop zone label */
  .drop-zone-label {
    position: absolute;
    top: -10px;
    left: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    background: white;
    padding: 2px 6px;
    border-radius: 3px;
    z-index: 5;
    pointer-events: none;
  }

  .drag-over .drop-zone-label {
    color: #3b82f6;
    background: #eff6ff;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: #94a3b8;
    text-align: center;
    padding: 16px 8px;
    pointer-events: none;
  }

  .empty-state.drag-active {
    color: #3b82f6;
  }

  .empty-state p {
    margin: 0;
    font-weight: 500;
    font-size: 13px;
  }

  .empty-state .hint {
    font-size: 11px;
    opacity: 0.7;
  }

  /* Child components */
  .child-component {
    position: relative;
    cursor: pointer;
    transition: transform 0.1s ease;
    /* Ensure children fill their grid/flex cells properly */
    min-width: 0;
    min-height: 0;
  }

  /* In grid layout, children should fill their cells */
  .grid-layout > .child-component {
    width: 100%;
  }

  /* In flex column layout, children should fill width */
  .flex-column > .child-component {
    width: 100%;
  }

  /* In flex row layout, children should size to their content */
  .flex-row > .child-component {
    flex-shrink: 0;
  }

  .child-component:hover {
    z-index: 1;
  }

  /* Hover controls (drag handle and delete button) */
  .child-controls {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.15s ease,
      visibility 0.15s ease;
    z-index: 100;
    pointer-events: none;
  }

  /* Show controls only when THIS specific child is hovered via JS */
  .child-component.is-hovered > .child-controls,
  .child-component.is-focused > .child-controls {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  /* CRITICAL: Hide controls on parent elements when a nested child is being hovered or focused.
     This prevents multiple controls from showing when hovering nested containers.
     Uses :has() to detect if any descendant .child-component also has .is-hovered or .is-focused */
  .child-component.is-hovered:has(.child-component.is-hovered) > .child-controls,
  .child-component.is-hovered:has(.child-component.is-focused) > .child-controls,
  .child-component.is-focused:has(.child-component.is-hovered) > .child-controls,
  .child-component.is-focused:has(.child-component.is-focused) > .child-controls {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: white;
    color: #64748b;
    cursor: pointer;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.08);
    transition: all 0.15s ease;
  }

  .control-btn:hover {
    color: #1e293b;
    background: #f8fafc;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .drag-handle {
    cursor: grab;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .delete-btn:hover {
    color: #ef4444;
    background: #fef2f2;
  }

  /* Drop indicator before a child */
  .child-component.drop-before::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 3px;
    background: #3b82f6;
    border-radius: 2px;
    z-index: 10;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }

  /* Drop indicator at the end */
  .drop-indicator-end {
    width: 100%;
    height: 3px;
    background: #3b82f6;
    border-radius: 2px;
    margin-top: 4px;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }

  /* Show hints for layout mode - only visible on hover */
  .show-hints.flex-layout::after,
  .show-hints.grid-layout::after {
    content: attr(data-layout-hint);
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 9px;
    font-weight: 500;
    color: #94a3b8;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.15s ease,
      visibility 0.15s ease;
  }

  /* Show layout hint on hover */
  .show-hints.flex-layout:hover::after,
  .show-hints.grid-layout:hover::after {
    opacity: 0.5;
    visibility: visible;
  }

  .show-hints.flex-layout::after {
    content: '↔ flex';
  }

  .show-hints.grid-layout::after {
    content: '⊞ grid';
  }

  /* Subtle outline on children only during drag operations */
  .show-hints.drag-over .child-component {
    outline: 1px dashed rgba(148, 163, 184, 0.3);
    outline-offset: 2px;
  }

  /* Show blue outline only on the innermost hovered element (not parents of nested hovered elements) */
  .show-hints .child-component.is-hovered:not(:has(.child-component.is-hovered)) {
    outline: 1px dashed rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
  }
</style>
