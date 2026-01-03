<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { Copy, Trash2, MoveUp, MoveDown, RotateCcw, Palette } from 'lucide-svelte';
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
  <div
    class="canvas-viewport"
    class:fit-content={mode === 'component' || mode === 'primitive' || mode === 'layout'}
    style="width: {canvasWidth}; max-width: 100%; background-color: {themeColors.background};"
  >
    <div
      class="canvas-content"
      style="{themeStyles}; {componentThemeOverrides}; {pagePropertiesStyle}"
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
                    {#if selectedComponent?.id === component.id || hoveredComponent?.id === component.id}
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
                      class:has-controls={selectedComponent?.id === component.id ||
                        hoveredComponent?.id === component.id}
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
                    <div class="empty-icon">📄</div>
                    <h3>Add Page Content</h3>
                    <p>Add components from the sidebar to build your page content.</p>
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Layout component (grayed out, not editable) -->
            <div class="layout-component-wrapper" data-layout-component-type={layoutComponent.type}>
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
            {#if selectedComponent?.id === component.id || hoveredComponent?.id === component.id}
              <div class="component-controls">
                <div class="component-label">{getComponentDisplayLabel(component, components)}</div>
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
              class:has-controls={selectedComponent?.id === component.id ||
                hoveredComponent?.id === component.id}
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
                Choose a component type from the sidebar to start building your reusable component.
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
                💡 <strong>Tip:</strong> Use the <strong>Yield</strong> component to define where page
                content should appear.
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

  /* Component/Primitive/Layout mode: scale to fit content, no scrollbars */
  .canvas-viewport.fit-content {
    overflow: visible; /* No scrollbars - content scales to fit */
    height: auto; /* Let content determine height */
    max-height: none; /* Remove height constraint */
    flex-shrink: 0; /* Don't shrink - let it grow to fit content */
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
  }

  .component-label {
    font-weight: 600;
    text-transform: capitalize;
  }

  .component-actions {
    display: flex;
    gap: 0.25rem;
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

  @media (max-width: 768px) {
    .builder-canvas {
      padding: 1rem;
    }

    .canvas-viewport {
      border-radius: 0;
      box-shadow: none;
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
</style>
