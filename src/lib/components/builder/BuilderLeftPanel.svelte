<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { LayoutGrid, SlidersHorizontal, ChevronLeft, X } from 'lucide-svelte';
  import type {
    PageComponent,
    Component,
    ColorThemeDefinition,
    ColorTheme
  } from '$lib/types/pages';
  import BuilderSidebar from './BuilderSidebar.svelte';
  import BuilderPropertiesPanel from './BuilderPropertiesPanel.svelte';

  type BuilderMode = 'page' | 'layout' | 'component' | 'primitive';
  type LeftPanelTab = 'components' | 'properties';

  export let mode: BuilderMode = 'page';
  export let pageComponents: PageComponent[] = [];
  export let title: string;
  export let slug: string;
  export let components: Component[] = [];
  export let currentComponentId: number | null = null;
  export let isBuiltIn = false;
  export let collapsed = false;
  // Whether adding components is allowed (false in primitive mode)
  export let canAddComponents = true;
  // Mobile view state
  export let isMobileView = false;

  // Properties panel props
  export let selectedComponent: PageComponent | null = null;
  export let pageProperties:
    | {
        backgroundColor: string;
        backgroundImage: string;
        minHeight: string;
        borderColor?: string;
        borderWidth?: string;
        borderStyle?: string;
        borderRadius?: string;
        padding?: string;
        boxShadow?: string;
      }
    | undefined = undefined;
  export let currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  export let colorTheme: ColorTheme = 'default';
  export let colorThemes: ColorThemeDefinition[] = [];
  // Whether content editing is allowed (false in layout mode - only structure editing allowed)
  export let isContentEditable = true;

  // Entity label based on mode
  $: entityLabel =
    mode === 'page'
      ? 'Page'
      : mode === 'layout'
        ? 'Layout'
        : mode === 'primitive'
          ? 'Primitive'
          : 'Component';

  const dispatch = createEventDispatcher();

  // Default to properties tab if components can't be added (primitive mode)
  let activeTab: LeftPanelTab = canAddComponents ? 'components' : 'properties';

  // Auto-switch to properties tab when a component is selected
  $: if (selectedComponent) {
    activeTab = 'properties';
  }

  // Build tabs list - exclude components tab in primitive mode
  $: tabs = [
    ...(canAddComponents
      ? [{ id: 'components' as LeftPanelTab, label: 'Components', icon: LayoutGrid }]
      : []),
    { id: 'properties' as LeftPanelTab, label: 'Properties', icon: SlidersHorizontal }
  ];

  function handleToggle(): void {
    dispatch('toggle');
  }

  function handleClose(): void {
    dispatch('close');
  }
</script>

