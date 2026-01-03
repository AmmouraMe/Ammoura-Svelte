<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { confirmStore } from '$lib/stores/confirm';
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
  import BuilderLeftPanel from './BuilderLeftPanel.svelte';
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
    pageProperties?: {
      backgroundColor?: string;
      backgroundImage?: string;
      minHeight?: string;
      borderColor?: string;
      borderWidth?: string;
      borderStyle?: string;
      borderRadius?: string;
      padding?: string;
      boxShadow?: string;
    };
    currentRevisionId?: string | null;
    hasUnsavedChanges?: boolean;
  }

  /** Result returned by the onSave callback, containing the new revision ID if created */
  interface SaveResult {
    revisionId?: string;
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
  // Whether the component being edited is a built-in (global) component
  // Built-in components cannot have their name changed
  export let isBuiltIn = false;
  // Site context for template variable substitution in preview
  export let siteContext: SiteContext | undefined = undefined;
  // User context for template variable substitution in preview
  export let user: UserInfo | null | undefined = undefined;

  // Track if we're currently viewing a published revision (can change after saves)
  let isViewingPublishedRevision = currentRevisionIsPublished;

  // Track the last known revision ID from props to detect external data refreshes
  let lastKnownRevisionId = currentRevisionId;

  // Track when we internally load/save a revision (vs prop change from parent)
  // This prevents the reactive sync from overwriting our local state
  let internalRevisionLoad = false;

  // Store the internally set revision ID to preserve it across prop changes
  let internalRevisionId: string | null = null;

  // Flag to track if we need to sync components on prop change
  let needsComponentSync = false;

  // Sync state when props change from external data refresh (e.g., after invalidateAll())
  // This handles the case where invalidateAll() is called after publishing/saving
  // Skip if we have an internally set revision ID (e.g., after saving a draft)
  $: if (currentRevisionId !== lastKnownRevisionId) {
    lastKnownRevisionId = currentRevisionId;
    if (!internalRevisionLoad && !internalRevisionId) {
      isViewingPublishedRevision = currentRevisionIsPublished;
    }
    internalRevisionLoad = false; // Reset the flag
    needsComponentSync = true;
  }

  // Computed property for the actual revision ID to use (internal takes priority)
  $: effectiveRevisionId = internalRevisionId || currentRevisionId;

  export let userName: string | undefined = undefined;
  // Initial page/component root properties (background, etc.)
  export let initialPageProperties:
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
  export let onSave: (data: SaveData) => Promise<SaveResult | void>;
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
  // Layout mode: can add/remove/reorder components but cannot edit their content
  $: isContentEditable = mode !== 'layout';
  $: entityLabelLower = entityLabel.toLowerCase();

  // Core state
  let title = page?.title || `Untitled ${entityLabel}`;
  let slug = page?.slug || `/${entityLabelLower}-${Date.now()}`;
  let layoutId: number | null = page?.layout_id || defaultLayoutId;
  let pageComponents: PageComponent[] = JSON.parse(JSON.stringify(initialComponents));
  let selectedComponent: PageComponent | null = null;
  let hoveredComponent: PageComponent | null = null;

  // Sync pageComponents when external data refresh is detected
  // This handles the case where invalidateAll() updates initialComponents
  $: if (needsComponentSync && initialComponents) {
    pageComponents = JSON.parse(JSON.stringify(initialComponents));
    // Also sync title and slug from page prop
    if (page) {
      title = page.title || title;
      slug = page.slug || slug;
    }
    // Reset the lastSavedState to match the new data
    lastSavedState = {
      title,
      slug,
      components: JSON.parse(JSON.stringify(pageComponents)),
      pageProperties: JSON.parse(JSON.stringify(pageProperties))
    };
    hasUnsavedChanges = false;
    needsComponentSync = false;
  }

  // Canvas component reference for scrolling
  let canvasComponent: BuilderCanvas;

  // Default page properties
  const defaultPageProperties = {
    backgroundColor: 'transparent',
    backgroundImage: '',
    minHeight: '100vh',
    borderColor: '',
    borderWidth: '0',
    borderStyle: 'solid',
    borderRadius: '0',
    padding: '',
    boxShadow: ''
  };

  // Page properties (custom styles for the entire page/component root)
  // Use initialPageProperties if provided, with defaults as fallback
  let pageProperties = {
    backgroundColor:
      initialPageProperties?.backgroundColor ?? defaultPageProperties.backgroundColor,
    backgroundImage:
      initialPageProperties?.backgroundImage ?? defaultPageProperties.backgroundImage,
    minHeight: initialPageProperties?.minHeight ?? defaultPageProperties.minHeight,
    borderColor: initialPageProperties?.borderColor ?? defaultPageProperties.borderColor,
    borderWidth: initialPageProperties?.borderWidth ?? defaultPageProperties.borderWidth,
    borderStyle: initialPageProperties?.borderStyle ?? defaultPageProperties.borderStyle,
    borderRadius: initialPageProperties?.borderRadius ?? defaultPageProperties.borderRadius,
    padding: initialPageProperties?.padding ?? defaultPageProperties.padding,
    boxShadow: initialPageProperties?.boxShadow ?? defaultPageProperties.boxShadow
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
  let showAIPanel = false;
  let showRevisionModal = false;
  let showThemePalette = false;
  let currentBreakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // History state
  interface HistoryEntry {
    title: string;
    slug: string;
    components: PageComponent[];
    pageProperties: typeof pageProperties;
    timestamp: number;
  }
  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // Auto-save state
  let hasUnsavedChanges = false;
  let isSaving = false;
  let isPublishing = false; // Flag to prevent save during publish
  let lastSavedAt: Date | null = null;
  let lastSavedState: {
    title: string;
    slug: string;
    components: PageComponent[];
    pageProperties: typeof pageProperties;
  } | null = null;

  // Add to history when state changes
  function addToHistory() {
    const state: HistoryEntry = {
      title,
      slug,
      components: JSON.parse(JSON.stringify(pageComponents)),
      pageProperties: JSON.parse(JSON.stringify(pageProperties)),
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
      pageProperties = JSON.parse(JSON.stringify(state.pageProperties));
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
      pageProperties = JSON.parse(JSON.stringify(state.pageProperties));
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
      // Create a clean config without children (children are represented via parent_id in flat format)
      const { children: _childrenToRemove, ...cleanConfig } = child.config || {};

      // Add the child with its parent_id set correctly and config.children removed
      const childWithParent: PageComponent = {
        ...child,
        parent_id: parentId,
        config: cleanConfig as typeof child.config
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

    // Add the root component WITHOUT config.children (children are stored separately with parent_id)
    // This is critical for undo/redo to work correctly - we store flat format only
    const { children: _childrenToRemove, ...cleanRootConfig } = updatedComponent.config || {};
    const rootComponentForStorage = {
      ...updatedComponent,
      config: cleanRootConfig as typeof updatedComponent.config
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
    // The left panel will auto-switch to properties tab when component is selected
  }

  function handleShowPageProperties() {
    // Deselect component to show page properties in the left panel
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
    // Don't save if we're in the middle of publishing
    if (isPublishing) {
      return;
    }
    isSaving = true;
    try {
      const result = await onSave({
        id: page?.id,
        title,
        slug,
        components: pageComponents,
        layout_id: layoutId || undefined,
        pageProperties,
        currentRevisionId: effectiveRevisionId
      });

      // Update revision tracking if a new revision was created
      // This ensures the revision history shows the correct "viewing" badge
      if (result?.revisionId) {
        // Store internally to prevent prop changes from overwriting
        internalRevisionId = result.revisionId;
        // Also update the external prop for compatibility
        internalRevisionLoad = true;
        lastKnownRevisionId = result.revisionId;
        currentRevisionId = result.revisionId;
      }

      // Capture the saved state for future comparison
      lastSavedState = {
        title,
        slug,
        components: JSON.parse(JSON.stringify(pageComponents)),
        pageProperties: JSON.parse(JSON.stringify(pageProperties))
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
    isPublishing = true; // Prevent save during publish
    isSaving = true;
    try {
      // Pass along whether we have unsaved changes and the current revision ID
      // This allows the publish handler to either:
      // 1. Publish the existing revision (if no unsaved changes)
      // 2. Create a new revision and publish it (if there are unsaved changes)
      await onPublish({
        id: page?.id,
        title,
        slug,
        components: pageComponents,
        layout_id: layoutId || undefined,
        pageProperties,
        currentRevisionId: effectiveRevisionId,
        hasUnsavedChanges
      });
      // After publishing, we're now viewing a published revision
      isViewingPublishedRevision = true;
      // Update lastSavedState to reflect the published content
      lastSavedState = {
        title,
        slug,
        components: JSON.parse(JSON.stringify(pageComponents)),
        pageProperties: JSON.parse(JSON.stringify(pageProperties))
      };
      hasUnsavedChanges = false;
      lastSavedAt = new Date();
    } finally {
      isPublishing = false;
      isSaving = false;
    }
  }

  function handleUpdateLayout(newLayoutId: number) {
    layoutId = newLayoutId;
    hasUnsavedChanges = true;
  }

  async function handleExitClick(): Promise<void> {
    // Use hasActualChanges instead of hasUnsavedChanges to avoid false positives
    // from theme preview changes that don't affect the actual saved state
    if (hasActualChanges) {
      const confirmed = await confirmStore.show(
        'You have unsaved changes. Are you sure you want to exit?',
        {
          title: 'Unsaved Changes',
          confirmText: 'Exit',
          cancelText: 'Stay',
          variant: 'warning'
        }
      );
      if (confirmed) {
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

  /**
   * Get the API base path for revisions based on current mode
   */
  function getRevisionApiPath(): string {
    if (!page?.id) return '';
    switch (mode) {
      case 'page':
        return `/api/pages/${page.id}/revisions`;
      case 'layout':
        return `/api/layouts/${page.id}/revisions`;
      case 'component':
      case 'primitive':
        return `/api/components/${page.id}/revisions`;
      default:
        return `/api/pages/${page.id}/revisions`;
    }
  }

  async function handleRevisionSelect(revisionId: string) {
    if (!page?.id) return;

    // If selecting the current revision, just close the modal without reloading
    // This preserves any unsaved changes and avoids unnecessary API calls
    if (revisionId === effectiveRevisionId) {
      showRevisionModal = false;
      return;
    }

    try {
      const apiPath = getRevisionApiPath();
      const response = await fetch(`${apiPath}/${revisionId}`);
      if (!response.ok) throw new Error('Failed to load revision');

      const revision = (await response.json()) as ParsedPageRevision;

      // Load revision data into editor
      title = revision.title;
      slug = revision.slug;
      pageComponents = revision.components;
      // Also load pageProperties from the revision, with defaults for any undefined values
      if (revision.pageProperties) {
        pageProperties = {
          backgroundColor:
            revision.pageProperties.backgroundColor ?? pageProperties.backgroundColor,
          backgroundImage:
            revision.pageProperties.backgroundImage ?? pageProperties.backgroundImage,
          minHeight: revision.pageProperties.minHeight ?? pageProperties.minHeight,
          borderColor: revision.pageProperties.borderColor ?? pageProperties.borderColor,
          borderWidth: revision.pageProperties.borderWidth ?? pageProperties.borderWidth,
          borderStyle: revision.pageProperties.borderStyle ?? pageProperties.borderStyle,
          borderRadius: revision.pageProperties.borderRadius ?? pageProperties.borderRadius,
          padding: revision.pageProperties.padding ?? pageProperties.padding,
          boxShadow: revision.pageProperties.boxShadow ?? pageProperties.boxShadow
        };
      }

      // Mark this as an internal revision load so the reactive sync doesn't overwrite
      // isViewingPublishedRevision with the stale prop value
      internalRevisionLoad = true;

      // Clear any internally tracked revision ID since we're explicitly selecting one
      internalRevisionId = null;

      // Update current revision ID to the newly selected revision
      currentRevisionId = revisionId;
      lastKnownRevisionId = revisionId;

      // Update whether we're viewing a published revision
      // Use Boolean conversion to handle undefined - if undefined, treat as not published
      isViewingPublishedRevision = Boolean(revision.is_published);

      // Set lastSavedState to match the loaded revision
      // This treats the loaded revision as the "saved" state
      lastSavedState = {
        title: revision.title,
        slug: revision.slug,
        components: JSON.parse(JSON.stringify(revision.components)),
        pageProperties: JSON.parse(JSON.stringify(revision.pageProperties || pageProperties))
      };

      // Add the loaded revision to history so user can undo back to the previous state
      // If history is empty, initialize it; otherwise add the new state
      // This allows the user to undo to go back to the state they were viewing before
      if (history.length === 0) {
        // No prior state, just add this revision as the starting point
        addToHistory();
      } else {
        // Remove any future history if we're not at the end (in case user was in middle of undo stack)
        if (historyIndex < history.length - 1) {
          history = history.slice(0, historyIndex + 1);
        }
        // Add the loaded revision as a new history entry
        addToHistory();
      }
      hasUnsavedChanges = false;
      // created_at is stored as Unix timestamp in seconds, convert to milliseconds
      lastSavedAt = new Date(revision.created_at * 1000);

      // Close the revision modal after successfully loading
      showRevisionModal = false;
    } catch (_error) {
      alert('Failed to load revision');
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
      } else if (event.key === 's' && !isPublishing) {
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

    // Compare current state with last saved state (including pageProperties)
    const currentState = JSON.stringify({
      title,
      slug,
      components: pageComponents,
      pageProperties
    });
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
  // Enable if viewing a non-published revision OR if there are actual changes to publish
  $: canPublish = !isViewingPublishedRevision || hasActualChanges;

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
      components: JSON.parse(JSON.stringify(pageComponents)),
      pageProperties: JSON.parse(JSON.stringify(pageProperties))
    };

    // Activate builder context store for AI awareness
    builderContextStore.activate(mode, page?.id || null, title, slug, pageComponents, layoutId);

    // Setup auto-save
    autoSaveInterval = setInterval(() => {
      if (hasActualChanges && !isSaving && !isPublishing) {
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
    {isBuiltIn}
    {isViewingPublishedRevision}
    canUndo={historyIndex > 0}
    canRedo={historyIndex < history.length - 1}
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
    <BuilderLeftPanel
      {mode}
      {pageComponents}
      {title}
      {slug}
      {components}
      {currentComponentId}
      {isBuiltIn}
      {canAddComponents}
      {isContentEditable}
      {selectedComponent}
      {pageProperties}
      {currentBreakpoint}
      {colorTheme}
      {colorThemes}
      collapsed={!showLeftSidebar}
      on:addComponent={(e) => handleAddComponent(e.detail)}
      on:selectComponent={(e) => handleSelectComponent(e.detail)}
      on:selectWidget={(e) => handleSelectComponent(e.detail)}
      on:showPageProperties={handleShowPageProperties}
      on:updateTitle={(e) => {
        title = e.detail;
        addToHistory();
      }}
      on:updateSlug={(e) => {
        slug = e.detail;
        addToHistory();
      }}
      on:updateComponent={(e) => handleUpdateComponent(e.detail)}
      on:deleteComponent={(e) => handleDeleteComponent(e.detail)}
      on:updatePageProperties={(e) => handleUpdatePageProperties(e.detail)}
      on:deselectComponent={() => {
        selectedComponent = null;
      }}
      on:toggle={() => {
        showLeftSidebar = !showLeftSidebar;
      }}
    />

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
      {pageProperties}
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
    currentRevisionId={effectiveRevisionId}
    onSelect={handleRevisionSelect}
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
