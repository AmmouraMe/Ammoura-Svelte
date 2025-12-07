<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type {
    Page,
    PageComponent,
    LayoutComponent,
    RevisionNode,
    ParsedPageRevision,
    ColorThemeDefinition,
    Layout,
    Component
  } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import BuilderToolbar from './BuilderToolbar.svelte';
  import BuilderCanvas from './BuilderCanvas.svelte';
  import BuilderSidebar from './BuilderSidebar.svelte';
  import BuilderPropertiesPanel from './BuilderPropertiesPanel.svelte';
  import BuilderAIPanel from './BuilderAIPanel.svelte';
  import RevisionModal from '../admin/RevisionModal.svelte';
  import ThemePalette from './ThemePalette.svelte';
  import { themeStore } from '$lib/stores/theme';
  import { builderContextStore } from '$lib/stores/builderContext';

  type BuilderMode = 'page' | 'layout' | 'component' | 'primitive';

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
    layout_id?: number;
  }

  export let mode: BuilderMode = 'page';
  export let page: Page | null;
  export let initialComponents: PageComponent[] = [];
  export let layoutComponents: LayoutComponent[] = []; // Layout components to show grayed out in page mode
  export let revisions: RevisionNode[] = [];
  export let currentRevisionId: string | null = null;
  export let currentRevisionIsPublished = false;
  export let colorThemes: ColorThemeDefinition[] = [];
  export let layouts: Layout[] = [];
  export let defaultLayoutId: number | null = null;
  export let components: Component[] = [];
  // Current component ID (for component mode) - used to prevent adding a component to itself
  export let currentComponentId: number | null = null;
  // Site context for template variable substitution in preview
  export let siteContext: SiteContext | undefined = undefined;
  // User context for template variable substitution in preview
  export let user: UserInfo | null | undefined = undefined;

  // Track if we're currently viewing a published revision (can change after saves)
  let isViewingPublishedRevision = currentRevisionIsPublished;
  export let userName: string | undefined = undefined;
  export let onSave: (data: SaveData) => Promise<void>;
  export let onPublish: (data: SaveData) => Promise<void>;
  export let onExit: () => void;

  // Entity labels based on mode
  $: entityLabel =
    mode === 'page'
      ? 'Page'
      : mode === 'layout'
        ? 'Layout'
        : mode === 'primitive'
          ? 'Primitive'
          : 'Component';

  // Primitive mode restrictions
  $: isPrimitiveMode = mode === 'primitive';
  $: canAddComponents = !isPrimitiveMode; // Primitives have fixed structure
  $: canDeleteComponents = !isPrimitiveMode; // Never delete widgets in primitive mode
  $: entityLabelLower = entityLabel.toLowerCase();

  // Core state
  let title = page?.title || `Untitled ${entityLabel}`;
  let slug = page?.slug || `/${entityLabelLower}-${Date.now()}`;
  let layoutId: number | null = page?.layout_id || defaultLayoutId;
  let pageComponents: PageComponent[] = JSON.parse(JSON.stringify(initialComponents));
  let selectedComponent: PageComponent | null = null;
  let hoveredComponent: PageComponent | null = null;

  // Canvas component reference for scrolling
  let canvasComponent: BuilderCanvas;

  // Page properties (custom styles for the entire page)
  let pageProperties = {
    backgroundColor: 'theme:background',
    backgroundImage: '',
    minHeight: '100vh'
  };

  // Calculate the user's currently active system theme ID based on their light/dark mode
  $: userCurrentThemeId = (() => {
    const fallback = colorThemes.length > 0 ? colorThemes[0].id : 'system-light';
    if (!browser) return fallback;

    // Get the actual applied theme (light or dark)
    const actualTheme =
      $themeStore === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : $themeStore;

    // Find the corresponding color theme for that mode
    const modeThemes = colorThemes.filter((t) => t.mode === actualTheme);
    if (modeThemes.length === 0) return fallback;

    // Prefer system themes, then default, then first available
    const systemTheme = modeThemes.find((t) => t.id.startsWith('system-'));
    if (systemTheme) return systemTheme.id;

    const defaultTheme = modeThemes.find((t) => t.isDefault);
    if (defaultTheme) return defaultTheme.id;

    return modeThemes[0].id;
  })();

  // Initialize with user's current theme, then set activeColorTheme to page's saved theme
  let colorTheme: string = '';
  let activeColorTheme: string = '';

  // Initialize colorTheme and activeColorTheme to user's current theme
  // This ensures the preview shows what the user is actually seeing
  $: if (!initialized && userCurrentThemeId && browser) {
    // Set colorTheme to user's current theme, activeColorTheme to page's saved theme
    colorTheme = userCurrentThemeId;
    activeColorTheme = page?.colorTheme || userCurrentThemeId;
  }

  // Track initialization to only load components once at mount
  let initialized = false;

  // UI state
  let showLeftSidebar = true;
  let showPropertiesPanel = false;
  let showAIPanel = false;
  let showRevisionModal = false;
  let showThemePalette = false;
  let currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // History state
  interface HistoryEntry {
    title: string;
    slug: string;
    components: PageComponent[];
    timestamp: number;
  }
  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // Auto-save state
  let hasUnsavedChanges = false;
  let isSaving = false;
  let lastSavedAt: Date | null = null;
  let lastSavedState: { title: string; slug: string; components: PageComponent[] } | null = null;

  // Add to history when state changes
  function addToHistory() {
    const state: HistoryEntry = {
      title,
      slug,
      components: JSON.parse(JSON.stringify(pageComponents)),
      timestamp: Date.now()
    };

    // Remove any future history if we're not at the end
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }

    history.push(state);
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
    historyIndex = history.length - 1;
    hasUnsavedChanges = true;
  }

  // Undo/Redo
  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const state = history[historyIndex];
      title = state.title;
      slug = state.slug;
      pageComponents = JSON.parse(JSON.stringify(state.components));
      hasUnsavedChanges = true;
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const state = history[historyIndex];
      title = state.title;
      slug = state.slug;
      pageComponents = JSON.parse(JSON.stringify(state.components));
      hasUnsavedChanges = true;
    }
  }

  // Component operations
  function handleAddComponent(component: PageComponent) {
    pageComponents = [...pageComponents, component];
    addToHistory();

    // Scroll to the newly added component
    if (canvasComponent) {
      canvasComponent.scrollToComponent(component.id);
    }
  }

  /**
   * Recursively extract all children from a component's config.children into a flat array.
   * This is needed to sync the nested config.children structure back to the flat pageComponents array.
   */
  function extractNestedChildren(component: PageComponent, parentId: string): PageComponent[] {
    const result: PageComponent[] = [];
    const children = component.config?.children as PageComponent[] | undefined;

    if (!children || !Array.isArray(children)) {
      return result;
    }

    for (const child of children) {
      // Add the child with its parent_id set correctly
      const childWithParent: PageComponent = {
        ...child,
        parent_id: parentId
      };
      result.push(childWithParent);

      // Recursively extract nested children
      const nestedChildren = extractNestedChildren(child, child.id);
      result.push(...nestedChildren);
    }

    return result;
  }

  function handleUpdateComponent(updatedComponent: PageComponent) {
    // Extract all nested children from the updated component
    const nestedChildren = extractNestedChildren(updatedComponent, updatedComponent.id);

    // Create a set of all child IDs that should exist after this update
    const validChildIds = new Set(nestedChildren.map((c) => c.id));
    validChildIds.add(updatedComponent.id); // The component itself is valid

    // Create a map of all updates (the component itself + all its nested children)
    const updateMap = new Map<string, PageComponent>();

    // Add the root component (without config.children since those are stored separately)
    const rootComponentForStorage = {
      ...updatedComponent,
      config: {
        ...updatedComponent.config
        // Keep children in config for components that render with them (navbar, container)
        // The children field is the source of truth for nested structure
      }
    };
    updateMap.set(updatedComponent.id, rootComponentForStorage);

    // Add all nested children
    for (const child of nestedChildren) {
      updateMap.set(child.id, child);
    }

    // Find all components that were children of this component (directly or nested)
    // These are components whose parent_id chain leads back to updatedComponent.id
    function isDescendantOf(comp: PageComponent, ancestorId: string): boolean {
      if (!comp.parent_id) return false;
      if (comp.parent_id === ancestorId) return true;
      const parent = pageComponents.find((c) => c.id === comp.parent_id);
      return parent ? isDescendantOf(parent, ancestorId) : false;
    }

    // Update pageComponents:
    // 1. Update existing components that are in updateMap
    // 2. Remove components that were descendants but are no longer in validChildIds
    let updatedPageComponents = pageComponents
      .filter((c) => {
        // Keep the component if:
        // 1. It's not a descendant of the updated component, OR
        // 2. It's still in the valid children list
        if (!isDescendantOf(c, updatedComponent.id)) {
          return true;
        }
        return validChildIds.has(c.id);
      })
      .map((c) => (updateMap.has(c.id) ? updateMap.get(c.id)! : c));

    // Add any NEW children that don't exist in pageComponents yet
    const existingIds = new Set(updatedPageComponents.map((c) => c.id));
    const newChildren = nestedChildren.filter((c) => !existingIds.has(c.id));
    if (newChildren.length > 0) {
      updatedPageComponents = [...updatedPageComponents, ...newChildren];
    }

    pageComponents = updatedPageComponents;

    // Update selectedComponent to keep it in sync
    if (selectedComponent?.id === updatedComponent.id) {
      selectedComponent = updatedComponent;
    } else if (selectedComponent && updateMap.has(selectedComponent.id)) {
      selectedComponent = updateMap.get(selectedComponent.id)!;
    }
    addToHistory();
  }

  function handleBatchUpdateComponents(updatedComponents: PageComponent[]) {
    // Create a map for faster lookup
    const updateMap = new Map(updatedComponents.map((c) => [c.id, c]));

    // Update pageComponents array - this creates a new array reference
    pageComponents = pageComponents.map((c) => updateMap.get(c.id) || c);

    // CRITICAL FIX: Normalize positions to ensure they're sequential (0, 1, 2, ...)
    // This fixes the bug where duplicate positions prevent proper reordering
    const sortedComponents = [...pageComponents].sort((a, b) => {
      // Sort by position first
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // If positions are equal (duplicates), maintain stable order by comparing IDs
      // This ensures deterministic ordering even with duplicate positions
      return a.id.localeCompare(b.id);
    });

    // Reassign sequential positions
    pageComponents = sortedComponents.map((c, index) => ({
      ...c,
      position: index
    }));

    // Update selectedComponent if it was updated
    if (selectedComponent) {
      const updatedSelected = pageComponents.find((c) => c.id === selectedComponent!.id);
      if (updatedSelected) {
        selectedComponent = updatedSelected;
      }
    }

    // Only add to history once for the batch
    addToHistory();
  }

  function handleDeleteComponent(componentId: string) {
    // Prevent deletion of Yield component in layout mode
    const componentToDelete = pageComponents.find((c) => c.id === componentId);
    if (mode === 'layout' && componentToDelete?.type === 'yield') {
      return; // Silently ignore deletion attempts
    }

    pageComponents = pageComponents.filter((c) => c.id !== componentId);
    if (selectedComponent?.id === componentId) {
      selectedComponent = null;
    }
    addToHistory();
  }

  function handleSelectComponent(component: PageComponent | null) {
    selectedComponent = component;
    if (component) {
      showPropertiesPanel = true;
    }
  }

  function handleShowPageProperties() {
    showPropertiesPanel = true;
    selectedComponent = null;
  }

  function handleUpdatePageProperties(properties: typeof pageProperties) {
    pageProperties = properties;
    addToHistory();
  }

  function handleDuplicateComponent(component: PageComponent) {
    const duplicate = {
      ...JSON.parse(JSON.stringify(component)),
      id: `temp-${Date.now()}`,
      position: component.position + 1
    };
    pageComponents = [...pageComponents, duplicate];
    addToHistory();
  }

  // Save operations
  async function handleSaveClick() {
    isSaving = true;
    try {
      await onSave({
        id: page?.id,
        title,
        slug,
        components: pageComponents,
        layout_id: layoutId || undefined
      });
      // Capture the saved state for future comparison
      lastSavedState = {
        title,
        slug,
        components: JSON.parse(JSON.stringify(pageComponents))
      };
      hasUnsavedChanges = false;
      lastSavedAt = new Date();
      // After saving a draft, we're no longer viewing a published revision
      isViewingPublishedRevision = false;
    } finally {
      isSaving = false;
    }
  }

  async function handlePublishClick() {
    console.log('[AdvancedBuilder] handlePublishClick called', {
      pageId: page?.id,
      title,
      componentsCount: pageComponents.length,
      canPublish,
      hasActualChanges,
      isViewingPublishedRevision
    });

    isSaving = true;
    try {
      // For new pages (no id), skip the draft save and go straight to publish
      // The onPublish handler will create the page directly as published
      if (page?.id) {
        await onSave({
          id: page?.id,
          title,
          slug,
          components: pageComponents,
          layout_id: layoutId || undefined
        });
      }
      await onPublish({
        id: page?.id,
        title,
        slug,
        components: pageComponents,
        layout_id: layoutId || undefined
      });
      // After publishing, we're now viewing a published revision
      isViewingPublishedRevision = true;
      // Update lastSavedState to reflect the published content
      lastSavedState = {
        title,
        slug,
        components: JSON.parse(JSON.stringify(pageComponents))
      };
      hasUnsavedChanges = false;
      lastSavedAt = new Date();
    } finally {
      isSaving = false;
    }
  }

  function handleUpdateLayout(newLayoutId: number) {
    layoutId = newLayoutId;
    hasUnsavedChanges = true;
  }

  function handleExitClick() {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
        onExit();
      }
    } else {
      onExit();
    }
  }

  function handleThemePreview(themeId: string) {
    colorTheme = themeId;
  }

  function handleThemeConfirm(themeId: string) {
    activeColorTheme = themeId;
    colorTheme = themeId;
    hasUnsavedChanges = true;
  }

  function handleResetTheme() {
    activeColorTheme = userCurrentThemeId;
    colorTheme = userCurrentThemeId;
    hasUnsavedChanges = true;
  }

  // Revision handlers
  function handleViewHistory() {
    showRevisionModal = true;
  }

  async function handleRevisionSelect(revisionId: string) {
    if (!page?.id) return;

    try {
      const response = await fetch(`/api/pages/${page.id}/revisions/${revisionId}`);
      if (!response.ok) throw new Error('Failed to load revision');

      const revision = (await response.json()) as ParsedPageRevision;

      // Load revision data into editor
      title = revision.title;
      slug = revision.slug;
      pageComponents = revision.components;

      // Update whether we're viewing a published revision
      isViewingPublishedRevision = revision.is_published;

      // Set lastSavedState to match the loaded revision
      // This treats the loaded revision as the "saved" state
      lastSavedState = {
        title: revision.title,
        slug: revision.slug,
        components: JSON.parse(JSON.stringify(revision.components))
      };

      addToHistory();
      hasUnsavedChanges = false;
      lastSavedAt = new Date(revision.created_at);
    } catch (_error) {
      alert('Failed to load revision');
    }
  }

  async function handleRevisionPublish(revisionId: string) {
    if (!page?.id) return;

    try {
      const response = await fetch(`/api/pages/${page.id}/revisions/${revisionId}/publish`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to publish revision');

      // Update current revision ID
      currentRevisionId = revisionId;

      // Reload the page to get updated revisions
      window.location.reload();
    } catch (_error) {
      alert('Failed to publish revision');
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z') {
        event.preventDefault();
        undo();
      } else if (event.key === 'y' || (event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        redo();
      } else if (event.key === 's') {
        event.preventDefault();
        handleSaveClick();
      } else if (event.key === 'h' && revisions.length > 0) {
        event.preventDefault();
        handleViewHistory();
      }
    } else if (event.key === 'Delete' && selectedComponent) {
      event.preventDefault();
      // Don't delete Yield component in layout mode
      if (!(mode === 'layout' && selectedComponent.type === 'yield')) {
        handleDeleteComponent(selectedComponent.id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleSelectComponent(null);
    }
  }

  // Compute whether current state differs from last saved state
  $: hasActualChanges = (() => {
    if (!lastSavedState) {
      console.log(
        '[AdvancedBuilder] hasActualChanges: no lastSavedState, returning',
        hasUnsavedChanges
      );
      return hasUnsavedChanges;
    }

    // Compare current state with last saved state
    const currentState = JSON.stringify({ title, slug, components: pageComponents });
    const savedState = JSON.stringify(lastSavedState);
    const changed = currentState !== savedState;

    if (changed) {
      console.log(
        '[AdvancedBuilder] hasActualChanges: true - current components:',
        pageComponents.length,
        'saved components:',
        lastSavedState.components.length
      );
    }

    return changed;
  })();

  // Compute whether publish button should be enabled
  // For component/primitive mode, always allow publishing (they don't have revisions yet)
  // For page/layout mode, only enable if we're NOT currently viewing the published version
  // OR if we've made changes since loading the published version
  $: canPublish =
    mode === 'component' || mode === 'primitive'
      ? true
      : !isViewingPublishedRevision || hasActualChanges;

  // Auto-save
  let autoSaveInterval: ReturnType<typeof setInterval>;
  onMount(() => {
    // Mark as initialized so we don't reload components from props
    initialized = true;

    // Initialize history
    addToHistory();
    hasUnsavedChanges = false;
    // Initialize lastSavedState with the initial state
    lastSavedState = {
      title,
      slug,
      components: JSON.parse(JSON.stringify(pageComponents))
    };

    // Activate builder context store for AI awareness
    builderContextStore.activate(mode, page?.id || null, title, slug, pageComponents, layoutId);

    // Setup auto-save
    autoSaveInterval = setInterval(() => {
      if (hasActualChanges && !isSaving) {
        handleSaveClick();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => {
      clearInterval(autoSaveInterval);
    };
  });

  onDestroy(() => {
    // Deactivate builder context when leaving
    builderContextStore.deactivate();
  });

  // Sync builder context store when state changes
  $: if (initialized) {
    builderContextStore.updateState({
      entityId: page?.id || null,
      entityName: title,
      slug,
      components: pageComponents,
      layoutId
    });
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="advanced-builder">
  <BuilderToolbar
    {mode}
    {title}
    {slug}
    {currentBreakpoint}
    {colorTheme}
    {colorThemes}
    {layoutId}
    {layouts}
    hasUnsavedChanges={hasActualChanges}
    {isSaving}
    {lastSavedAt}
    {userName}
    {canPublish}
    canUndo={historyIndex > 0}
    canRedo={historyIndex < history.length - 1}
    hasRevisions={revisions.length > 0}
    revisionCount={revisions.length}
    on:updateTitle={(e) => {
      title = e.detail;
      addToHistory();
    }}
    on:updateSlug={(e) => {
      slug = e.detail;
      addToHistory();
    }}
    on:updateLayout={(e) => handleUpdateLayout(e.detail)}
    on:changeBreakpoint={(e) => {
      currentBreakpoint = e.detail;
    }}
    on:openThemePalette={() => {
      showThemePalette = true;
    }}
    on:undo={undo}
    on:redo={redo}
    on:save={handleSaveClick}
    on:publish={handlePublishClick}
    on:exit={handleExitClick}
    on:toggleAI={() => {
      showAIPanel = !showAIPanel;
    }}
    on:viewHistory={handleViewHistory}
  />

  <div class="builder-content">
    {#if showLeftSidebar && canAddComponents}
      <BuilderSidebar
        {mode}
        {pageComponents}
        {title}
        {slug}
        {components}
        {currentComponentId}
        on:addComponent={(e) => handleAddComponent(e.detail)}
        on:selectComponent={(e) => handleSelectComponent(e.detail)}
        on:showPageProperties={handleShowPageProperties}
        on:updateTitle={(e) => {
          title = e.detail;
          addToHistory();
        }}
        on:updateSlug={(e) => {
          slug = e.detail;
          addToHistory();
        }}
        on:close={() => {
          showLeftSidebar = false;
        }}
      />
    {/if}

    <BuilderCanvas
      bind:this={canvasComponent}
      {mode}
      {pageComponents}
      {layoutComponents}
      {selectedComponent}
      {hoveredComponent}
      {currentBreakpoint}
      {colorTheme}
      {userCurrentThemeId}
      {colorThemes}
      {components}
      {canDeleteComponents}
      {siteContext}
      {user}
      on:selectComponent={(e) => handleSelectComponent(e.detail)}
      on:updateComponent={(e) => handleUpdateComponent(e.detail)}
      on:batchUpdateComponents={(e) => handleBatchUpdateComponents(e.detail)}
      on:deleteComponent={(e) => handleDeleteComponent(e.detail)}
      on:duplicateComponent={(e) => handleDuplicateComponent(e.detail)}
      on:hoverComponent={(e) => {
        hoveredComponent = e.detail;
      }}
      on:resetTheme={handleResetTheme}
    />

    {#if showPropertiesPanel}
      <BuilderPropertiesPanel
        {pageComponents}
        {selectedComponent}
        {pageProperties}
        {currentBreakpoint}
        {colorTheme}
        {entityLabel}
        {components}
        on:selectComponent={(e) => handleSelectComponent(e.detail)}
        on:updateComponent={(e) => handleUpdateComponent(e.detail)}
        on:deleteComponent={(e) => handleDeleteComponent(e.detail)}
        on:updatePageProperties={(e) => handleUpdatePageProperties(e.detail)}
        on:close={() => {
          showPropertiesPanel = false;
          selectedComponent = null;
        }}
      />
    {/if}

    {#if showAIPanel}
      <BuilderAIPanel
        components={pageComponents}
        {title}
        {slug}
        on:applyChanges={(e) => {
          const { components: newComponents, title: newTitle, slug: newSlug } = e.detail;
          if (newComponents) pageComponents = newComponents;
          if (newTitle) title = newTitle;
          if (newSlug) slug = newSlug;
          addToHistory();
        }}
        on:close={() => {
          showAIPanel = false;
        }}
      />
    {/if}
  </div>

  <RevisionModal
    isOpen={showRevisionModal}
    {revisions}
    {currentRevisionId}
    onSelect={handleRevisionSelect}
    onPublish={handleRevisionPublish}
    onClose={() => {
      showRevisionModal = false;
    }}
  />

  <ThemePalette
    {colorThemes}
    currentTheme={colorTheme}
    activeTheme={userCurrentThemeId}
    isOpen={showThemePalette}
    on:previewTheme={(e) => handleThemePreview(e.detail)}
    on:confirmTheme={(e) => handleThemeConfirm(e.detail)}
    on:resetTheme={handleResetTheme}
    on:close={() => {
      showThemePalette = false;
      // Update preview to match active theme when palette closes
      colorTheme = activeColorTheme;
    }}
  />
</div>

<style>
  .advanced-builder {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .builder-content {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .builder-content {
      flex-direction: column;
    }
  }
</style>
