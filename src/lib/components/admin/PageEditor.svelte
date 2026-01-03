<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toastStore } from '$lib/stores/toast';
  import type {
    PageComponent,
    ComponentType,
    ComponentConfig,
    Breakpoint,
    ColorTheme
  } from '$lib/types/pages';
  import EditorToolbar from './EditorToolbar.svelte';
  import EditorCanvas from './EditorCanvas.svelte';
  import EditorSidebar from './EditorSidebar.svelte';
  import ComponentLibrary from './ComponentLibrary.svelte';
  import ComponentPropertiesPanel from './ComponentPropertiesPanel.svelte';
  import ExitConfirmationModal from './ExitConfirmationModal.svelte';
  import HistoryModal from './HistoryModal.svelte';
  import { HistoryManager, type HistoryEntry } from '$lib/utils/editor/historyManager';
  import { AutoSaveManager } from '$lib/utils/editor/autoSaveManager';
  import { KeyboardShortcutManager } from '$lib/utils/editor/keyboardShortcuts';
  import { getDefaultConfig } from '$lib/utils/editor/componentDefaults';
  import type { ParsedPageRevision, RevisionNode as PageRevisionNode } from '$lib/types/pages';
  import type { RevisionNode } from '$lib/types/revisions';

  export let pageId: string | null = null;
  export let initialTitle = '';
  export let initialSlug = '';
  export let initialStatus: 'draft' | 'published' = 'draft';
  export let initialColorTheme: ColorTheme | undefined = undefined;
  export let initialComponents: PageComponent[] = [];
  export let initialRevisions: PageRevisionNode[] | RevisionNode<unknown>[] = [];
  export let initialCurrentRevisionId: string | null = null;
  export let initialCurrentRevisionIsPublished: boolean = false;
  export let onSave: (data: {
    title: string;
    slug: string;
    status: 'draft' | 'published';
    colorTheme: ColorTheme | undefined;
    components: PageComponent[];
  }) => Promise<void>;
  export let onSaveDraft: (data: {
    title: string;
    slug: string;
    colorTheme: ColorTheme | undefined;
    components: PageComponent[];
  }) => Promise<void>;
  export let onPublish: (data: {
    title: string;
    slug: string;
    colorTheme: ColorTheme | undefined;
    components: PageComponent[];
  }) => Promise<void>;
  export let onCancel: () => void;

  // Page state
  let title = initialTitle;
  let slug = initialSlug;
  let status = initialStatus;
  let colorTheme: ColorTheme | undefined = initialColorTheme;
  let components: PageComponent[] = JSON.parse(JSON.stringify(initialComponents));

  // Sorted components for rendering - always keep in position order
  $: sortedComponents = [...components].sort((a, b) => a.position - b.position);

  // UI state
  let selectedComponent: PageComponent | null = null;
  let currentBreakpoint: Breakpoint = 'desktop';
  let showComponentLibrary = true;
  let showPropertiesPanel = true;
  let draggedIndex: number | null = null;
  let saving = false;
  let publishing = false;
  let lastSaved: Date | null = null;
  let showExitConfirmation = false;
  let hasUnsavedChanges = false;

  // Revision state (cast to generic type for compatibility)
  let revisions: RevisionNode<unknown>[] = initialRevisions as RevisionNode<unknown>[];
  let currentRevisionId: string | null = initialCurrentRevisionId;
  let currentRevisionIsPublished: boolean = initialCurrentRevisionIsPublished;

  // Undo/redo state
  let canUndo = false;
  let canRedo = false;
  let showHistoryModal = false;
  let historyModalType: 'undo' | 'redo' = 'undo';
  let historyEntries: HistoryEntry[] = [];

  // Managers
  let historyManager: HistoryManager;
  let autoSaveManager: AutoSaveManager;
  let keyboardManager: KeyboardShortcutManager;

  // Track the last initialComponents to detect changes
  let lastInitialComponents = JSON.stringify(initialComponents);

  // Debounced history save - only save after 1 second of no changes
  let historySaveTimeout: ReturnType<typeof setTimeout> | null = null;

  function debouncedHistorySave() {
    if (historySaveTimeout) {
      clearTimeout(historySaveTimeout);
    }
    historySaveTimeout = setTimeout(() => {
      historyManager.saveState(components);
      updateHistoryState();
      historySaveTimeout = null;
    }, 1000); // Wait 1 second after last change
  }

  // Helper function to update undo/redo state
  function updateHistoryState() {
    if (historyManager) {
      canUndo = historyManager.canUndo();
      canRedo = historyManager.canRedo();
    }
  }

  // Helper function to refresh selected component reference after state changes
  function refreshSelectedComponent() {
    if (selectedComponent) {
      const updatedComponent = components.find((c) => c.id === selectedComponent?.id);
      selectedComponent = updatedComponent || null;
    }
  }

  // Check for unsaved changes
  $: {
    hasUnsavedChanges =
      title !== initialTitle ||
      slug !== initialSlug ||
      status !== initialStatus ||
      JSON.stringify(colorTheme) !== JSON.stringify(initialColorTheme) ||
      JSON.stringify(components) !== JSON.stringify(initialComponents);
  }

  // Determine if Save Draft button should be enabled
  // Can save draft only if there are unsaved changes
  $: canSaveDraft = hasUnsavedChanges;

  // Determine if Publish button should be enabled
  // Can publish if:
  // 1. There are unsaved changes (new content to publish), OR
  // 2. Currently viewing a draft (can promote draft to published without changes)
  $: canPublish = hasUnsavedChanges || !currentRevisionIsPublished;

  // Update components when initialComponents change (after save/reload)
  $: {
    const currentInitialComponents = JSON.stringify(initialComponents);
    if (currentInitialComponents !== lastInitialComponents) {
      lastInitialComponents = currentInitialComponents;
      components = JSON.parse(JSON.stringify(initialComponents));
      title = initialTitle;
      slug = initialSlug;
      status = initialStatus;
      if (historyManager) {
        historyManager.reset(components);
      }
    }
  }

  // Update slug when title changes (only for new pages)
  $: if (!pageId && title && (!slug || slug.trim() === '')) {
    slug =
      '/' +
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
  }

  onMount(() => {
    // Initialize managers
    historyManager = new HistoryManager(components);
    updateHistoryState();

    autoSaveManager = new AutoSaveManager(
      async () => {
        if (!title || !slug) return;
        await handleSaveDraft();
      },
      () => {
        if (!title || !slug || saving) return false;
        const hasChanges = JSON.stringify(components) !== JSON.stringify(initialComponents);
        return hasChanges;
      }
    );

    keyboardManager = new KeyboardShortcutManager({
      undo: handleUndo,
      redo: handleRedo,
      delete: () => selectedComponent && removeComponentById(selectedComponent.id),
      duplicate: () => selectedComponent && duplicateComponent(selectedComponent.id),
      save: handleSaveDraft
    });

    autoSaveManager.start();
    keyboardManager.attach();

    // Load revisions if editing existing page
    if (pageId) {
      loadRevisions();
    }
  });

  onDestroy(() => {
    if (autoSaveManager) autoSaveManager.stop();
    if (keyboardManager) keyboardManager.detach();
    if (historySaveTimeout) clearTimeout(historySaveTimeout);
  });

  function selectComponent(componentId: string) {
    selectedComponent = components.find((c) => c.id === componentId) || null;
    // Automatically open properties panel when a component is selected
    if (selectedComponent) {
      showPropertiesPanel = true;
    }
  }

  function handleUndo() {
    const newState = historyManager.undo();
    if (newState) {
      components = newState;
      refreshSelectedComponent();
      updateHistoryState();
      toastStore.info('Undo');
    }
  }

  function handleRedo() {
    const newState = historyManager.redo();
    if (newState) {
      components = newState;
      refreshSelectedComponent();
      updateHistoryState();
      toastStore.info('Redo');
    }
  }

  function showUndoHistory() {
    historyModalType = 'undo';
    historyEntries = historyManager.getUndoHistory();
    showHistoryModal = true;
  }

  function showRedoHistory() {
    historyModalType = 'redo';
    historyEntries = historyManager.getRedoHistory();
    showHistoryModal = true;
  }

  function handleHistorySelect(index: number) {
    const newState = historyManager.jumpToState(index);
    if (newState) {
      components = newState;
      refreshSelectedComponent();
      updateHistoryState();
      toastStore.success(`Jumped to state #${index + 1}`);
    }
  }

  function closeHistoryModal() {
    showHistoryModal = false;
  }

  function addComponent(type: ComponentType) {
    const newComponent: PageComponent = {
      id: `temp-${Date.now()}`,
      page_id: pageId || 'temp',
      type,
      config: getDefaultConfig(type),
      position: components.length,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    components = [...components, newComponent];
    historyManager.saveState(components);
    updateHistoryState();
    selectComponent(newComponent.id);

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function removeComponentById(componentId: string) {
    components = components.filter((c) => c.id !== componentId);
    if (selectedComponent?.id === componentId) {
      selectedComponent = null;
    }
    historyManager.saveState(components);
    updateHistoryState();

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function duplicateComponent(componentId: string) {
    const component = components.find((c) => c.id === componentId);
    if (!component) return;

    const index = components.findIndex((c) => c.id === componentId);
    const duplicated: PageComponent = {
      ...JSON.parse(JSON.stringify(component)),
      id: `temp-${Date.now()}-${Math.random()}`,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    components = [...components.slice(0, index + 1), duplicated, ...components.slice(index + 1)];
    updateComponentPositions();
    historyManager.saveState(components);
    updateHistoryState();
    selectedComponent = duplicated;
    toastStore.success('Component duplicated');

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function moveComponentUp(componentId: string) {
    // Sort components to get current display order
    const sorted = [...components].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((c) => c.id === componentId);
    if (index <= 0) return; // Can't move first component up

    // Get the IDs of components to swap
    const currentId = sorted[index].id;
    const aboveId = sorted[index - 1].id;
    const currentPos = sorted[index].position;
    const abovePos = sorted[index - 1].position;

    // Create new array with swapped positions - completely new objects
    components = components.map((c) => {
      if (c.id === currentId) {
        return { ...c, position: abovePos };
      }
      if (c.id === aboveId) {
        return { ...c, position: currentPos };
      }
      return c;
    });

    historyManager.saveState(components);
    updateHistoryState();

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function moveComponentDown(componentId: string) {
    // Sort components to get current display order
    const sorted = [...components].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((c) => c.id === componentId);
    if (index < 0 || index >= sorted.length - 1) return; // Can't move last component down

    // Get the IDs of components to swap
    const currentId = sorted[index].id;
    const belowId = sorted[index + 1].id;
    const currentPos = sorted[index].position;
    const belowPos = sorted[index + 1].position;

    // Create new array with swapped positions - completely new objects
    components = components.map((c) => {
      if (c.id === currentId) {
        return { ...c, position: belowPos };
      }
      if (c.id === belowId) {
        return { ...c, position: currentPos };
      }
      return c;
    });

    historyManager.saveState(components);
    updateHistoryState();

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function updateComponentConfig(componentId: string, config: ComponentConfig) {
    components = components.map((c) => {
      if (c.id === componentId) {
        return { ...c, config: { ...c.config, ...config }, updated_at: Date.now() };
      }
      return c;
    });
    // Refresh the selected component reference to point to the updated component
    refreshSelectedComponent();
    // Use debounced history save to avoid saving on every keystroke
    debouncedHistorySave();
  }

  function moveComponent(fromIndex: number, toIndex: number) {
    const newComponents = [...components];
    const [removed] = newComponents.splice(fromIndex, 1);
    newComponents.splice(toIndex, 0, removed);
    components = newComponents;
    updateComponentPositions();
    historyManager.saveState(components);
    updateHistoryState();

    if (pageId && title && slug) {
      setTimeout(() => autoSaveManager.autoSave(), 100);
    }
  }

  function updateComponentPositions() {
    components = components.map((c, i) => ({ ...c, position: i }));
  }

  function handleDragStart(index: number) {
    draggedIndex = index;
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveComponent(draggedIndex, index);
      draggedIndex = index;
    }
  }

  function handleDragEnd() {
    draggedIndex = null;
  }

  async function handleSaveDraft() {
    if (!title || !slug) {
      toastStore.error('Title and slug are required');
      return;
    }

    try {
      saving = true;
      await onSaveDraft({ title, slug, colorTheme, components });

      // Update initial values to reflect the saved state
      initialTitle = title;
      initialSlug = slug;
      initialColorTheme = colorTheme;
      initialComponents = JSON.parse(JSON.stringify(components));

      // After saving a draft, we're viewing a draft (not published)
      currentRevisionIsPublished = false;

      lastSaved = new Date();
      if (autoSaveManager) {
        autoSaveManager.setLastSaved(lastSaved);
      }
      await loadRevisions();
    } finally {
      saving = false;
    }
  }

  async function handlePublish() {
    if (!title || !slug) {
      toastStore.error('Title and slug are required');
      return;
    }

    try {
      publishing = true;
      await onPublish({ title, slug, colorTheme, components });
      status = 'published';

      // Update initial values to reflect the published state
      initialTitle = title;
      initialSlug = slug;
      initialStatus = 'published';
      initialColorTheme = colorTheme;
      initialComponents = JSON.parse(JSON.stringify(components));

      // After publishing, we're viewing a published version
      currentRevisionIsPublished = true;

      toastStore.success('Page published successfully');
      await loadRevisions();
    } finally {
      publishing = false;
    }
  }

  function handleThemeChange(newTheme: ColorTheme | undefined) {
    colorTheme = newTheme;
    historyManager.saveState(components, `Changed theme to ${newTheme || 'site default'}`);
  }

  async function loadRevisions() {
    if (!pageId) return;

    try {
      // Load revision tree structure for graph visualization
      const response = await fetch(`/api/pages/${pageId}/revisions?tree=true`);
      if (response.ok) {
        revisions = await response.json();
      }
    } catch (error) {
      console.error('Error loading revisions:', error);
    }
  }

  async function loadRevision(revisionId: string) {
    if (!pageId) return;

    // If selecting the current revision, do nothing - this preserves any unsaved changes
    if (revisionId === currentRevisionId) {
      return;
    }

    try {
      const response = await fetch(`/api/pages/${pageId}/revisions/${revisionId}`);
      if (response.ok) {
        const revision: ParsedPageRevision = await response.json();

        // Update page state with revision data
        title = revision.title;
        slug = revision.slug;
        colorTheme = revision.color_theme as ColorTheme | undefined;
        components = revision.components || [];
        currentRevisionId = revisionId;

        // Find the revision in the list to get its published status
        // Check both is_published (page revisions) and is_current (generic revisions)
        const revisionInfo = revisions.find((r) => r.id === revisionId);
        const isPublished =
          (revisionInfo as { is_published?: boolean })?.is_published ||
          (revisionInfo as { is_current?: boolean })?.is_current ||
          false;
        currentRevisionIsPublished = isPublished;

        // Update initial values to match loaded revision
        initialTitle = title;
        initialSlug = slug;
        initialColorTheme = colorTheme;
        initialComponents = JSON.parse(JSON.stringify(components));

        historyManager.reset(components);
        toastStore.info(`Loaded revision ${revision.revision_hash}`);
      }
    } catch (error) {
      console.error('Error loading revision:', error);
      toastStore.error('Failed to load revision');
    }
  }

  async function publishRevision(revisionId: string) {
    if (!pageId) return;

    try {
      publishing = true;
      const response = await fetch(`/api/pages/${pageId}/revisions/${revisionId}/publish`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = (await response.json()) as {
          success: boolean;
          revision?: ParsedPageRevision;
        };
        status = 'published';

        toastStore.success('Revision published successfully');
        await loadRevisions();

        // Load the newly created revision (which is now at the head)
        if (result.revision) {
          await loadRevision(result.revision.id);
        }
      } else {
        throw new Error('Failed to publish revision');
      }
    } catch (error) {
      console.error('Error publishing revision:', error);
      toastStore.error('Failed to publish revision');
    } finally {
      publishing = false;
    }
  }

  async function handleSubmit() {
    if (!title || !slug) {
      toastStore.error('Title and slug are required');
      return;
    }

    try {
      saving = true;
      await onSave({ title, slug, status, colorTheme, components });
      lastSaved = new Date();
      if (autoSaveManager) {
        autoSaveManager.setLastSaved(lastSaved);
      }
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      showExitConfirmation = true;
    } else {
      onCancel();
    }
  }

  function confirmExit() {
    showExitConfirmation = false;
    onCancel();
  }

  function cancelExit() {
    showExitConfirmation = false;
  }
</script>

<div class="wysiwyg-editor">
  <EditorToolbar
    bind:title
    bind:slug
    bind:status
    {colorTheme}
    bind:currentBreakpoint
    {saving}
    {publishing}
    {canSaveDraft}
    {canPublish}
    lastSaved={autoSaveManager?.getLastSaved() || lastSaved}
    {canUndo}
    {canRedo}
    {pageId}
    {revisions}
    {currentRevisionId}
    {showComponentLibrary}
    {showPropertiesPanel}
    onShowUndoHistory={showUndoHistory}
    onShowRedoHistory={showRedoHistory}
    events={{
      undo: handleUndo,
      redo: handleRedo,
      saveDraft: handleSaveDraft,
      publish: handlePublish,
      save: handleSubmit,
      cancel: handleCancel,
      loadRevision,
      publishRevision,
      toggleComponentLibrary: () => (showComponentLibrary = !showComponentLibrary),
      togglePropertiesPanel: () => (showPropertiesPanel = !showPropertiesPanel),
      changeTheme: handleThemeChange
    }}
  />

  <div class="editor-main">
    <!-- Left Sidebar - Component Library -->
    <EditorSidebar
      title="Components"
      side="left"
      collapsed={!showComponentLibrary}
      events={{ toggle: () => (showComponentLibrary = !showComponentLibrary) }}
    >
      <ComponentLibrary onSelectComponent={addComponent} />
    </EditorSidebar>

    <!-- Center Canvas -->
    <EditorCanvas
      components={sortedComponents}
      selectedComponentId={selectedComponent?.id || null}
      {currentBreakpoint}
      {colorTheme}
      events={{
        select: selectComponent,
        moveUp: moveComponentUp,
        moveDown: moveComponentDown,
        duplicate: duplicateComponent,
        delete: removeComponentById,
        updateConfig: updateComponentConfig,
        dragStart: handleDragStart,
        dragOver: handleDragOver,
        dragEnd: handleDragEnd
      }}
    />

    <!-- Right Sidebar - Properties Panel -->
    <EditorSidebar
      title="Properties"
      side="right"
      collapsed={!showPropertiesPanel || !selectedComponent}
      events={{ toggle: () => (showPropertiesPanel = !showPropertiesPanel) }}
    >
      {#if selectedComponent}
        <ComponentPropertiesPanel
          component={selectedComponent}
          {currentBreakpoint}
          {colorTheme}
          onUpdate={(config) => {
            if (selectedComponent) updateComponentConfig(selectedComponent.id, config);
          }}
        />
      {/if}
    </EditorSidebar>
  </div>

  <!-- Exit Confirmation Modal -->
  <ExitConfirmationModal
    isOpen={showExitConfirmation}
    onConfirm={confirmExit}
    onCancel={cancelExit}
  />

  <!-- History Modal -->
  <HistoryModal
    isOpen={showHistoryModal}
    type={historyModalType}
    entries={historyEntries}
    currentIndex={historyManager?.getCurrentIndex() || 0}
    onSelect={handleHistorySelect}
    onClose={closeHistoryModal}
  />
</div>

<style>
  .wysiwyg-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg-secondary);
  }

  .editor-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>
