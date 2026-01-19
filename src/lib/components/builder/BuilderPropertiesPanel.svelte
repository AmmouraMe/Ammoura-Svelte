<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { ChevronDown, X } from 'lucide-svelte';
  import type {
    PageComponent,
    ColorTheme,
    Component,
    ColorThemeDefinition
  } from '$lib/types/pages';
  import type { MediaLibraryItem } from '$lib/types';
  import ComponentPropertiesPanel from '$lib/components/admin/ComponentPropertiesPanel.svelte';
  import ThemeColorInput from '$lib/components/admin/ThemeColorInput.svelte';
  import MediaBrowser from '$lib/components/admin/MediaBrowser.svelte';
  import MediaUpload from '$lib/components/admin/MediaUpload.svelte';
  import ToggleSwitch from '$lib/components/ToggleSwitch.svelte';
  import { getComponentDisplayLabel } from '$lib/utils/editor/componentDefaults';
  import { getThemeColors } from '$lib/utils/editor/colorThemes';

  export let pageComponents: PageComponent[] = [];
  export let selectedComponent: PageComponent | null = null;
  export let pageProperties:
    | {
        // Page title display - overrides layout yield setting
        showPageTitle?: boolean;
        backgroundColor: string;
        backgroundImage: string;
        minHeight: string;
        // Granular padding
        paddingTop?: number;
        paddingRight?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        padding?: string;
        // Size properties
        width?: string;
        maxWidth?: string;
        // Border
        borderColor?: string;
        borderWidth?: string;
        borderStyle?: string;
        borderRadius?: string;
        // Effects
        boxShadow?: string;
        opacity?: number;
        // Overflow
        overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
        // Positioning properties
        positionType?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
        positionTop?: string;
        positionRight?: string;
        positionBottom?: string;
        positionLeft?: string;
        zIndex?: number;
      }
    | undefined = undefined;
  export let currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  export let colorTheme: ColorTheme = 'default';
  export let entityLabel = 'Page';
  export let components: Component[] = [];
  export let colorThemes: ColorThemeDefinition[] = [];
  // Whether content editing is allowed (false in layout mode - only structure editing allowed)
  export let isContentEditable = true;
  // Whether to show the panel header (hidden when embedded in BuilderLeftPanel)
  export let showHeader = true;

  // Title and slug for page/layout/component settings
  export let title = '';
  export let slug = '';
  export let mode: 'page' | 'layout' | 'component' | 'primitive' = 'page';
  export let isBuiltIn = false;

  // Compute theme colors from colorThemes array (database-loaded themes) or fallback to static lookup
  $: currentThemeData = colorThemes.find((t) => t.id === colorTheme);
  $: themeColors = currentThemeData?.colors || getThemeColors(colorTheme);

  // Track page/component properties section expansion separately from individual component sections
  // This prevents the page properties from collapsing when selecting elements in the preview
  let pagePropertiesExpanded = true;

  // Track which individual component section is expanded (null = none, component.id = specific component)
  let expandedComponentId: string | null = selectedComponent?.id || null;

  // Track active tab for page properties
  let pageActiveTab: 'content' | 'style' | 'responsive' = 'style';

  // Helper function to find the parent component ID for a given component
  // This is needed when a child inside a container is selected
  // Uses componentsWithChildren which has the properly nested structure
  function findParentComponentIdFromTree(
    componentId: string,
    components: PageComponent[]
  ): string | null {
    // First check if it's a top-level component
    if (components.some((c) => c.id === componentId)) {
      return componentId;
    }

    // Search through each root component's children
    for (const component of components) {
      if (findChildInComponent(component, componentId)) {
        return component.id;
      }
    }
    return null;
  }

  // Recursively search for a child component by ID within a component's children
  function findChildInComponent(component: PageComponent, targetId: string): boolean {
    const children = component.config?.children as PageComponent[] | undefined;
    if (!children) return false;

    for (const child of children) {
      if (child.id === targetId) {
        return true;
      }
      if (findChildInComponent(child, targetId)) {
        return true;
      }
    }
    return false;
  }

  // Helper to recursively dispatch updates for nested children with correct parent_id
  function dispatchNestedChildUpdates(
    children: unknown[],
    parentId: string,
    dispatchFn: (event: string, detail: PageComponent) => void
  ): void {
    if (!children || !Array.isArray(children)) return;

    children.forEach((child, index) => {
      const typedChild = child as PageComponent;

      // Recursively handle nested children first
      const nestedChildren = typedChild.config?.children;
      if (nestedChildren && Array.isArray(nestedChildren)) {
        dispatchNestedChildUpdates(nestedChildren, typedChild.id, dispatchFn);
      }

      // Strip children from this child's config (they're dispatched separately)
      const childConfig = typedChild.config || {};
      const { children: _nestedChildren, ...childConfigWithoutChildren } = childConfig;
      const updatedChild = {
        ...typedChild,
        config: childConfigWithoutChildren,
        position: index,
        parent_id: parentId
      };
      dispatchFn('updateComponent', updatedChild);
    });
  }

  // Build a map of parent_id -> children for efficient lookup
  $: childrenMap = pageComponents.reduce(
    (map, comp) => {
      if (comp.parent_id) {
        if (!map[comp.parent_id]) {
          map[comp.parent_id] = [];
        }
        map[comp.parent_id].push(comp);
      }
      return map;
    },
    {} as Record<string, PageComponent[]>
  );

  const dispatch = createEventDispatcher();

  let localBackgroundColor = pageProperties?.backgroundColor || 'transparent';
  let localBackgroundImage = pageProperties?.backgroundImage || '';
  let localMinHeight = pageProperties?.minHeight || '100vh';

  // Border properties
  let localBorderColor = pageProperties?.borderColor || '';
  let localBorderWidth = pageProperties?.borderWidth || '0';
  let localBorderStyle = pageProperties?.borderStyle || 'solid';
  let localBorderRadius = pageProperties?.borderRadius || '0';

  // Granular padding properties
  let localPaddingTop = pageProperties?.paddingTop ?? 0;
  let localPaddingRight = pageProperties?.paddingRight ?? 0;
  let localPaddingBottom = pageProperties?.paddingBottom ?? 0;
  let localPaddingLeft = pageProperties?.paddingLeft ?? 0;

  // Legacy padding (single string)
  let localPadding = pageProperties?.padding || '';

  // Size properties
  let localWidth = pageProperties?.width || 'auto';
  let localMaxWidth = pageProperties?.maxWidth || '';

  // Box shadow
  let localBoxShadow = pageProperties?.boxShadow || '';

  // Opacity
  let localOpacity = pageProperties?.opacity ?? 100;

  // Overflow
  let localOverflow = pageProperties?.overflow || 'visible';

  // Positioning properties
  let localPositionType = pageProperties?.positionType || 'static';
  let localPositionTop = pageProperties?.positionTop || '';
  let localPositionRight = pageProperties?.positionRight || '';
  let localPositionBottom = pageProperties?.positionBottom || '';
  let localPositionLeft = pageProperties?.positionLeft || '';
  let localZIndex = pageProperties?.zIndex ?? 0;

  // Track previous pageProperties to detect external changes (e.g., from undo/redo)
  let prevPagePropertiesJson = JSON.stringify(pageProperties);

  // Sync local variables only when pageProperties changes from external source
  $: {
    const currentJson = JSON.stringify(pageProperties);
    // Build what local state would produce
    const localStateJson = JSON.stringify({
      backgroundColor: localBackgroundColor,
      backgroundImage: localBackgroundImage,
      minHeight: localMinHeight,
      paddingTop: localPaddingTop,
      paddingRight: localPaddingRight,
      paddingBottom: localPaddingBottom,
      paddingLeft: localPaddingLeft,
      padding: localPadding,
      width: localWidth,
      maxWidth: localMaxWidth,
      borderColor: localBorderColor,
      borderWidth: localBorderWidth,
      borderStyle: localBorderStyle,
      borderRadius: localBorderRadius,
      boxShadow: localBoxShadow,
      opacity: localOpacity,
      overflow: localOverflow,
      positionType: localPositionType,
      positionTop: localPositionTop,
      positionRight: localPositionRight,
      positionBottom: localPositionBottom,
      positionLeft: localPositionLeft,
      zIndex: localZIndex
    });

    // Only sync if pageProperties changed AND it's not from our own local edits
    if (
      currentJson !== prevPagePropertiesJson &&
      currentJson !== localStateJson &&
      pageProperties
    ) {
      localBackgroundColor = pageProperties.backgroundColor || 'transparent';
      localBackgroundImage = pageProperties.backgroundImage || '';
      localMinHeight = pageProperties.minHeight || '100vh';
      localPaddingTop = pageProperties.paddingTop ?? 0;
      localPaddingRight = pageProperties.paddingRight ?? 0;
      localPaddingBottom = pageProperties.paddingBottom ?? 0;
      localPaddingLeft = pageProperties.paddingLeft ?? 0;
      localPadding = pageProperties.padding || '';
      localWidth = pageProperties.width || 'auto';
      localMaxWidth = pageProperties.maxWidth || '';
      localBorderColor = pageProperties.borderColor || '';
      localBorderWidth = pageProperties.borderWidth || '0';
      localBorderStyle = pageProperties.borderStyle || 'solid';
      localBorderRadius = pageProperties.borderRadius || '0';
      localBoxShadow = pageProperties.boxShadow || '';
      localOpacity = pageProperties.opacity ?? 100;
      localOverflow = pageProperties.overflow || 'visible';
      localPositionType = pageProperties.positionType || 'static';
      localPositionTop = pageProperties.positionTop || '';
      localPositionRight = pageProperties.positionRight || '';
      localPositionBottom = pageProperties.positionBottom || '';
      localPositionLeft = pageProperties.positionLeft || '';
      localZIndex = pageProperties.zIndex ?? 0;
    }
    prevPagePropertiesJson = currentJson;
  }

  // Media browser state
  let showMediaBrowser = false;
  let selectedMediaItems: MediaLibraryItem[] = [];

  function handlePagePropertyChange(): void {
    if (pageProperties) {
      dispatch('updatePageProperties', {
        backgroundColor: localBackgroundColor,
        backgroundImage: localBackgroundImage,
        minHeight: localMinHeight,
        paddingTop: localPaddingTop,
        paddingRight: localPaddingRight,
        paddingBottom: localPaddingBottom,
        paddingLeft: localPaddingLeft,
        padding: localPadding,
        width: localWidth,
        maxWidth: localMaxWidth,
        borderColor: localBorderColor,
        borderWidth: localBorderWidth,
        borderStyle: localBorderStyle,
        borderRadius: localBorderRadius,
        boxShadow: localBoxShadow,
        opacity: localOpacity,
        overflow: localOverflow,
        positionType: localPositionType,
        positionTop: localPositionTop,
        positionRight: localPositionRight,
        positionBottom: localPositionBottom,
        positionLeft: localPositionLeft,
        zIndex: localZIndex
      });
    }
  }

  function handleMediaUploaded(media: MediaLibraryItem) {
    localBackgroundImage = media.url;
    handlePagePropertyChange();
  }

  // Function to inject children into a component's config for properties panel
  // This handles two cases:
  // 1. Components with parent_id references (containers) - inject from childrenMap
  // 2. Components with inline children (navbar/footer) - recursively process existing children
  function injectChildrenIntoConfig(comp: PageComponent): PageComponent {
    // First, check if this component has children via parent_id references
    const childrenFromMap = childrenMap[comp.id];

    // Also check for existing inline children (navbar/footer pattern)
    const existingInlineChildren = comp.config?.children as PageComponent[] | undefined;

    // If we have children from the parent_id map, use those
    if (childrenFromMap && childrenFromMap.length > 0) {
      const childrenWithNested = childrenFromMap
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

    // If we have existing inline children (navbar/footer), recursively process them
    if (existingInlineChildren && existingInlineChildren.length > 0) {
      const processedChildren = existingInlineChildren.map((child) =>
        injectChildrenIntoConfig(child)
      );
      return {
        ...comp,
        config: {
          ...comp.config,
          children: processedChildren
        }
      };
    }

    // No children to inject
    return comp;
  }

  // Get only root-level components (those without parent_id) for the list
  $: rootComponents = pageComponents.filter((c) => !c.parent_id);

  // Create components with children injected for properties panel display
  $: componentsWithChildren = rootComponents.map((comp) => injectChildrenIntoConfig(comp));

  // React to selectedComponent changes - expand the parent component if a child is selected
  // This must be after componentsWithChildren is defined since we search through it
  $: if (selectedComponent && componentsWithChildren.length > 0) {
    const parentId = findParentComponentIdFromTree(selectedComponent.id, componentsWithChildren);
    if (parentId) {
      // Only update if the parent is different from current expanded component
      // This prevents unnecessary re-renders
      if (expandedComponentId !== parentId) {
        expandedComponentId = parentId;
      }
      // Scroll to the child component's properties after the DOM updates
      tick().then(() => {
        const childPanel = document.getElementById(`child-panel-${selectedComponent?.id}`);
        if (childPanel) {
          childPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Briefly highlight the panel
          childPanel.classList.add('highlight');
          setTimeout(() => childPanel.classList.remove('highlight'), 2000);
        }
      });
    }
    // If parentId is null and selectedComponent is a root component, expand it
    // Otherwise, don't change the expanded state (child wasn't found, keep current state)
    else if (rootComponents.some((c) => c.id === selectedComponent.id)) {
      expandedComponentId = selectedComponent.id;
    }
    // If we can't find the parent and it's not a root component,
    // keep the current expanded state - don't collapse anything
  }

  function handleMediaSelected(media: MediaLibraryItem[]) {
    selectedMediaItems = media;
    if (selectedMediaItems.length > 0) {
      localBackgroundImage = selectedMediaItems[0].url;
      handlePagePropertyChange();
    }
    showMediaBrowser = false;
  }

  function handleCancelMediaBrowser() {
    selectedMediaItems = [];
    showMediaBrowser = false;
  }
</script>

<aside class="builder-properties-panel">
  {#if showHeader}
    <div class="panel-header">
      <h3>Properties</h3>
      <button
        class="btn-close"
        on:click={() => dispatch('close')}
        aria-label="Close properties panel"
      >
        <X size={18} />
      </button>
    </div>
  {/if}

  <div class="panel-content">
    <!-- Page Component -->
    {#if pageProperties}
      <div class="component-section">
        <button
          class="component-section-header"
          class:expanded={pagePropertiesExpanded}
          on:click={() => {
            pagePropertiesExpanded = !pagePropertiesExpanded;
            dispatch('selectWidget', null);
          }}
        >
          <ChevronDown
            size={16}
            class="chevron"
            style="transform: rotate({pagePropertiesExpanded
              ? 0
              : -90}deg); transition: transform 0.2s;"
          />
          <span class="component-label">{entityLabel}</span>
        </button>

        {#if pagePropertiesExpanded}
          <div class="page-properties">
            <div class="panel-tabs">
              <button
                type="button"
                class="tab"
                class:active={pageActiveTab === 'content'}
                on:click={() => (pageActiveTab = 'content')}
              >
                Content
              </button>
              <button
                type="button"
                class="tab"
                class:active={pageActiveTab === 'style'}
                on:click={() => (pageActiveTab = 'style')}
              >
                Style
              </button>
              <button
                type="button"
                class="tab"
                class:active={pageActiveTab === 'responsive'}
                on:click={() => (pageActiveTab = 'responsive')}
              >
                Responsive
              </button>
            </div>

            <div class="tab-content">
              {#if pageActiveTab === 'content'}
                <!-- Title and Slug Settings -->
                <div class="property-section">
                  <h4>{entityLabel} Settings</h4>
                  <div class="property-field">
                    <label for="entity-title">Title</label>
                    <input
                      id="entity-title"
                      type="text"
                      class:readonly={isBuiltIn}
                      value={title}
                      readonly={isBuiltIn}
                      on:input={(e) => !isBuiltIn && dispatch('updateTitle', e.currentTarget.value)}
                      placeholder="{entityLabel} title"
                      title={isBuiltIn ? 'Built-in component names cannot be changed' : ''}
                    />
                  </div>
                  {#if mode === 'page'}
                    <div class="property-field">
                      <label for="entity-slug">URL Slug</label>
                      <input
                        id="entity-slug"
                        type="text"
                        value={slug}
                        on:input={(e) => dispatch('updateSlug', e.currentTarget.value)}
                        placeholder="/page-url"
                      />
                    </div>
                  {/if}
                </div>

                {#if mode === 'page'}
                  <div class="property-section">
                    <h4>Title Display</h4>
                    <ToggleSwitch
                      checked={pageProperties?.showPageTitle ?? false}
                      label="Show page title above content"
                      description="Override the layout's default setting. When enabled, the page title will be displayed above the page content."
                      onChange={(checked) => {
                        dispatch('updatePageProperties', {
                          ...pageProperties,
                          showPageTitle: checked
                        });
                      }}
                    />
                  </div>
                {:else if mode === 'layout'}
                  <div class="property-section">
                    <p class="help-text">No content settings available for layouts.</p>
                  </div>
                {/if}
              {:else if pageActiveTab === 'style'}
                <!-- Padding Section -->
                <div class="property-section">
                  <h4>Padding</h4>
                  <div class="spacing-grid">
                    <div class="property-field">
                      <label for="padding-top">Top</label>
                      <input
                        id="padding-top"
                        type="number"
                        bind:value={localPaddingTop}
                        on:input={handlePagePropertyChange}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div class="property-field">
                      <label for="padding-right">Right</label>
                      <input
                        id="padding-right"
                        type="number"
                        bind:value={localPaddingRight}
                        on:input={handlePagePropertyChange}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div class="property-field">
                      <label for="padding-bottom">Bottom</label>
                      <input
                        id="padding-bottom"
                        type="number"
                        bind:value={localPaddingBottom}
                        on:input={handlePagePropertyChange}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div class="property-field">
                      <label for="padding-left">Left</label>
                      <input
                        id="padding-left"
                        type="number"
                        bind:value={localPaddingLeft}
                        on:input={handlePagePropertyChange}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <!-- Size Section -->
                <div class="property-section">
                  <h4>Size</h4>

                  <div class="property-field">
                    <label for="width">Width</label>
                    <select id="width" bind:value={localWidth} on:change={handlePagePropertyChange}>
                      <option value="auto">Auto</option>
                      <option value="100%">Full Width (100%)</option>
                      <option value="50%">Half Width (50%)</option>
                      <option value="33.333%">Third (33%)</option>
                      <option value="66.667%">Two Thirds (66%)</option>
                    </select>
                  </div>

                  <div class="property-field">
                    <label for="max-width">Max Width</label>
                    <input
                      id="max-width"
                      type="text"
                      bind:value={localMaxWidth}
                      on:blur={handlePagePropertyChange}
                      placeholder="none"
                    />
                    <small>e.g., 1200px, 100%, none</small>
                  </div>

                  <div class="property-field">
                    <label for="min-height">Minimum Height</label>
                    <input
                      id="min-height"
                      type="text"
                      bind:value={localMinHeight}
                      on:blur={handlePagePropertyChange}
                      placeholder="100vh"
                    />
                    <small>e.g., 300px, 50vh, auto</small>
                  </div>
                </div>

                <!-- Background Section -->
                <div class="property-section">
                  <h4>Background</h4>

                  <div class="property-field">
                    <ThemeColorInput
                      value={localBackgroundColor}
                      currentTheme={colorTheme}
                      {themeColors}
                      label="Background Color"
                      defaultValue="transparent"
                      onChange={(newValue) => {
                        localBackgroundColor = typeof newValue === 'string' ? newValue : '#ffffff';
                        handlePagePropertyChange();
                      }}
                    />
                  </div>

                  <div class="property-field">
                    <label for="bg-image">Background Image</label>
                    {#if localBackgroundImage}
                      <div class="media-preview">
                        <img src={localBackgroundImage} alt="Page Background" />
                        <button
                          type="button"
                          class="btn-remove"
                          on:click={() => {
                            localBackgroundImage = '';
                            handlePagePropertyChange();
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    {/if}
                    <div class="media-actions">
                      <MediaUpload onMediaUploaded={handleMediaUploaded} />
                      <button
                        type="button"
                        class="btn-secondary"
                        on:click={() => (showMediaBrowser = !showMediaBrowser)}
                      >
                        {showMediaBrowser ? 'Hide' : 'Browse'} Library
                      </button>
                    </div>
                    {#if showMediaBrowser}
                      <div
                        class="media-browser-modal"
                        role="button"
                        tabindex="0"
                        on:click|self={handleCancelMediaBrowser}
                        on:keydown={(e) => e.key === 'Escape' && handleCancelMediaBrowser()}
                      >
                        <div class="media-browser-content">
                          <div class="media-browser-header">
                            <h3>Select Background Image</h3>
                            <button
                              type="button"
                              class="modal-close-btn"
                              on:click={handleCancelMediaBrowser}
                              title="Close"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <MediaBrowser
                            onSelect={handleMediaSelected}
                            showTitle={false}
                            showFooter={false}
                          />
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Border Section -->
                <div class="property-section">
                  <h4>Border</h4>

                  <div class="property-field">
                    <ThemeColorInput
                      value={localBorderColor}
                      currentTheme={colorTheme}
                      {themeColors}
                      label="Border Color"
                      defaultValue=""
                      onChange={(newValue) => {
                        localBorderColor = typeof newValue === 'string' ? newValue : '';
                        handlePagePropertyChange();
                      }}
                    />
                  </div>

                  <div class="property-row">
                    <div class="property-field half">
                      <label for="border-width">Width (px)</label>
                      <input
                        id="border-width"
                        type="number"
                        value={parseInt(localBorderWidth, 10) || 0}
                        on:input={(e) => {
                          localBorderWidth = e.currentTarget.value;
                          handlePagePropertyChange();
                        }}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div class="property-field half">
                      <label for="border-style">Style</label>
                      <select
                        id="border-style"
                        bind:value={localBorderStyle}
                        on:change={handlePagePropertyChange}
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="double">Double</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>

                  <div class="property-field">
                    <label for="border-radius">Border Radius (px)</label>
                    <input
                      id="border-radius"
                      type="number"
                      value={parseInt(localBorderRadius, 10) || 0}
                      on:input={(e) => {
                        localBorderRadius = e.currentTarget.value;
                        handlePagePropertyChange();
                      }}
                      min="0"
                      placeholder="0"
                    />
                    <div class="quick-buttons">
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBorderRadius = '0';
                          handlePagePropertyChange();
                        }}
                      >
                        0
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBorderRadius = '4';
                          handlePagePropertyChange();
                        }}
                      >
                        4
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBorderRadius = '8';
                          handlePagePropertyChange();
                        }}
                      >
                        8
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBorderRadius = '16';
                          handlePagePropertyChange();
                        }}
                      >
                        16
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBorderRadius = '9999';
                          handlePagePropertyChange();
                        }}
                      >
                        Full
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Overflow Section -->
                <div class="property-section">
                  <h4>Overflow</h4>

                  <div class="property-field">
                    <label for="overflow">Overflow Behavior</label>
                    <select
                      id="overflow"
                      bind:value={localOverflow}
                      on:change={handlePagePropertyChange}
                    >
                      <option value="visible">Visible (default)</option>
                      <option value="hidden">Hidden</option>
                      <option value="scroll">Scroll</option>
                      <option value="auto">Auto</option>
                    </select>
                    <small>Controls how content that overflows is displayed.</small>
                  </div>
                </div>

                <!-- Effects Section -->
                <div class="property-section">
                  <h4>Effects</h4>

                  <div class="property-field">
                    <label for="box-shadow">Box Shadow</label>
                    <input
                      id="box-shadow"
                      type="text"
                      bind:value={localBoxShadow}
                      on:blur={handlePagePropertyChange}
                      placeholder="none"
                    />
                    <div class="quick-buttons">
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBoxShadow = 'none';
                          handlePagePropertyChange();
                        }}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBoxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                          handlePagePropertyChange();
                        }}
                      >
                        SM
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBoxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                          handlePagePropertyChange();
                        }}
                      >
                        MD
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBoxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                          handlePagePropertyChange();
                        }}
                      >
                        LG
                      </button>
                      <button
                        type="button"
                        class="quick-btn"
                        on:click={() => {
                          localBoxShadow = '0 20px 50px rgba(0,0,0,0.2)';
                          handlePagePropertyChange();
                        }}
                      >
                        XL
                      </button>
                    </div>
                  </div>

                  <div class="property-field">
                    <label for="opacity">Opacity ({localOpacity}%)</label>
                    <input
                      id="opacity"
                      type="range"
                      bind:value={localOpacity}
                      on:input={handlePagePropertyChange}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <!-- Positioning Section -->
                <div class="property-section">
                  <h4>Positioning</h4>

                  <div class="property-field">
                    <label for="position-type">Position Type</label>
                    <select
                      id="position-type"
                      bind:value={localPositionType}
                      on:change={handlePagePropertyChange}
                    >
                      <option value="static">Static (default)</option>
                      <option value="relative">Relative</option>
                      <option value="absolute">Absolute</option>
                      <option value="fixed">Fixed</option>
                      <option value="sticky">Sticky</option>
                    </select>
                    <small>Controls how the element is positioned in the document flow.</small>
                  </div>

                  {#if localPositionType && localPositionType !== 'static'}
                    <div class="property-row">
                      <div class="property-field half">
                        <label for="position-top">Top</label>
                        <input
                          id="position-top"
                          type="text"
                          bind:value={localPositionTop}
                          on:blur={handlePagePropertyChange}
                          placeholder="auto"
                        />
                      </div>
                      <div class="property-field half">
                        <label for="position-right">Right</label>
                        <input
                          id="position-right"
                          type="text"
                          bind:value={localPositionRight}
                          on:blur={handlePagePropertyChange}
                          placeholder="auto"
                        />
                      </div>
                    </div>

                    <div class="property-row">
                      <div class="property-field half">
                        <label for="position-bottom">Bottom</label>
                        <input
                          id="position-bottom"
                          type="text"
                          bind:value={localPositionBottom}
                          on:blur={handlePagePropertyChange}
                          placeholder="auto"
                        />
                      </div>
                      <div class="property-field half">
                        <label for="position-left">Left</label>
                        <input
                          id="position-left"
                          type="text"
                          bind:value={localPositionLeft}
                          on:blur={handlePagePropertyChange}
                          placeholder="auto"
                        />
                      </div>
                    </div>

                    <div class="property-field">
                      <label for="z-index">Z-Index</label>
                      <input
                        id="z-index"
                        type="number"
                        bind:value={localZIndex}
                        on:blur={handlePagePropertyChange}
                        placeholder="0"
                      />
                      <small>Higher values appear in front of elements with lower values.</small>
                    </div>
                  {/if}
                </div>
              {:else if pageActiveTab === 'responsive'}
                <div class="property-section">
                  <p class="empty-state">No responsive properties available</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- All Page Components (root level only, with children injected) -->
    {#each componentsWithChildren as componentItem, _index (componentItem.id)}
      <div class="component-section">
        <button
          class="component-section-header"
          class:expanded={expandedComponentId === componentItem.id}
          class:selected={selectedComponent?.id === componentItem.id}
          on:click={() => {
            if (expandedComponentId === componentItem.id) {
              expandedComponentId = null;
              dispatch('selectComponent', null);
            } else {
              expandedComponentId = componentItem.id;
              dispatch('selectComponent', componentItem);
            }
          }}
        >
          <ChevronDown
            size={16}
            class="chevron"
            style="transform: rotate({expandedComponentId === componentItem.id
              ? 0
              : -90}deg); transition: transform 0.2s;"
          />
          <div class="component-info">
            <span class="component-label">
              {getComponentDisplayLabel(componentItem, components)}
            </span>
            {#if componentItem.config?.anchorName}
              <span class="component-id">{componentItem.config.anchorName}</span>
            {:else}
              <span class="component-id">ID: {componentItem.id}</span>
            {/if}
          </div>
        </button>

        {#if expandedComponentId === componentItem.id}
          <div class="expanded-component-header">
            <div class="component-meta">
              <span class="meta-item">ID: {componentItem.id}</span>
            </div>
          </div>
          <div class="component-properties">
            <ComponentPropertiesPanel
              component={componentItem}
              {currentBreakpoint}
              {colorTheme}
              {colorThemes}
              {isContentEditable}
              selectedChildId={selectedComponent?.id !== componentItem.id
                ? selectedComponent?.id || null
                : null}
              onDeleteChild={(childId) => {
                // For components with inline children, we need to update the parent's config
                // rather than dispatching a deleteComponent event
                const usesInlineChildren =
                  componentItem.type === 'navbar' ||
                  componentItem.type === 'footer' ||
                  componentItem.type === 'container' ||
                  componentItem.type === 'dropdown' ||
                  componentItem.type === 'columns';

                if (usesInlineChildren) {
                  // The child was already removed from config.children in ComponentPropertiesPanel
                  // The handleImmediateUpdate will dispatch the updated config
                  // No need to dispatch deleteComponent since it's not in pageComponents
                } else {
                  // For other component types that might store children separately
                  dispatch('deleteComponent', childId);
                }
              }}
              onUpdate={(config) => {
                // Use the component ID to find the current version from pageComponents
                // This avoids closure issues where componentItem might be stale
                const currentComponent = pageComponents.find((c) => c.id === componentItem.id);
                if (currentComponent) {
                  // Check if this is a component type that stores children inline
                  // vs one that uses parent_id references
                  const usesInlineChildren =
                    componentItem.type === 'navbar' ||
                    componentItem.type === 'footer' ||
                    componentItem.type === 'container' ||
                    componentItem.type === 'dropdown' ||
                    componentItem.type === 'columns';

                  if (usesInlineChildren) {
                    // For components with inline children, keep children in config as-is
                    const updatedComponent = { ...currentComponent, config };
                    dispatch('updateComponent', updatedComponent);
                  } else {
                    // For other components that might use parent_id references
                    // Strip children from config and dispatch updates for each child

                    const { children: configChildren, ...configWithoutChildren } = config;
                    const updatedComponent = {
                      ...currentComponent,
                      config: configWithoutChildren
                    };
                    dispatch('updateComponent', updatedComponent);

                    // Dispatch updates for children with correct parent_id
                    if (configChildren && Array.isArray(configChildren)) {
                      dispatchNestedChildUpdates(configChildren, componentItem.id, dispatch);
                    }
                  }
                }
              }}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</aside>

<style>
  .builder-properties-panel {
    width: 320px;
    background: var(--color-bg-primary);
    border-left: 1px solid var(--color-border-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
  }

  .component-section {
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .component-section:last-child {
    border-bottom: none;
  }

  .component-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    width: 100%;
    background: var(--color-bg-secondary);
    border: none;
    border-bottom: 1px solid var(--color-border-secondary);
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: capitalize;
  }

  .component-section-header:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .component-section-header.expanded {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .component-section-header.selected {
    border-left: 3px solid var(--color-primary);
  }

  .component-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 0;
  }

  .component-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .component-id {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .expanded-component-header {
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .component-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .page-properties {
    display: flex;
    flex-direction: column;
  }

  .panel-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .tab {
    flex: 1;
    padding: 0.75rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    background: var(--color-bg-secondary);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 600;
  }

  .tab-content {
    padding: 1rem;
    overflow-y: auto;
  }

  .property-section {
    margin-bottom: 2rem;
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 0.875rem;
    font-style: italic;
  }

  .property-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .property-field {
    margin-bottom: 1rem;
  }

  .property-field label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .property-field input[type='text'] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }

  .property-field input[type='text']:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .property-field input[type='text'].readonly {
    opacity: 0.7;
    cursor: not-allowed;
    background: var(--color-bg-tertiary);
  }

  .property-field small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
  }

  .property-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .property-field.half {
    flex: 1;
    margin-bottom: 0;
  }

  .property-field select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .property-field select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .media-preview {
    position: relative;
    margin-bottom: 1rem;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border-secondary);
  }

  .media-preview img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  .media-preview .btn-remove {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-danger, rgba(239, 68, 68, 0.9));
    color: var(--color-bg-primary, white);
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .media-preview .btn-remove:hover {
    background: var(--color-danger-hover, rgba(220, 38, 38, 1));
  }

  .media-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .media-actions :global(.upload-button) {
    flex: 1;
  }

  .btn-secondary {
    flex: 1;
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .media-browser-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-overlay, rgba(0, 0, 0, 0.7));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 2rem;
  }

  .media-browser-content {
    background: var(--color-bg-primary);
    border-radius: 12px;
    width: 95vw;
    height: 90vh;
    max-width: 1400px;
    max-height: 900px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .media-browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--color-border-secondary);
    flex-shrink: 0;
  }

  .media-browser-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .modal-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0.5rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .modal-close-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  /* Spacing grid for padding/margin controls */
  .spacing-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .spacing-grid .property-field {
    margin-bottom: 0;
  }

  .spacing-grid input[type='number'] {
    width: 100%;
  }

  /* Quick buttons for border radius, shadows, etc. */
  .quick-buttons {
    display: flex;
    gap: 4px;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .quick-btn {
    flex: 1;
    min-width: 40px;
    padding: 6px 8px;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }

  .quick-btn:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light, #eff6ff);
    color: var(--color-primary);
  }

  .quick-btn:active {
    transform: scale(0.95);
  }

  /* Range input styling */
  .property-field input[type='range'] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--color-border-secondary);
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .property-field input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .property-field input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  /* Number inputs */
  .property-field input[type='number'] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    font-size: 0.875rem;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .property-field input[type='number']::-webkit-outer-spin-button,
  .property-field input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .property-field input[type='number']:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  @media (max-width: 1024px) {
    .builder-properties-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    }
  }
</style>
