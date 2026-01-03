<script lang="ts">
  /**
   * Pricing - Container-based pricing component
   * Built using the same architecture as Hero, NavBar, and Footer components
   *
   * Architecture:
   * - Uses children array for component composition
   * - ContainerDropZone for builder mode drag-drop editing
   * - Direct child rendering for frontend display
   * - Default children structure creates the visual design
   */
  import type {
    WidgetConfig,
    ColorTheme,
    PageComponent,
    ComponentConfig,
    Breakpoint,
    ComponentType
  } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { createUserContext } from '$lib/utils/templateSubstitution';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';
  import ContainerDropZone from '$lib/components/builder/ContainerDropZone.svelte';
  import { getDefaultConfig } from '$lib/utils/editor/componentDefaults';

  export let config: WidgetConfig;
  export let colorTheme: ColorTheme = 'vibrant';
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;

  // Builder mode props - enables WYSIWYG editing while maintaining visual fidelity
  export let isEditable = false;
  export let onUpdate: ((config: ComponentConfig) => void) | undefined = undefined;
  export let onSelectComponent: ((component: PageComponent) => void) | undefined = undefined;
  export let currentBreakpoint: Breakpoint = 'desktop';
  export let componentId = ''; // Required for container-based pricing
  export let pageId = ''; // Required for creating new child components

  // Create user context for template substitution (passed to children)
  $: userContext = createUserContext(user);
  $: _templateContext = { site: siteContext, user: userContext };

  // Get children from config
  $: children = (config.children as PageComponent[] | undefined) || [];
  $: hasChildren = children.length > 0;

  // Container styling from config
  $: containerBackground = resolveThemeColor(
    config.containerBackground || config.backgroundColor,
    colorTheme,
    'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
    true
  );
  $: containerMinHeight = getBreakpointValue(config.containerMinHeight) || 'auto';
  $: containerPadding = getBreakpointValue(config.containerPadding);
  $: containerMaxWidth = config.containerMaxWidth || '100%';
  $: containerDisplay = getBreakpointValue(config.containerDisplay) || 'flex';
  $: containerFlexDirection = getBreakpointValue(config.containerFlexDirection) || 'column';
  $: containerJustifyContent = config.containerJustifyContent || 'center';
  $: containerAlignItems = config.containerAlignItems || 'center';
  $: containerGap = getBreakpointValue(config.containerGap) || 48;

  function getBreakpointValue<T>(
    value: T | { mobile?: T; tablet?: T; desktop: T } | undefined
  ): T | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      const responsive = value as { mobile?: T; tablet?: T; desktop: T };
      return responsive[currentBreakpoint] ?? responsive.desktop;
    }
    return value as T;
  }

  // Handle dropping a new component into the pricing container
  function handleContainerDrop(
    event: CustomEvent<{ containerId: string; componentType: string; insertIndex: number }>
  ): void {
    if (!onUpdate) return;
    const { componentType: rawComponentType, insertIndex } = event.detail;

    // Determine the actual component type and config
    let actualType: ComponentType;
    let componentConfig: ComponentConfig;

    // Check if this is a custom component reference (format: "component:123")
    if (rawComponentType.startsWith('component:')) {
      const refComponentId = parseInt(rawComponentType.split(':')[1]);
      actualType = 'component_ref';
      componentConfig = { componentId: refComponentId };
    } else {
      actualType = rawComponentType as ComponentType;
      componentConfig = getDefaultConfig(actualType);
    }

    const newChild: PageComponent = {
      id: `temp-${Date.now()}`,
      type: actualType,
      config: componentConfig,
      position: insertIndex,
      page_id: pageId,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Update this component's children
    const updatedChildren = [...children];
    updatedChildren.splice(insertIndex, 0, newChild);

    // Update positions for all children to match their array index
    const childrenWithUpdatedPositions = updatedChildren.map((child, index) => ({
      ...child,
      position: index
    }));

    onUpdate({ ...config, children: childrenWithUpdatedPositions });
  }

  // Handle reordering components within the pricing container
  function handleContainerReorder(
    event: CustomEvent<{ containerId: string; fromIndex: number; toIndex: number }>
  ): void {
    if (!onUpdate) return;
    const { fromIndex, toIndex } = event.detail;

    const updatedChildren = [...children];
    const [movedComponent] = updatedChildren.splice(fromIndex, 1);
    updatedChildren.splice(toIndex, 0, movedComponent);

    // Update positions for all children to match their array index
    const childrenWithUpdatedPositions = updatedChildren.map((child, index) => ({
      ...child,
      position: index
    }));

    onUpdate({ ...config, children: childrenWithUpdatedPositions });
  }

  function handleChildClick(event: CustomEvent<{ childId: string }>): void {
    const { childId } = event.detail;
    const childComponent = children.find((child) => child.id === childId);
    if (childComponent && onSelectComponent) {
      onSelectComponent(childComponent);
    }
  }

  // Handle deleting a child component from the pricing container
  function handleChildDelete(event: CustomEvent<{ childId: string; index: number }>): void {
    if (!onUpdate) return;
    const { index } = event.detail;

    const updatedChildren = [...children];
    updatedChildren.splice(index, 1);

    // Update positions for all remaining children
    const childrenWithUpdatedPositions = updatedChildren.map((child, idx) => ({
      ...child,
      position: idx
    }));

    onUpdate({ ...config, children: childrenWithUpdatedPositions });
  }
</script>

{#if hasChildren || isEditable}
  <!-- Container-based Pricing with children (new architecture) -->
  <section
    class="pricing-container"
    class:is-editable={isEditable}
    id={config.anchorName || undefined}
    style="
      background: {containerBackground};
      min-height: {containerMinHeight};
      max-width: {containerMaxWidth};
      width: 100%;
      box-sizing: border-box;
      padding: {containerPadding
      ? `${containerPadding.top || 0}px ${containerPadding.right || 0}px ${containerPadding.bottom || 0}px ${containerPadding.left || 0}px`
      : '80px 24px'};
    "
  >
    {#if isEditable}
      <!-- Editable mode: use ContainerDropZone for drag-drop -->
      <ContainerDropZone
        containerId={componentId}
        {children}
        isActive={false}
        allowedTypes={[]}
        displayMode={containerDisplay === 'grid' ? 'grid' : 'flex'}
        showLayoutHints={true}
        label="Pricing Section"
        containerStyles="
          display: {containerDisplay};
          flex-direction: {containerFlexDirection};
          justify-content: {containerJustifyContent};
          align-items: {containerAlignItems};
          gap: {containerGap}px;
          min-height: {containerMinHeight};
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        "
        on:drop={handleContainerDrop}
        on:reorder={handleContainerReorder}
        on:childClick={handleChildClick}
        on:delete={handleChildDelete}
      >
        <svelte:fragment slot="child" let:child>
          <slot name="child" {child} />
        </svelte:fragment>
      </ContainerDropZone>
    {:else}
      <!-- Frontend mode: render children directly -->
      <div
        class="pricing-content-wrapper"
        style="
          display: {containerDisplay};
          flex-direction: {containerFlexDirection};
          justify-content: {containerJustifyContent};
          align-items: {containerAlignItems};
          gap: {containerGap}px;
          min-height: {containerMinHeight};
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        "
      >
        {#each children as child (child.id)}
          <slot name="child" {child} />
        {/each}
      </div>
    {/if}
  </section>
{:else}
  <!-- Empty state when no children and not in edit mode -->
  <section
    class="pricing-container pricing-empty"
    id={config.anchorName || undefined}
    style="
      background: {containerBackground};
      min-height: 400px;
      padding: 80px 24px;
    "
  >
    <div class="empty-message">
      <span class="empty-icon">💎</span>
      <p>Pricing section - Add components to customize</p>
    </div>
  </section>
{/if}

<style>
  .pricing-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .pricing-container.is-editable {
    min-height: 400px;
  }

  .pricing-content-wrapper {
    width: 100%;
  }

  .pricing-empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-message {
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }

  .empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }

  .empty-message p {
    margin: 0;
    font-size: 1rem;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .pricing-container {
      padding: 48px 16px;
    }
  }
</style>
