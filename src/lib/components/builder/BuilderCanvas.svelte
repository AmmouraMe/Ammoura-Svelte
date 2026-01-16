<script lang="ts">
  import { createEventDispatcher, tick, onMount, onDestroy } from 'svelte';
  import {
    Copy,
    Trash2,
    RotateCcw,
    Palette,
    Pencil,
    Eye,
    GripVertical,
    ChevronRight,
    ChevronDown,
    Layers,
    MoveUp,
    MoveDown
  } from 'lucide-svelte';
  import type {
    PageComponent,
    LayoutComponent,
    ComponentConfig,
    ColorThemeDefinition,
    Component
  } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import ComponentRenderer from '$lib/components/admin/ComponentRenderer.svelte';
  import { stableSortComponents } from '$lib/utils/componentPositions';
  import {
    getThemeColors,
    generateThemeStyles,
    resolveThemeColor
  } from '$lib/utils/editor/colorThemes';
  import { getComponentDisplayLabel } from '$lib/utils/editor/componentDefaults';

  type BuilderMode = 'page' | 'layout' | 'component' | 'primitive';

  // Canvas element reference for scrolling
  let canvasElement: HTMLDivElement;

  /**
   * Scrolls the canvas to make the specified component visible
   * @param componentId - The ID of the component to scroll to
   */
  export async function scrollToComponent(componentId: string): Promise<void> {
    // Wait for the DOM to update
    await tick();

    if (!canvasElement) return;

    const componentElement = canvasElement.querySelector(`[data-component-id="${componentId}"]`);
    if (componentElement) {
      componentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  export let mode: BuilderMode = 'page';
  export let pageComponents: PageComponent[];
  export let layoutComponents: LayoutComponent[] = []; // Layout components to display (grayed out in page mode)
  export let selectedComponent: PageComponent | null;
  export let hoveredComponent: PageComponent | null;
  export let currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  export let colorTheme: string;
  export let userCurrentThemeId: string;
  export let colorThemes: ColorThemeDefinition[] = [];
  export let components: Component[] = [];
  export let canDeleteComponents = true;
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;
  // Mobile view state - used for zoom-out scaling when viewing larger breakpoints
  export let isMobileView = false;
  // Mobile edit mode: when ON, show component controls; when OFF, show clean preview
  export let mobileEditMode = false;

  // Computed: Should we show edit controls? Always on desktop, only when edit mode is on for mobile
  $: showEditControls = !isMobileView || mobileEditMode;

  // Toggle mobile edit mode
  function toggleMobileEditMode(): void {
    dispatch('toggleMobileEditMode');
  }
  // Page/component root properties (background, border, etc.)
  export let pageProperties:
    | {
        backgroundColor?: string;
        backgroundImage?: string;
        minHeight?: string;
        borderColor?: string;
        borderWidth?: string;
        borderStyle?: string;
        borderRadius?: string;
        padding?: string;
        boxShadow?: string;
      }
    | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Calculate zoom scale for viewing larger breakpoints on mobile
  // When on mobile and viewing tablet/desktop, scale down to fit
  $: viewportScale = (() => {
    if (!isMobileView) return 1;
    // On mobile, scale down larger breakpoints to fit
    if (currentBreakpoint === 'desktop') return 0.35; // 1024px -> ~358px
    if (currentBreakpoint === 'tablet') return 0.5; // 768px -> 384px
    return 1; // Mobile breakpoint: no scaling
  })();

  $: needsScaling = isMobileView && currentBreakpoint !== 'mobile';

  // Generate theme styles reactively from the loaded themes
  $: currentThemeData = colorThemes.find((t) => t.id === colorTheme);
  $: themeColors = currentThemeData?.colors || getThemeColors(colorTheme);
  $: themeStyles = generateThemeStyles(themeColors);

  // Check if we're previewing a different theme than the user's current site theme
  // This should compare against the user's active theme, not the page's saved theme
  $: isPreviewingDifferentTheme = colorTheme !== userCurrentThemeId;

  // Theme debug panel collapsed state (collapsed by default)
  let themeDebugCollapsed = true;

  function toggleThemeDebugPanel(): void {
    themeDebugCollapsed = !themeDebugCollapsed;
  }

  // Map theme variables to global color variables for component compatibility
  $: componentThemeOverrides = `
    --color-bg-primary: ${themeColors.background};
    --color-bg-secondary: ${themeColors.surface};
    --color-text-primary: ${themeColors.text};
    --color-text-secondary: ${themeColors.textSecondary};
    --color-primary: ${themeColors.primary};
    --color-secondary: ${themeColors.secondary};
    --color-accent: ${themeColors.accent};
    --color-border: ${themeColors.border};
    --color-success: ${themeColors.success};
    --color-warning: ${themeColors.warning};
    --color-danger: ${themeColors.error};
    --color-error: ${themeColors.error};
  `.trim();

  // Compute resolved page properties styles for live preview
  // Resolves theme: references to actual colors
  $: pagePropertiesStyle = (() => {
    if (!pageProperties) return '';

    const styles: string[] = [];

    // Background color - resolve theme references
    if (pageProperties.backgroundColor) {
      const bgColor = resolveThemeColor(pageProperties.backgroundColor, colorTheme, '', true);
      if (bgColor) styles.push(`background-color: ${bgColor}`);
    }

    // Background image
    if (pageProperties.backgroundImage) {
      styles.push(`background-image: url('${pageProperties.backgroundImage}')`);
      styles.push('background-size: cover');
      styles.push('background-position: center');
      styles.push('background-repeat: no-repeat');
    }

    // Min height
    if (pageProperties.minHeight) {
      styles.push(`min-height: ${pageProperties.minHeight}`);
    }

    // Border
    if (pageProperties.borderWidth && pageProperties.borderWidth !== '0') {
      const borderColor = pageProperties.borderColor
        ? resolveThemeColor(pageProperties.borderColor, colorTheme, '', true)
        : 'var(--color-border)';
      const borderStyle = pageProperties.borderStyle || 'solid';
      styles.push(`border: ${pageProperties.borderWidth} ${borderStyle} ${borderColor}`);
    }

    // Border radius
    if (pageProperties.borderRadius && pageProperties.borderRadius !== '0') {
      styles.push(`border-radius: ${pageProperties.borderRadius}`);
    }

    // Padding
    if (pageProperties.padding) {
      styles.push(`padding: ${pageProperties.padding}`);
    }

    // Box shadow
    if (pageProperties.boxShadow) {
      styles.push(`box-shadow: ${pageProperties.boxShadow}`);
    }

    return styles.join('; ');
  })();

  // Compute sorted components reactively using stable sort
  // This ensures consistent ordering even with duplicate positions
  $: sortedComponents = stableSortComponents(pageComponents);

  // Filter to only root-level components (those without parent_id)
  // Child components will be rendered by their parent containers
  $: rootComponents = sortedComponents.filter((c) => !c.parent_id);

  // Build a map of parent_id -> children for efficient lookup
  $: childrenMap = sortedComponents.reduce(
    (map, comp) => {
      if (comp.parent_id) {
        if (!map[comp.parent_id]) {
          map[comp.parent_id] = [];
        }
        map[comp.parent_id].push(comp);
      }
      return map;
    },
    {} as Record<string, typeof sortedComponents>
  );

  // Function to inject children into a component's config for rendering
  function injectChildrenIntoConfig(comp: PageComponent): PageComponent {
    const children = childrenMap[comp.id];
    if (!children || children.length === 0) {
      return comp;
    }
    // Recursively inject children into nested components
    const childrenWithNested = children
      .sort((a, b) => a.position - b.position)
      .map((child) => injectChildrenIntoConfig(child));
    return {
      ...comp,
      config: {
        ...comp.config,
        children: childrenWithNested
      }
    };
  }

  // Compute components with children injected into their config
  $: componentsWithChildren = rootComponents.map((comp) => injectChildrenIntoConfig(comp));

  // Compute sorted layout components (simple sort by position)
  $: sortedLayoutComponents = [...layoutComponents].sort((a, b) => a.position - b.position);

  // Check if we should show layout context (page mode with layout components)
  $: showLayoutContext = mode === 'page' && sortedLayoutComponents.length > 0;

  // Find the yield component index in layout
  $: _yieldIndex = sortedLayoutComponents.findIndex((c) => c.type === 'yield');

  // Reactive canvas width based on breakpoint
  $: canvasWidth = {
    mobile: '375px',
    tablet: '768px',
    desktop: '1200px'
  }[currentBreakpoint];

  function handleComponentClick(component: PageComponent, event: MouseEvent) {
    event.stopPropagation();
    dispatch('selectComponent', component);
  }

  function handleComponentMouseEnter(component: PageComponent) {
    dispatch('hoverComponent', component);
  }

  function handleComponentMouseLeave() {
    dispatch('hoverComponent', null);
  }

  function handleCanvasClick() {
    dispatch('selectComponent', null);
  }

  function moveUp(component: PageComponent): void {
    // Use the reactive sortedComponents to get current display order
    const index = sortedComponents.findIndex((c) => c.id === component.id);

    if (index > 0) {
      // Create a new array with the components swapped
      const newOrder = [...sortedComponents];
      const temp = newOrder[index];
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = temp;

      // Renumber all positions to match the new order (0, 1, 2, ...)
      const updatedComponents = newOrder.map((c, i) => ({
        ...c,
        position: i
      }));

      // Dispatch update for all components to ensure positions are correct
      dispatch('batchUpdateComponents', updatedComponents);
    }
  }

  function moveDown(component: PageComponent): void {
    // Use the reactive sortedComponents to get current display order
    const index = sortedComponents.findIndex((c) => c.id === component.id);
    if (index < sortedComponents.length - 1) {
      // Create a new array with the components swapped
      const newOrder = [...sortedComponents];
      const temp = newOrder[index];
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = temp;

      // Renumber all positions to match the new order (0, 1, 2, ...)
      const updatedComponents = newOrder.map((c, i) => ({
        ...c,
        position: i
      }));

      // Dispatch update for all components to ensure positions are correct
      dispatch('batchUpdateComponents', updatedComponents);
    }
  }

  function handleComponentConfigUpdate(component: PageComponent, newConfig: ComponentConfig) {
    const updatedComponent = {
      ...component,
      config: newConfig
    };
    dispatch('updateComponent', updatedComponent);
  }

  // Handle selection of child components inside containers
  function handleSelectChildComponent(childComponent: PageComponent) {
    dispatch('selectComponent', childComponent);
  }

  function resetToActiveTheme() {
    dispatch('resetTheme');
  }

  // Determine if we're in fit-content mode (component/primitive/layout editing)
  // Layout mode also uses fit-content so the preview pane resizes to fit contents without scrollbars
  $: isFitContentMode = mode === 'component' || mode === 'primitive' || mode === 'layout';

  // Layout mode: can add/remove/reorder components but cannot edit their content inline
  $: isContentEditable = mode !== 'layout';

  // Tree view state for mobile edit mode
  let expandedNodes = new Set<string>();

  // Auto-expand all container nodes when tree view is shown
  $: if (mobileEditMode && isMobileView) {
    // Expand all nodes that have children
    for (const id of Object.keys(childrenMap)) {
      expandedNodes.add(id);
    }
    expandedNodes = expandedNodes;
  }

  // Toggle expanded state of a tree node
  function toggleExpanded(componentId: string): void {
    if (expandedNodes.has(componentId)) {
      expandedNodes.delete(componentId);
    } else {
      expandedNodes.add(componentId);
    }
    expandedNodes = expandedNodes; // Trigger reactivity
  }

  // Check if a component has children
  function hasChildren(componentId: string): boolean {
    return !!childrenMap[componentId]?.length;
  }

  // Get children of a component for tree rendering
  function getChildren(componentId: string): PageComponent[] {
    return (childrenMap[componentId] || []).sort((a, b) => a.position - b.position);
  }

  // Handle tree item click (select component)
  function handleTreeItemClick(component: PageComponent, event: MouseEvent): void {
    event.stopPropagation();
    dispatch('selectComponent', component);
  }

  // Handle tree item drag start
  let draggedTreeItem: PageComponent | null = null;
  let dragOverTreeItem: PageComponent | null = null;
  let dragOverPosition: 'before' | 'after' | 'inside' | null = null;

  function handleTreeDragStart(event: DragEvent, component: PageComponent): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', component.id);
    draggedTreeItem = component;
  }

  function handleTreeDragOver(event: DragEvent, component: PageComponent): void {
    if (!draggedTreeItem || draggedTreeItem.id === component.id) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    // Determine drop position based on mouse Y position
    if (y < height * 0.25) {
      dragOverPosition = 'before';
    } else if (y > height * 0.75) {
      dragOverPosition = 'after';
    } else if (
      hasChildren(component.id) ||
      component.type === 'container' ||
      component.type === 'columns' ||
      component.type === 'navbar' ||
      component.type === 'footer'
    ) {
      dragOverPosition = 'inside';
    } else {
      dragOverPosition = 'after';
    }
    dragOverTreeItem = component;
  }

  function handleTreeDragLeave(): void {
    dragOverTreeItem = null;
    dragOverPosition = null;
  }

  function handleTreeDrop(event: DragEvent, targetComponent: PageComponent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedTreeItem || draggedTreeItem.id === targetComponent.id) {
      draggedTreeItem = null;
      dragOverTreeItem = null;
      dragOverPosition = null;
      return;
    }

    // Find indices and calculate new positions
    const allComponents = [...sortedComponents];
    const draggedIndex = allComponents.findIndex((c) => c.id === draggedTreeItem!.id);
    const targetIndex = allComponents.findIndex((c) => c.id === targetComponent.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      draggedTreeItem = null;
      dragOverTreeItem = null;
      dragOverPosition = null;
      return;
    }

    // Remove the dragged item from the array
    const [draggedComp] = allComponents.splice(draggedIndex, 1);

    // Handle different drop positions
    if (dragOverPosition === 'inside') {
      // Move into the target as a child
      const updatedDragged = {
        ...draggedComp,
        parent_id: targetComponent.id,
        position: getChildren(targetComponent.id).length
      };
      // Expand the target node
      expandedNodes.add(targetComponent.id);
      expandedNodes = expandedNodes;
      dispatch('updateComponent', updatedDragged);
    } else {
      // Move before or after the target at the same level
      const newParentId = targetComponent.parent_id || null;
      let newPosition: number;

      if (dragOverPosition === 'before') {
        newPosition = targetComponent.position;
      } else {
        newPosition = targetComponent.position + 1;
      }

      const updatedDragged = {
        ...draggedComp,
        parent_id: newParentId,
        position: newPosition
      };

      // Adjust positions of siblings
      const siblings = allComponents.filter((c) => c.parent_id === newParentId);
      const updatedSiblings = siblings.map((c) => {
        if (c.position >= newPosition) {
          return { ...c, position: c.position + 1 };
        }
        return c;
      });

      // Dispatch batch update
      dispatch('batchUpdateComponents', [...updatedSiblings, updatedDragged]);
    }

    draggedTreeItem = null;
    dragOverTreeItem = null;
    dragOverPosition = null;
  }

  function handleTreeDragEnd(): void {
    draggedTreeItem = null;
    dragOverTreeItem = null;
    dragOverPosition = null;
  }

  // ==================== Touch Drag & Drop Support ====================
  // Touch-based drag and drop for mobile devices (HTML5 drag doesn't work with touch)
  let touchDragItem: PageComponent | null = null;
  let touchDragGhost: HTMLElement | null = null;
  let touchStartY = 0;
  let touchCurrentY = 0;
  let touchDragActive = false;
  let touchDragThreshold = 10; // Pixels before drag starts
  let treeListElement: HTMLElement | null = null;

  // Store refs to tree item elements for hit testing
  function getTreeItemElements(): HTMLElement[] {
    if (!treeListElement) return [];
    return Array.from(treeListElement.querySelectorAll('.tree-item'));
  }

  // Find which tree item is under the touch point
  function findTreeItemAtPoint(y: number): {
    element: HTMLElement;
    component: PageComponent;
    position: 'before' | 'after' | 'inside';
  } | null {
    const items = getTreeItemElements();

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const componentId = item.dataset.componentId;
      if (!componentId) continue;

      const component = sortedComponents.find((c) => c.id === componentId);
      if (!component || component.id === touchDragItem?.id) continue;

      // Check if point is within this element's vertical bounds
      if (y >= rect.top && y <= rect.bottom) {
        const relativeY = y - rect.top;
        const height = rect.height;

        let position: 'before' | 'after' | 'inside';
        if (relativeY < height * 0.25) {
          position = 'before';
        } else if (relativeY > height * 0.75) {
          position = 'after';
        } else if (
          hasChildren(component.id) ||
          component.type === 'container' ||
          component.type === 'columns' ||
          component.type === 'navbar' ||
          component.type === 'footer'
        ) {
          position = 'inside';
        } else {
          position = 'after';
        }

        return { element: item, component, position };
      }
    }

    return null;
  }

  // Create ghost element for visual feedback
  function createTouchDragGhost(sourceElement: HTMLElement): void {
    const rect = sourceElement.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'touch-drag-ghost';
    ghost.textContent = sourceElement.querySelector('.tree-item-label')?.textContent || 'Component';
    ghost.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      padding: 0.5rem 0.75rem;
      background: rgba(59, 130, 246, 0.95);
      color: white;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 10000;
      transform: scale(0.95);
      transition: transform 0.15s ease;
    `;
    document.body.appendChild(ghost);
    touchDragGhost = ghost;

    // Animate in
    requestAnimationFrame(() => {
      if (touchDragGhost) {
        touchDragGhost.style.transform = 'scale(1)';
      }
    });
  }

  // Update ghost position during drag
  function updateTouchDragGhost(y: number): void {
    if (!touchDragGhost) return;
    const rect = touchDragGhost.getBoundingClientRect();
    touchDragGhost.style.top = `${y - rect.height / 2}px`;
  }

  // Remove ghost element
  function removeTouchDragGhost(): void {
    if (touchDragGhost) {
      touchDragGhost.remove();
      touchDragGhost = null;
    }
  }

  // Clear all drop indicators
  function clearTouchDropIndicators(): void {
    const items = getTreeItemElements();
    for (const item of items) {
      item.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside');
    }
    dragOverTreeItem = null;
    dragOverPosition = null;
  }

  // Handle touch start on drag handle
  function handleTouchDragStart(event: TouchEvent, component: PageComponent): void {
    const touch = event.touches[0];
    touchStartY = touch.clientY;
    touchCurrentY = touch.clientY;
    touchDragItem = component;
    touchDragActive = false;

    // Store reference to tree list for later
    treeListElement = (event.target as HTMLElement).closest('.tree-list');
  }

  // Handle touch move
  function handleTouchDragMove(event: TouchEvent): void {
    if (!touchDragItem) return;

    const touch = event.touches[0];
    touchCurrentY = touch.clientY;

    // Check if we've moved past threshold to start drag
    if (!touchDragActive && Math.abs(touchCurrentY - touchStartY) > touchDragThreshold) {
      touchDragActive = true;
      draggedTreeItem = touchDragItem;

      // Find source element and create ghost
      const sourceElement = getTreeItemElements().find(
        (el) => el.dataset.componentId === touchDragItem?.id
      );
      if (sourceElement) {
        createTouchDragGhost(sourceElement);
        sourceElement.classList.add('dragging');
      }
    }

    if (touchDragActive) {
      event.preventDefault(); // Prevent scrolling while dragging

      // Update ghost position
      updateTouchDragGhost(touchCurrentY);

      // Clear previous indicators
      clearTouchDropIndicators();

      // Find element under touch point
      const target = findTreeItemAtPoint(touchCurrentY);
      if (target) {
        dragOverTreeItem = target.component;
        dragOverPosition = target.position;
        target.element.classList.add(`drag-over-${target.position}`);
      }
    }
  }

  // Handle touch end
  function handleTouchDragEnd(_event: TouchEvent): void {
    if (touchDragActive && touchDragItem && dragOverTreeItem && dragOverPosition) {
      // Perform the drop
      performTreeDrop(touchDragItem, dragOverTreeItem, dragOverPosition);
    }

    // Clean up
    if (touchDragActive) {
      const sourceElement = getTreeItemElements().find(
        (el) => el.dataset.componentId === touchDragItem?.id
      );
      if (sourceElement) {
        sourceElement.classList.remove('dragging');
      }
    }

    removeTouchDragGhost();
    clearTouchDropIndicators();
    touchDragItem = null;
    touchDragActive = false;
    draggedTreeItem = null;
  }

  // Shared drop logic for both mouse and touch drag
  function performTreeDrop(
    draggedComp: PageComponent,
    targetComponent: PageComponent,
    position: 'before' | 'after' | 'inside'
  ): void {
    const allComponents = [...sortedComponents];
    const draggedIndex = allComponents.findIndex((c) => c.id === draggedComp.id);
    const targetIndex = allComponents.findIndex((c) => c.id === targetComponent.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove the dragged item from the array
    const [removed] = allComponents.splice(draggedIndex, 1);

    if (position === 'inside') {
      // Move into the target as a child
      const updatedDragged = {
        ...removed,
        parent_id: targetComponent.id,
        position: getChildren(targetComponent.id).length
      };
      // Expand the target node
      expandedNodes.add(targetComponent.id);
      expandedNodes = expandedNodes;
      dispatch('updateComponent', updatedDragged);
    } else {
      // Move before or after the target at the same level
      const newParentId = targetComponent.parent_id || null;
      let newPosition: number;

      if (position === 'before') {
        newPosition = targetComponent.position;
      } else {
        newPosition = targetComponent.position + 1;
      }

      const updatedDragged = {
        ...removed,
        parent_id: newParentId,
        position: newPosition
      };

      // Adjust positions of siblings
      const siblings = allComponents.filter((c) => c.parent_id === newParentId);
      const updatedSiblings = siblings.map((c) => {
        if (c.position >= newPosition) {
          return { ...c, position: c.position + 1 };
        }
        return c;
      });

      dispatch('batchUpdateComponents', [...updatedSiblings, updatedDragged]);
    }
  }

  // Global touch move/end handlers
  function onGlobalTouchMove(event: TouchEvent): void {
    if (touchDragItem) {
      handleTouchDragMove(event);
    }
  }

  function onGlobalTouchEnd(event: TouchEvent): void {
    if (touchDragItem) {
      handleTouchDragEnd(event);
    }
  }

  // Set up global touch listeners
  onMount(() => {
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', onGlobalTouchEnd);
  });

  onDestroy(() => {
    document.removeEventListener('touchmove', onGlobalTouchMove);
    document.removeEventListener('touchend', onGlobalTouchEnd);
    removeTouchDragGhost();
  });
</script>

<div
  class="builder-canvas"
  class:fit-content-mode={isFitContentMode}
  bind:this={canvasElement}
  on:click={handleCanvasClick}
  role="presentation"
>
  <!-- Theme Preview Indicator (only when previewing a different theme) -->
  {#if isPreviewingDifferentTheme}
    <div class="theme-debug-indicator">
      {#if themeDebugCollapsed}
        <!-- Collapsed state: just an icon button -->
        <button
          class="theme-debug-toggle"
          on:click|stopPropagation={toggleThemeDebugPanel}
          aria-label="Show theme preview details"
          title="Theme Preview Active - Click to expand"
        >
          <Palette size={18} />
          <span class="theme-debug-pulse"></span>
        </button>
      {:else}
        <!-- Expanded state: full panel -->
        <div class="theme-debug-panel">
          <div class="theme-debug-header">
            <div class="theme-debug-title">
              <Palette size={14} />
              <strong>Theme Preview</strong>
            </div>
            <button
              class="theme-debug-collapse"
              on:click|stopPropagation={toggleThemeDebugPanel}
              aria-label="Collapse panel"
              title="Collapse"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9L12 15L18 9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <div class="theme-debug-content">
            <div class="theme-debug-info">
              <span class="theme-debug-label">Theme</span>
              <span class="theme-debug-value">{currentThemeData?.name || colorTheme}</span>
            </div>
            <div class="theme-debug-colors">
              <div class="color-grid">
                <div class="color-row">
                  <span class="color-label">Primary</span>
                  <span class="color-swatch" style="background: {themeColors.primary};"></span>
                  <span class="color-hex">{themeColors.primary}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Secondary</span>
                  <span class="color-swatch" style="background: {themeColors.secondary};"></span>
                  <span class="color-hex">{themeColors.secondary}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Accent</span>
                  <span class="color-swatch" style="background: {themeColors.accent};"></span>
                  <span class="color-hex">{themeColors.accent}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Background</span>
                  <span class="color-swatch" style="background: {themeColors.background};"></span>
                  <span class="color-hex">{themeColors.background}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Surface</span>
                  <span class="color-swatch" style="background: {themeColors.surface};"></span>
                  <span class="color-hex">{themeColors.surface}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Text</span>
                  <span class="color-swatch" style="background: {themeColors.text};"></span>
                  <span class="color-hex">{themeColors.text}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Text 2nd</span>
                  <span class="color-swatch" style="background: {themeColors.textSecondary};"
                  ></span>
                  <span class="color-hex">{themeColors.textSecondary}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Border</span>
                  <span class="color-swatch" style="background: {themeColors.border};"></span>
                  <span class="color-hex">{themeColors.border}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Success</span>
                  <span class="color-swatch" style="background: {themeColors.success};"></span>
                  <span class="color-hex">{themeColors.success}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Warning</span>
                  <span class="color-swatch" style="background: {themeColors.warning};"></span>
                  <span class="color-hex">{themeColors.warning}</span>
                </div>
                <div class="color-row">
                  <span class="color-label">Error</span>
                  <span class="color-swatch" style="background: {themeColors.error};"></span>
                  <span class="color-hex">{themeColors.error}</span>
                </div>
              </div>
            </div>
            <button
              class="btn-reset-theme"
              on:click|stopPropagation={resetToActiveTheme}
              aria-label="Stop previewing theme"
              title="Stop previewing and return to active theme"
            >
              <RotateCcw size={14} />
              <span>Quit Previewing</span>
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Mobile Edit Mode: Show Tree View instead of canvas -->
  {#if isMobileView && mobileEditMode}
    <div class="mobile-tree-view">
      <div class="tree-view-header">
        <Layers size={18} />
        <span>Component Tree</span>
        <span class="tree-item-count">{sortedComponents.length} items</span>
      </div>

      {#if sortedComponents.length === 0}
        <div class="tree-empty-state">
          <div class="empty-icon">📦</div>
          <p>No components yet</p>
          <p class="hint">Add components from the sidebar</p>
        </div>
      {:else}
        <div class="tree-list" class:drag-active={touchDragActive || draggedTreeItem !== null}>
          {#each rootComponents as component (component.id)}
            {@const isExpanded = expandedNodes.has(component.id)}
            {@const componentHasChildren = hasChildren(component.id)}
            {@const isSelected = selectedComponent?.id === component.id}
            {@const isDragOver = dragOverTreeItem?.id === component.id}
            <div class="tree-node">
              <div
                class="tree-item"
                class:selected={isSelected}
                class:drag-over={isDragOver}
                class:drag-over-before={isDragOver && dragOverPosition === 'before'}
                class:drag-over-after={isDragOver && dragOverPosition === 'after'}
                class:drag-over-inside={isDragOver && dragOverPosition === 'inside'}
                class:dragging={draggedTreeItem?.id === component.id}
                data-component-id={component.id}
                draggable="true"
                on:click={(e) => handleTreeItemClick(component, e)}
                on:dragstart={(e) => handleTreeDragStart(e, component)}
                on:dragover={(e) => handleTreeDragOver(e, component)}
                on:dragleave={handleTreeDragLeave}
                on:drop={(e) => handleTreeDrop(e, component)}
                on:dragend={handleTreeDragEnd}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch('selectComponent', component);
                  }
                }}
                role="treeitem"
                tabindex="0"
                aria-selected={isSelected}
                aria-expanded={componentHasChildren ? isExpanded : undefined}
              >
                <div
                  class="tree-item-drag-handle"
                  on:touchstart={(e) => handleTouchDragStart(e, component)}
                  role="button"
                  tabindex="-1"
                  aria-label="Drag to reorder"
                >
                  <GripVertical size={16} />
                </div>

                {#if componentHasChildren}
                  <button
                    class="tree-item-expand"
                    on:click|stopPropagation={() => toggleExpanded(component.id)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {#if isExpanded}
                      <ChevronDown size={16} />
                    {:else}
                      <ChevronRight size={16} />
                    {/if}
                  </button>
                {:else}
                  <div class="tree-item-expand-placeholder"></div>
                {/if}

                <span class="tree-item-label">
                  {getComponentDisplayLabel(component, components, true)}
                </span>

                <div class="tree-item-actions">
                  {#if canDeleteComponents}
                    <button
                      class="tree-action-btn delete"
                      on:click|stopPropagation={() => dispatch('deleteComponent', component.id)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  {/if}
                </div>
              </div>

              <!-- Render children recursively if expanded -->
              {#if componentHasChildren && isExpanded}
                <div class="tree-children">
                  {#each getChildren(component.id) as child (child.id)}
                    {@const childIsExpanded = expandedNodes.has(child.id)}
                    {@const childHasChildren = hasChildren(child.id)}
                    {@const childIsSelected = selectedComponent?.id === child.id}
                    {@const childIsDragOver = dragOverTreeItem?.id === child.id}
                    <div class="tree-node">
                      <div
                        class="tree-item"
                        class:selected={childIsSelected}
                        class:drag-over={childIsDragOver}
                        class:drag-over-before={childIsDragOver && dragOverPosition === 'before'}
                        class:drag-over-after={childIsDragOver && dragOverPosition === 'after'}
                        class:drag-over-inside={childIsDragOver && dragOverPosition === 'inside'}
                        class:dragging={draggedTreeItem?.id === child.id}
                        data-component-id={child.id}
                        draggable="true"
                        on:click={(e) => handleTreeItemClick(child, e)}
                        on:dragstart={(e) => handleTreeDragStart(e, child)}
                        on:dragover={(e) => handleTreeDragOver(e, child)}
                        on:dragleave={handleTreeDragLeave}
                        on:drop={(e) => handleTreeDrop(e, child)}
                        on:dragend={handleTreeDragEnd}
                        on:keydown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            dispatch('selectComponent', child);
                          }
                        }}
                        role="treeitem"
                        tabindex="0"
                        aria-selected={childIsSelected}
                        aria-expanded={childHasChildren ? childIsExpanded : undefined}
                      >
                        <div
                          class="tree-item-drag-handle"
                          on:touchstart={(e) => handleTouchDragStart(e, child)}
                          role="button"
                          tabindex="-1"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical size={16} />
                        </div>

                        {#if childHasChildren}
                          <button
                            class="tree-item-expand"
                            on:click|stopPropagation={() => toggleExpanded(child.id)}
                            aria-label={childIsExpanded ? 'Collapse' : 'Expand'}
                          >
                            {#if childIsExpanded}
                              <ChevronDown size={16} />
                            {:else}
                              <ChevronRight size={16} />
                            {/if}
                          </button>
                        {:else}
                          <div class="tree-item-expand-placeholder"></div>
                        {/if}

                        <span class="tree-item-label">
                          {getComponentDisplayLabel(child, components, true)}
                        </span>

                        <div class="tree-item-actions">
                          {#if canDeleteComponents}
                            <button
                              class="tree-action-btn delete"
                              on:click|stopPropagation={() => dispatch('deleteComponent', child.id)}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          {/if}
                        </div>
                      </div>

                      <!-- Third level children (grandchildren) -->
                      {#if childHasChildren && childIsExpanded}
                        <div class="tree-children">
                          {#each getChildren(child.id) as grandchild (grandchild.id)}
                            {@const grandchildIsSelected = selectedComponent?.id === grandchild.id}
                            {@const grandchildIsDragOver = dragOverTreeItem?.id === grandchild.id}
                            <div class="tree-node">
                              <div
                                class="tree-item"
                                class:selected={grandchildIsSelected}
                                class:drag-over={grandchildIsDragOver}
                                class:drag-over-before={grandchildIsDragOver &&
                                  dragOverPosition === 'before'}
                                class:drag-over-after={grandchildIsDragOver &&
                                  dragOverPosition === 'after'}
                                class:drag-over-inside={grandchildIsDragOver &&
                                  dragOverPosition === 'inside'}
                                class:dragging={draggedTreeItem?.id === grandchild.id}
                                data-component-id={grandchild.id}
                                draggable="true"
                                on:click={(e) => handleTreeItemClick(grandchild, e)}
                                on:dragstart={(e) => handleTreeDragStart(e, grandchild)}
                                on:dragover={(e) => handleTreeDragOver(e, grandchild)}
                                on:dragleave={handleTreeDragLeave}
                                on:drop={(e) => handleTreeDrop(e, grandchild)}
                                on:dragend={handleTreeDragEnd}
                                on:keydown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    dispatch('selectComponent', grandchild);
                                  }
                                }}
                                role="treeitem"
                                tabindex="0"
                                aria-selected={grandchildIsSelected}
                              >
                                <div
                                  class="tree-item-drag-handle"
                                  on:touchstart={(e) => handleTouchDragStart(e, grandchild)}
                                  role="button"
                                  tabindex="-1"
                                  aria-label="Drag to reorder"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <div class="tree-item-expand-placeholder"></div>
                                <span class="tree-item-label">
                                  {getComponentDisplayLabel(grandchild, components, true)}
                                </span>
                                <div class="tree-item-actions">
                                  {#if canDeleteComponents}
                                    <button
                                      class="tree-action-btn delete"
                                      on:click|stopPropagation={() =>
                                        dispatch('deleteComponent', grandchild.id)}
                                      aria-label="Delete"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  {/if}
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Scaled viewport wrapper for viewing larger breakpoints on mobile -->
    <div
      class="canvas-viewport-wrapper"
      class:scaled={needsScaling}
      style={needsScaling ? `--viewport-scale: ${viewportScale};` : ''}
    >
      <div
        class="canvas-viewport"
        class:fit-content={mode === 'component' || mode === 'primitive' || mode === 'layout'}
        class:scaled-viewport={needsScaling}
        style="width: {canvasWidth}; {needsScaling
          ? ''
          : 'max-width: 100%;'} background-color: {themeColors.background};"
      >
        <div
          class="canvas-content"
          class:mobile-edit-mode={mobileEditMode}
          style="{themeStyles}; {componentThemeOverrides}; {pagePropertiesStyle}"
          data-mobile-edit-mode={mobileEditMode ? 'on' : 'off'}
        >
          {#if showLayoutContext}
            <!-- Page mode with layout: render layout components with page content in yield area -->
            {#each sortedLayoutComponents as layoutComponent, _layoutIndex (layoutComponent.id)}
              {#if layoutComponent.type === 'yield'}
                <!-- Yield area: render page components here (editable) -->
                <div class="layout-yield-area" data-layout-component-type="yield">
                  <div class="yield-label">
                    <span class="yield-icon">📄</span>
                    <span>Page Content Area</span>
                  </div>
                  <div class="yield-content">
                    {#each componentsWithChildren as component, index (component.id)}
                      <div
                        class="component-wrapper"
                        class:selected={selectedComponent?.id === component.id}
                        class:hovered={hoveredComponent?.id === component.id}
                        data-component-id={component.id}
                        on:click={(e) => handleComponentClick(component, e)}
                        on:mouseenter={() => handleComponentMouseEnter(component)}
                        on:mouseleave={handleComponentMouseLeave}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            dispatch('selectComponent', component);
                          }
                        }}
                      >
                        {#if showEditControls && (selectedComponent?.id === component.id || hoveredComponent?.id === component.id)}
                          <div class="component-controls">
                            <div class="component-label">
                              {getComponentDisplayLabel(component, components)}
                            </div>
                            <div class="component-actions">
                              {#if mode !== 'primitive'}
                                <button
                                  class="btn-control"
                                  on:click|stopPropagation={() => moveUp(component)}
                                  disabled={index === 0}
                                  aria-label="Move up"
                                  title="Move up"
                                >
                                  <MoveUp size={14} />
                                </button>
                                <button
                                  class="btn-control"
                                  on:click|stopPropagation={() => moveDown(component)}
                                  disabled={index === componentsWithChildren.length - 1}
                                  aria-label="Move down"
                                  title="Move down"
                                >
                                  <MoveDown size={14} />
                                </button>
                              {/if}
                              {#if canDeleteComponents}
                                <button
                                  class="btn-control"
                                  on:click|stopPropagation={() =>
                                    dispatch('duplicateComponent', component)}
                                  aria-label="Duplicate"
                                  title="Duplicate"
                                >
                                  <Copy size={14} />
                                </button>
                              {/if}
                              {#if canDeleteComponents}
                                <button
                                  class="btn-control btn-danger"
                                  on:click|stopPropagation={() =>
                                    dispatch('deleteComponent', component.id)}
                                  aria-label="Delete"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              {/if}
                            </div>
                          </div>
                        {/if}
                        <div
                          class="component-content"
                          class:has-controls={showEditControls &&
                            (selectedComponent?.id === component.id ||
                              hoveredComponent?.id === component.id)}
                        >
                          <ComponentRenderer
                            {component}
                            {currentBreakpoint}
                            {colorTheme}
                            {siteContext}
                            {user}
                            onUpdate={(newConfig) =>
                              handleComponentConfigUpdate(component, newConfig)}
                            isEditable={isContentEditable}
                            onSelectComponent={handleSelectChildComponent}
                          />
                        </div>
                      </div>
                    {/each}

                    {#if pageComponents.length === 0}
                      <div class="empty-canvas">
                        <div class="empty-icon">📄</div>
                        <h3>Add Page Content</h3>
                        <p>Add components from the sidebar to build your page content.</p>
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <!-- Layout component (grayed out, not editable) -->
                <div
                  class="layout-component-wrapper"
                  data-layout-component-type={layoutComponent.type}
                >
                  <div class="layout-overlay">
                    <span class="layout-badge"
                      >Layout: {getComponentDisplayLabel(layoutComponent, components)}</span
                    >
                  </div>
                  <div class="layout-component-content">
                    <ComponentRenderer
                      component={{
                        ...layoutComponent,
                        page_id: '',
                        created_at: new Date(layoutComponent.created_at).getTime(),
                        updated_at: new Date(layoutComponent.updated_at).getTime()
                      }}
                      {currentBreakpoint}
                      {colorTheme}
                      {siteContext}
                      {user}
                      isEditable={false}
                    />
                  </div>
                </div>
              {/if}
            {/each}
          {:else}
            <!-- Normal mode: render page components directly -->
            {#each componentsWithChildren as component, index (component.id)}
              <div
                class="component-wrapper"
                class:selected={selectedComponent?.id === component.id}
                class:hovered={hoveredComponent?.id === component.id}
                data-component-id={component.id}
                on:click={(e) => handleComponentClick(component, e)}
                on:mouseenter={() => handleComponentMouseEnter(component)}
                on:mouseleave={handleComponentMouseLeave}
                role="button"
                tabindex="0"
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch('selectComponent', component);
                  }
                }}
              >
                {#if showEditControls && (selectedComponent?.id === component.id || hoveredComponent?.id === component.id)}
                  <div class="component-controls">
                    <div class="component-label">
                      {getComponentDisplayLabel(component, components)}
                    </div>
                    <div class="component-actions">
                      {#if mode !== 'primitive'}
                        <button
                          class="btn-control"
                          on:click|stopPropagation={() => moveUp(component)}
                          disabled={index === 0}
                          aria-label="Move up"
                          title="Move up"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          class="btn-control"
                          on:click|stopPropagation={() => moveDown(component)}
                          disabled={index === componentsWithChildren.length - 1}
                          aria-label="Move down"
                          title="Move down"
                        >
                          <MoveDown size={14} />
                        </button>
                      {/if}
                      {#if canDeleteComponents}
                        <button
                          class="btn-control"
                          on:click|stopPropagation={() => dispatch('duplicateComponent', component)}
                          aria-label="Duplicate"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                      {/if}
                      {#if canDeleteComponents && !(mode === 'layout' && component.type === 'yield')}
                        <button
                          class="btn-control btn-danger"
                          on:click|stopPropagation={() => dispatch('deleteComponent', component.id)}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      {/if}
                    </div>
                  </div>
                {/if}
                <div
                  class="component-content"
                  class:has-controls={showEditControls &&
                    (selectedComponent?.id === component.id ||
                      hoveredComponent?.id === component.id)}
                >
                  <ComponentRenderer
                    {component}
                    {currentBreakpoint}
                    {colorTheme}
                    {siteContext}
                    {user}
                    onUpdate={(newConfig) => handleComponentConfigUpdate(component, newConfig)}
                    isEditable={isContentEditable}
                    onSelectComponent={handleSelectChildComponent}
                  />
                </div>
              </div>
            {/each}

            {#if pageComponents.length === 0}
              <div class="empty-canvas">
                {#if mode === 'component'}
                  <div class="empty-icon">📦</div>
                  <h3>Create Your Component</h3>
                  <p>
                    Choose a component type from the sidebar to start building your reusable
                    component.
                  </p>
                  <div class="empty-hints">
                    <p class="hint">💡 <strong>Tip:</strong> Popular components include:</p>
                    <ul class="hint-list">
                      <li><strong>Navigation Bar</strong> - Site header with logo and menu</li>
                      <li><strong>Footer</strong> - Site footer with links and info</li>
                      <li><strong>Hero</strong> - Large banner section</li>
                      <li><strong>Features</strong> - Showcase product features</li>
                    </ul>
                  </div>
                {:else if mode === 'layout'}
                  <div class="empty-icon">🎨</div>
                  <h3>Build Your Layout</h3>
                  <p>Add components from the sidebar to create your layout structure.</p>
                  <p class="hint">
                    💡 <strong>Tip:</strong> Use the <strong>Yield</strong> component to define where
                    page content should appear.
                  </p>
                {:else}
                  <div class="empty-icon">📄</div>
                  <h3>Start Building</h3>
                  <p>Add components from the sidebar to get started.</p>
                {/if}
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Scale indicator when viewing larger breakpoints on mobile -->
      {#if needsScaling}
        <div class="scale-indicator">
          <span class="scale-label">
            {currentBreakpoint === 'desktop' ? '💻' : '📱'}
            {Math.round(viewportScale * 100)}% scale
          </span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Mobile Edit Mode Toggle FAB -->
  {#if isMobileView}
    <button
      class="mobile-edit-toggle"
      class:active={mobileEditMode}
      on:click={toggleMobileEditMode}
      aria-label={mobileEditMode ? 'Switch to preview mode' : 'Switch to edit mode'}
      title={mobileEditMode ? 'Preview mode (hide controls)' : 'Edit mode (show controls)'}
    >
      {#if mobileEditMode}
        <Eye size={20} />
        <span class="toggle-label">Preview</span>
      {:else}
        <Pencil size={20} />
        <span class="toggle-label">Edit</span>
      {/if}
    </button>
  {/if}
</div>

<style>
  .builder-canvas {
    flex: 1;
    overflow: hidden; /* No scrollbars on outer container */
    background: var(--color-bg-secondary);
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 0; /* Critical for flex scrolling */
  }

  /* Fit-content mode: allow outer container to scroll if needed (component/primitive editing) */
  .builder-canvas.fit-content-mode {
    overflow: auto;
    align-items: flex-start; /* Keep aligned to top to prevent clipping */
  }

  /* Viewport wrapper for scaling on mobile */
  .canvas-viewport-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 100%;
  }

  /* Scaled viewport wrapper - transforms the viewport to fit on mobile */
  .canvas-viewport-wrapper.scaled {
    transform: scale(var(--viewport-scale, 1));
    transform-origin: top left;
    /* Adjust container to account for scaling */
    width: calc(100% / var(--viewport-scale, 1));
    margin-bottom: calc((var(--viewport-scale, 1) - 1) * -50%);
  }

  .canvas-viewport {
    background: var(--color-bg-primary, white);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow-y: auto; /* Vertical scrolling for content */
    overflow-x: hidden; /* Hide horizontal overflow - content should fit */
    transition: width 0.3s ease;
    margin: 0 auto;
    /* Use flex layout to fill available height properly */
    height: 100%;
    max-height: calc(100vh - 140px); /* Leave room for toolbar and padding */
    flex-shrink: 1; /* Allow shrinking if needed */
  }

  /* Scaled viewport removes max-width constraint to show actual size */
  .canvas-viewport.scaled-viewport {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  /* Component/Primitive/Layout mode: scale to fit content, no scrollbars */
  .canvas-viewport.fit-content {
    overflow: visible; /* No scrollbars - content scales to fit */
    height: auto; /* Let content determine height */
    max-height: none; /* Remove height constraint */
    flex-shrink: 0; /* Don't shrink - let it grow to fit content */
  }

  /* Scale indicator for mobile zoomed-out view */
  .scale-indicator {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    z-index: 50;
    pointer-events: none;
  }

  .scale-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* Style the scrollbar to be more visible */
  .canvas-viewport::-webkit-scrollbar {
    width: 8px;
  }

  .canvas-viewport::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary, #e5e7eb);
    border-radius: 4px;
  }

  .canvas-viewport::-webkit-scrollbar-thumb {
    background: var(--color-text-secondary, #9ca3af);
    border-radius: 4px;
  }

  .canvas-viewport::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-primary, #6b7280);
  }

  .canvas-content {
    position: relative;
    /* Theme styles applied via inline styles */
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    min-height: 400px;
    width: 100%; /* Ensure content fills container width */
    overflow: hidden; /* Prevent horizontal overflow */
    overflow-wrap: break-word; /* Allow text to wrap */
    word-wrap: break-word; /* Legacy support */
  }

  /* Fit-content mode: reduce min-height for component/primitive/layout editing */
  .fit-content > .canvas-content {
    min-height: auto !important; /* Let content determine height */
    padding: 0; /* Remove padding to fit content exactly */
  }

  .fit-content > .canvas-content > .empty-canvas {
    min-height: 200px; /* Smaller empty state for component/primitive/layout mode */
    padding: 1.5rem 1rem;
  }

  /* Force all direct children and component content to respect viewport width */
  .canvas-content > *,
  .canvas-content :global(.component-content),
  .canvas-content :global(.container-drop-zone),
  .canvas-content :global(.navbar-container-based) {
    max-width: 100%;
    box-sizing: border-box;
  }

  /* Ensure flex containers and their children can shrink to fit viewport */
  .canvas-content :global(.container-drop-zone.flex-layout) {
    min-width: 0; /* Allow flex container to shrink below content size */
  }

  /* Allow general containers to wrap when needed, but NOT navbar containers */
  .canvas-content :global(.container-drop-zone.flex-layout:not([data-drop-zone-id^='navbar'])) {
    flex-wrap: wrap; /* Allow items to wrap in preview for content containers */
  }

  /* Navbar containers should respect their inline flex-wrap setting (usually nowrap) */
  .canvas-content :global(.navbar-container-based .container-drop-zone.flex-layout),
  .canvas-content :global(.navbar-container-based .container-drop-zone.flex-row) {
    flex-wrap: nowrap; /* Navbar items should stay in a row */
  }

  /* Ensure child components within containers can shrink */
  .canvas-content :global(.child-component) {
    min-width: 0; /* Allow flex items to shrink */
    flex-shrink: 1; /* Allow shrinking */
  }

  /* Ensure text within child components can wrap */
  .canvas-content :global(.child-component a),
  .canvas-content :global(.child-component span),
  .canvas-content :global(.child-component button) {
    white-space: normal; /* Allow text to wrap if needed */
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .component-wrapper {
    position: relative;
    transition: all 0.2s;
  }

  .component-wrapper.hovered {
    outline: 2px dashed #3b82f6;
    outline-offset: 2px;
  }

  .component-wrapper.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Editor controls use fixed colors to avoid being affected by theme preview */
  .component-controls {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    z-index: 10;
    gap: 0.5rem;
  }

  .component-label {
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .component-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-control {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-control:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .btn-control:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-control.btn-danger:hover:not(:disabled) {
    background: #ef4444;
  }

  .component-content {
    position: relative;
  }

  .component-content.has-controls {
    padding-top: 32px;
  }

  .empty-canvas {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 3rem 2rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-canvas .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-canvas h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
  }

  .empty-canvas > p {
    font-size: 1rem;
    max-width: 500px;
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  .empty-hints {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--color-border-secondary);
    max-width: 450px;
  }

  .empty-hints .hint {
    margin: 0 0 1rem 0;
    font-size: 0.9375rem;
    color: var(--color-text-primary);
  }

  .hint-list {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
  }

  .hint-list li {
    padding: 0.5rem 0;
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .hint-list li strong {
    color: var(--color-text-primary);
  }

  /* Mobile responsive styles */
  @media (max-width: 767px) {
    .builder-canvas {
      padding: 0.5rem;
      padding-left: 0;
      padding-right: 0;
      overflow: auto; /* Enable scrolling on mobile */
      -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
      position: relative; /* For scale indicator positioning */
    }

    /* Viewport wrapper on mobile - ensure proper centering */
    .canvas-viewport-wrapper {
      padding: 0;
      margin: 0;
    }

    /* When viewing mobile breakpoint on mobile - full width */
    .canvas-viewport:not(.scaled-viewport) {
      border-radius: 0;
      box-shadow: none;
      max-height: none; /* Allow full height on mobile */
      width: 100% !important; /* Override breakpoint width on mobile */
      margin: 0;
    }

    /* When viewing scaled (tablet/desktop) on mobile - keep original width */
    .canvas-viewport.scaled-viewport {
      border-radius: 6px;
      max-height: none;
      margin: 0 auto;
      /* Width set by inline style to show actual breakpoint width */
    }

    .canvas-content {
      min-height: auto;
    }

    /* Mobile component controls - compact and touch-friendly */
    .component-controls {
      padding: 0.25rem 0.5rem;
      gap: 0.25rem;
      min-height: 36px;
      font-size: 0.6875rem;
    }

    /* Component label - truncate with ellipsis on mobile */
    .component-label {
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Compact action buttons on mobile */
    .component-actions {
      gap: 0.125rem;
      flex-shrink: 0;
    }

    .btn-control {
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
    }

    /* Ensure content has space for controls on mobile */
    .component-content.has-controls {
      padding-top: 36px;
    }

    .empty-canvas {
      min-height: 250px;
      padding: 1.5rem 1rem;
    }

    .empty-canvas h3 {
      font-size: 1.25rem;
    }

    .empty-canvas > p {
      font-size: 0.875rem;
    }

    .empty-hints {
      padding: 1rem;
      margin-top: 1.5rem;
    }

    /* Viewport wrapper on mobile needs overflow visible for scaling */
    .canvas-viewport-wrapper.scaled {
      overflow: visible;
    }
  }

  /* Theme Debug Indicator - Collapsible floating panel at bottom right */
  .theme-debug-indicator {
    position: fixed;
    bottom: 1rem;
    right: 5rem; /* Position to the left of BuildInfo panel */
    z-index: 9998; /* Just below BuildInfo (9999) */
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  }

  /* Collapsed toggle button */
  .theme-debug-toggle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.3s ease;
    padding: 0;
  }

  .theme-debug-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
  }

  .theme-debug-toggle:active {
    transform: scale(1.05);
  }

  .theme-debug-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    opacity: 0.5;
    animation: themeDebugPulse 2s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes themeDebugPulse {
    0%,
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.5;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.3);
      opacity: 0;
    }
  }

  /* Expanded panel */
  .theme-debug-panel {
    background: rgba(24, 24, 27, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    min-width: 240px;
    max-width: 280px;
    overflow: hidden;
    backdrop-filter: blur(12px);
  }

  .theme-debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .theme-debug-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #a78bfa;
  }

  .theme-debug-title strong {
    font-size: 11px;
    font-weight: 600;
    color: #e4e4e7;
    letter-spacing: 0.3px;
  }

  .theme-debug-collapse {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #a1a1aa;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-debug-collapse:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #e4e4e7;
  }

  .theme-debug-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .theme-debug-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .theme-debug-label {
    font-size: 10px;
    font-weight: 500;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .theme-debug-value {
    font-size: 12px;
    font-weight: 600;
    color: #e4e4e7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-debug-colors {
    padding: 8px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .theme-debug-colors .color-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .color-row .color-label {
    font-size: 9px;
    font-weight: 500;
    color: #71717a;
    width: 50px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .color-row .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .color-row .color-hex {
    font-size: 8px;
    font-weight: 500;
    color: #a1a1aa;
    font-family: 'Monaco', 'Menlo', monospace;
    display: none; /* Hide hex on desktop for compact view */
  }

  .btn-reset-theme {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-reset-theme:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.5);
    color: #fecaca;
  }

  .btn-reset-theme:active {
    transform: scale(0.98);
  }

  /* Mobile responsive styles for theme debug indicator */
  @media (max-width: 768px) {
    .theme-debug-indicator {
      bottom: 0.75rem;
      right: 3.5rem; /* Adjust for mobile BuildInfo */
    }

    .theme-debug-toggle {
      width: 40px;
      height: 40px;
    }

    .theme-debug-panel {
      min-width: 240px;
      max-width: calc(100vw - 4rem);
      max-height: calc(100vh - 6rem);
      overflow-y: auto;
    }

    .theme-debug-header {
      padding: 8px 10px;
    }

    .theme-debug-content {
      padding: 10px;
      gap: 8px;
    }

    .theme-debug-colors {
      padding: 6px;
      max-height: 160px;
    }

    .theme-debug-colors .color-grid {
      grid-template-columns: 1fr; /* Single column on mobile */
    }

    .color-row .color-swatch {
      width: 14px;
      height: 14px;
    }

    .color-row .color-label {
      width: 60px;
    }

    .btn-reset-theme {
      padding: 8px 10px;
    }
  }

  /* Extra small screens */
  @media (max-width: 375px) {
    .theme-debug-indicator {
      bottom: 0.5rem;
      right: 0.5rem;
    }

    .theme-debug-toggle {
      width: 36px;
      height: 36px;
    }

    .theme-debug-panel {
      min-width: 180px;
    }

    .theme-debug-title strong {
      font-size: 10px;
    }

    .theme-debug-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
  }

  /* Layout component styles for page mode */
  .layout-component-wrapper {
    position: relative;
    pointer-events: none;
    user-select: none;
  }

  .layout-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(128, 128, 128, 0.15);
    z-index: 5;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 0.5rem;
  }

  .layout-badge {
    background: rgba(100, 100, 100, 0.9);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: capitalize;
    pointer-events: auto;
  }

  .layout-component-content {
    opacity: 0.7;
    filter: grayscale(30%);
  }

  /* Yield area styles */
  .layout-yield-area {
    position: relative;
    min-height: 200px;
    border: 2px dashed var(--color-primary, #3b82f6);
    border-radius: 8px;
    margin: 1rem;
    background: var(--color-bg-primary, white);
  }

  .yield-label {
    position: absolute;
    top: -12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-primary, #3b82f6);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 4px;
    z-index: 10;
  }

  .yield-icon {
    font-size: 0.875rem;
  }

  .yield-content {
    padding: 1.5rem 1rem;
  }

  /* Mobile Edit Mode Toggle FAB */
  .mobile-edit-toggle {
    position: fixed;
    bottom: 5rem;
    right: 1rem;
    z-index: 9997;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
    transition: all 0.2s ease;
    touch-action: manipulation;
  }

  .mobile-edit-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
  }

  .mobile-edit-toggle:active {
    transform: translateY(0);
    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.4);
  }

  /* Active state: Edit mode is ON, showing Preview button */
  .mobile-edit-toggle.active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
  }

  .mobile-edit-toggle.active:hover {
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
  }

  .toggle-label {
    white-space: nowrap;
  }

  /* Hide toggle on desktop - only show on mobile */
  @media (min-width: 768px) {
    .mobile-edit-toggle {
      display: none;
    }
  }

  /* Adjust position for smaller screens */
  @media (max-width: 375px) {
    .mobile-edit-toggle {
      bottom: 4rem;
      right: 0.75rem;
      padding: 0.625rem 0.875rem;
      font-size: 0.8125rem;
    }
  }

  /* ==================== Mobile Tree View Styles ==================== */
  .mobile-tree-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary, white);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin: 0.5rem;
    max-height: calc(100vh - 180px);
  }

  .tree-view-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .tree-item-count {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.8;
    font-weight: 400;
  }

  .tree-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--color-text-secondary, #6b7280);
  }

  .tree-empty-state .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .tree-empty-state p {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }

  .tree-empty-state .hint {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-top: 0.5rem;
  }

  .tree-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    transition: background 0.2s ease;
  }

  .tree-list.drag-active {
    background: rgba(59, 130, 246, 0.03);
    border-radius: 8px;
  }

  .tree-node {
    margin-bottom: 2px;
    transition: margin 0.15s ease;
  }

  /* Add spacing between items during drag for better drop target visibility */
  .tree-list.drag-active .tree-node {
    margin-bottom: 6px;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 0.5rem;
    background: var(--color-bg-secondary, #f9fafb);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    touch-action: manipulation;
    user-select: none;
  }

  .tree-item:hover {
    background: var(--color-bg-tertiary, #f3f4f6);
    border-color: var(--color-primary, #3b82f6);
  }

  .tree-item.selected {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .tree-item.dragging {
    opacity: 0.4;
    transform: scale(0.95);
    background: var(--color-bg-tertiary, #e5e7eb);
  }

  /* Drop indicator line - appears before or after the item */
  .tree-item.drag-over-before,
  .tree-item.drag-over-after {
    position: relative;
  }

  .tree-item.drag-over-before::before,
  .tree-item.drag-over-after::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 2px;
    z-index: 10;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    animation: dropIndicatorPulse 1s ease-in-out infinite;
  }

  .tree-item.drag-over-before::before {
    top: -6px;
  }

  .tree-item.drag-over-after::after {
    bottom: -6px;
  }

  /* Circle indicator at start of line */
  .tree-item.drag-over-before::after,
  .tree-item.drag-over-after::before {
    content: '';
    position: absolute;
    left: -4px;
    width: 10px;
    height: 10px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    z-index: 11;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .tree-item.drag-over-before::after {
    top: -10px;
  }

  .tree-item.drag-over-after::before {
    bottom: -10px;
  }

  @keyframes dropIndicatorPulse {
    0%,
    100% {
      opacity: 1;
      transform: scaleX(1);
    }
    50% {
      opacity: 0.8;
      transform: scaleX(0.98);
    }
  }

  /* Add spacing to make room for the indicator */
  .tree-item.drag-over-before {
    margin-top: 10px;
  }

  .tree-item.drag-over-after {
    margin-bottom: 10px;
  }

  .tree-item.drag-over-inside {
    background: rgba(59, 130, 246, 0.2);
    border: 2px dashed #3b82f6;
    box-shadow: inset 0 0 12px rgba(59, 130, 246, 0.15);
  }

  .tree-item-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-text-secondary, #9ca3af);
    cursor: grab;
    flex-shrink: 0;
    border-radius: 4px;
    transition: all 0.15s ease;
    touch-action: none; /* Important: allows touch drag without browser interference */
    -webkit-touch-callout: none;
  }

  .tree-item-drag-handle:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text-primary, #374151);
  }

  .tree-item-drag-handle:active {
    cursor: grabbing;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .tree-item-expand {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-text-secondary, #9ca3af);
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .tree-item-expand:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text-primary, #374151);
  }

  .tree-item-expand-placeholder {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .tree-item-label {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary, #374151);
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .tree-item-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .tree-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: white;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 4px;
    color: var(--color-text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tree-action-btn:hover:not(:disabled) {
    background: var(--color-bg-tertiary, #f3f4f6);
    color: var(--color-text-primary, #374151);
    border-color: var(--color-text-secondary, #9ca3af);
  }

  .tree-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tree-action-btn.delete:hover:not(:disabled) {
    background: #fef2f2;
    color: #ef4444;
    border-color: #fecaca;
  }

  .tree-children {
    margin-left: 1.5rem;
    margin-top: 2px;
    padding-left: 0.75rem;
    border-left: 2px solid var(--color-border, #e5e7eb);
  }

  /* Adjust tree view for very small screens */
  @media (max-width: 375px) {
    .mobile-tree-view {
      margin: 0.25rem;
    }

    .tree-view-header {
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
    }

    .tree-item {
      padding: 0.5rem 0.375rem;
    }

    .tree-item-label {
      font-size: 0.8125rem;
    }

    .tree-action-btn {
      width: 28px;
      height: 28px;
    }

    .tree-item-drag-handle {
      width: 24px;
      height: 24px;
    }

    .tree-children {
      margin-left: 1rem;
      padding-left: 0.5rem;
    }
  }
</style>