<aside class="builder-left-panel" class:collapsed class:mobile={isMobileView}>
  {#if collapsed && !isMobileView}
    <button type="button" class="collapsed-toggle" on:click={handleToggle} title="Expand panel">
      <LayoutGrid size={20} />
      <span class="collapsed-label">Panel</span>
    </button>
  {:else if !collapsed}
    <div class="panel-header">
      <!-- Mobile close button -->
      {#if isMobileView}
        <button type="button" class="btn-mobile-close" on:click={handleClose} title="Close panel">
          <X size={20} />
        </button>
      {/if}
      <div class="tab-bar">
        {#each tabs as tab}
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === tab.id}
            on:click={() => (activeTab = tab.id)}
            title={tab.label}
          >
            <svelte:component this={tab.icon} size={16} />
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      </div>
      <button type="button" class="btn-collapse" on:click={handleToggle} title="Collapse panel">
        <ChevronLeft size={18} />
      </button>
    </div>

    <div class="panel-content">
      {#if activeTab === 'components'}
        <div class="components-wrapper">
          <BuilderSidebar
            {mode}
            {pageComponents}
            {title}
            {slug}
            {components}
            {currentComponentId}
            {isBuiltIn}
            showPageSettings={false}
            showComponentsHeader={false}
            on:addComponent
            on:selectComponent
            on:componentDragStart
            on:componentDragEnd
            on:showPageProperties={() => {
              dispatch('showPageProperties');
              activeTab = 'properties';
            }}
            on:updateTitle
            on:updateSlug
            on:close={handleToggle}
          />
        </div>
      {:else if activeTab === 'properties'}
        <div class="properties-wrapper">
          {#if selectedComponent || pageProperties}
            <BuilderPropertiesPanel
              {pageComponents}
              {selectedComponent}
              {pageProperties}
              {currentBreakpoint}
              {colorTheme}
              {colorThemes}
              {entityLabel}
              {components}
              {isContentEditable}
              {title}
              {slug}
              {mode}
              {isBuiltIn}
              showHeader={false}
              on:selectComponent
              on:selectWidget
              on:updateComponent
              on:deleteComponent
              on:updatePageProperties
              on:updateTitle
              on:updateSlug
              on:close={() => {
                dispatch('deselectComponent');
              }}
            />
          {:else}
            <div class="empty-properties">
              <SlidersHorizontal size={32} />
              <p>Select a component to edit its properties</p>
              <button class="btn-show-page-props" on:click={() => dispatch('showPageProperties')}>
                Edit {entityLabel} Properties
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .builder-left-panel {
    width: 320px;
    height: 100%;
    background: var(--color-bg-primary);
    border-right: 1px solid var(--color-border-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: width 0.2s ease;
  }

  .builder-left-panel.collapsed {
    width: 48px;
  }

  .collapsed-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    height: 100%;
    padding: 1rem 0.5rem;
    background: var(--color-bg-primary);
    border: none;
    border-right: 1px solid var(--color-border-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .collapsed-toggle:hover {
    background: var(--color-bg-secondary);
    color: var(--color-primary);
  }

  .collapsed-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
    flex-shrink: 0;
  }

  .tab-bar {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .tab-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex: 1;
    padding: 0.75rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-button:hover:not(.active) {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .tab-button.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    background: var(--color-bg-primary);
  }

  .tab-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-collapse {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 100%;
    padding: 0;
    background: transparent;
    border: none;
    border-left: 1px solid var(--color-border-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-collapse:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .components-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  /* Override BuilderSidebar styles when embedded */
  .components-wrapper :global(.builder-sidebar) {
    width: 100%;
    border-right: none;
  }

  .properties-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  /* Override BuilderPropertiesPanel styles when embedded */
  .properties-wrapper :global(.builder-properties-panel) {
    width: 100%;
    border-left: none;
    position: static;
  }

  .empty-properties {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    height: 100%;
  }

  .empty-properties p {
    margin: 0;
    font-size: 0.875rem;
  }

  .btn-show-page-props {
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-show-page-props:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  /* Mobile close button */
  .btn-mobile-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: transparent;
    border: none;
    border-right: 1px solid var(--color-border-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
    flex-shrink: 0;
  }

  .btn-mobile-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  /* Mobile styles using class instead of media query */
  .builder-left-panel.mobile {
    position: fixed;
    top: 56px; /* Below mobile toolbar */
    left: 0;
    bottom: 0;
    width: 85%;
    max-width: 360px;
    height: auto;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }

  .builder-left-panel.mobile:not(.collapsed) {
    transform: translateX(0);
  }

  .builder-left-panel.mobile.collapsed {
    transform: translateX(-100%);
    width: 0;
  }

  .builder-left-panel.mobile .tab-label {
    display: block;
  }

  .builder-left-panel.mobile .panel-header {
    padding-right: 0;
  }

  .builder-left-panel.mobile .btn-collapse {
    display: none;
  }

  /* Desktop media query for hiding collapsed toggle on mobile */
  @media (max-width: 767px) {
    .builder-left-panel:not(.mobile).collapsed {
      display: none;
    }
  }
</style>
