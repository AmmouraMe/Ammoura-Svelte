<script lang="ts">
  import type {
    WidgetConfig,
    ColorTheme,
    PageComponent,
    ComponentConfig,
    Breakpoint,
    ComponentType
  } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
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
  export let componentId = ''; // Required for container-based hero
  export let pageId = ''; // Required for creating new child components

  // Helper to substitute templates if site context is available
  $: userContext = createUserContext(user);
  const sub = (text: string): string =>
    siteContext ? substituteTemplate(text, { site: siteContext, user: userContext }) : text;

  // Check if this hero uses container-based architecture (has children)
  $: children = (config.children as PageComponent[] | undefined) || [];
  $: hasChildren = children.length > 0;

  // Legacy hero props (for backward compatibility)
  $: title = sub(config.title || 'Hero Title');
  $: subtitle = sub(config.subtitle || '');
  $: ctaText = sub(config.ctaText || '');
  $: ctaLink = config.ctaLink || '#';
  $: ctaBackgroundColor = resolveThemeColor(config.ctaBackgroundColor, colorTheme, '#ffffff', true);
  $: ctaTextColor = resolveThemeColor(config.ctaTextColor, colorTheme, '#3b82f6', true);
  $: ctaFontSize = config.ctaFontSize || '16px';
  $: ctaFontWeight = config.ctaFontWeight || '600';
  $: secondaryCtaText = sub(config.secondaryCtaText || '');
  $: secondaryCtaLink = config.secondaryCtaLink || '#';
  $: secondaryCtaBackgroundColor = resolveThemeColor(
    config.secondaryCtaBackgroundColor,
    colorTheme,
    'transparent',
    true
  );
  $: secondaryCtaTextColor = resolveThemeColor(
    config.secondaryCtaTextColor,
    colorTheme,
    '#ffffff',
    true
  );
  $: secondaryCtaBorderColor = resolveThemeColor(
    config.secondaryCtaBorderColor,
    colorTheme,
    '#ffffff',
    true
  );
  $: secondaryCtaFontSize = config.secondaryCtaFontSize || '16px';
  $: secondaryCtaFontWeight = config.secondaryCtaFontWeight || '600';
  $: backgroundImage = config.backgroundImage || '';
  $: backgroundColor = resolveThemeColor(config.backgroundColor, colorTheme, '#f0f0f0', true);
  $: textColor =
    resolveThemeColor(config.textColor, colorTheme, '', true) ||
    (overlay || backgroundImage ? '#ffffff' : 'var(--theme-text)');
  $: titleColor = resolveThemeColor(config.titleColor, colorTheme, '', true) || textColor;
  $: subtitleColor = resolveThemeColor(config.subtitleColor, colorTheme, '', true) || textColor;
  $: heroHeight = config.heroHeight || '500px';
  $: contentAlign = config.contentAlign || 'center';
  $: overlay = config.overlay ?? false;
  $: overlayOpacity = config.overlayOpacity ?? 50;

  // Container-based hero styling (new architecture)
  $: containerBackground = config.containerBackground || config.backgroundColor || 'transparent';
  $: containerMinHeight = getBreakpointValue(config.containerMinHeight) || '500px';
  $: containerPadding = getBreakpointValue(config.containerPadding);
  $: containerMaxWidth = config.containerMaxWidth || '100%';
  $: containerDisplay = getBreakpointValue(config.containerDisplay) || 'flex';
  $: containerFlexDirection = getBreakpointValue(config.containerFlexDirection) || 'column';
  $: containerJustifyContent = config.containerJustifyContent || 'center';
  $: containerAlignItems = config.containerAlignItems || 'center';
  $: containerGap = getBreakpointValue(config.containerGap) || 24;

  // Local state for contenteditable fields (legacy mode)
  let titleElement: HTMLElement | undefined;
  let subtitleElement: HTMLElement | undefined;
  let isEditingTitle = false;
  let isEditingSubtitle = false;

  // Sync component config to contenteditable when NOT editing
  $: if (titleElement && !isEditingTitle) {
    titleElement.textContent = sub(config.title || 'Hero Title');
  }
  $: if (subtitleElement && !isEditingSubtitle) {
    subtitleElement.textContent = sub(config.subtitle || 'Click to add subtitle');
  }

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

  // Handle inline editing for legacy hero
  function handleTitleFocus(): void {
    isEditingTitle = true;
    if (titleElement) {
      titleElement.textContent = config.title || 'Hero Title';
    }
  }

  function handleTitleBlur(): void {
    isEditingTitle = false;
  }

  function handleTitleInput(): void {
    if (!onUpdate || !titleElement) return;
    const newValue = titleElement.textContent || '';
    onUpdate({ ...config, title: newValue });
  }

  function handleSubtitleFocus(): void {
    isEditingSubtitle = true;
    if (subtitleElement) {
      subtitleElement.textContent = config.subtitle || '';
    }
  }

  function handleSubtitleBlur(): void {
    isEditingSubtitle = false;
  }

  function handleSubtitleInput(): void {
    if (!onUpdate || !subtitleElement) return;
    const newValue = subtitleElement.textContent || '';
    onUpdate({ ...config, subtitle: newValue });
  }

  // Handle dropping a new component into the hero container
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

  // Handle reordering components within the hero container
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

  // Handle deleting a child component from the hero container
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

{#if hasChildren || (isEditable && config.containerBackground)}
  <!-- Container-based Hero with children (new architecture) -->
  <!-- Uses the same visual styling as legacy but supports drag-drop editing -->
  <section
    class="hero-container"
    class:is-editable={isEditable}
    id={config.anchorName || undefined}
    style="
      background: {resolveThemeColor(containerBackground, colorTheme, 'transparent', true)};
      min-height: {containerMinHeight};
      max-width: {containerMaxWidth};
      width: 100%;
      box-sizing: border-box;
      padding: {containerPadding
      ? `${containerPadding.top || 0}px ${containerPadding.right || 0}px ${containerPadding.bottom || 0}px ${containerPadding.left || 0}px`
      : '0'};
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
        label="Hero Section"
        containerStyles="
          display: {containerDisplay};
          flex-direction: {containerFlexDirection};
          justify-content: {containerJustifyContent};
          align-items: {containerAlignItems};
          gap: {containerGap}px;
          min-height: {containerMinHeight};
          width: 100%;
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
        class="hero-content-wrapper"
        style="
          display: {containerDisplay};
          flex-direction: {containerFlexDirection};
          justify-content: {containerJustifyContent};
          align-items: {containerAlignItems};
          gap: {containerGap}px;
          min-height: {containerMinHeight};
          width: 100%;
        "
      >
        {#each children as child (child.id)}
          <slot name="child" {child} />
        {/each}
      </div>
    {/if}
  </section>
{:else}
  <!-- Legacy Hero format (for backward compatibility) -->
  <div
    class="hero-widget"
    class:is-editable={isEditable}
    id={config.anchorName || undefined}
    style="
      height: {heroHeight};
      background-image: {backgroundImage ? `url(${backgroundImage})` : 'none'};
      background-color: {backgroundColor};
      background-size: cover;
      background-position: center;
      text-align: {contentAlign};
    "
  >
    {#if overlay}
      <div class="hero-overlay" style="opacity: {overlayOpacity / 100}" />
    {/if}
    <div class="hero-content" style="color: {textColor};">
      {#if isEditable}
        <!-- Editable title -->
        <h1
          bind:this={titleElement}
          contenteditable="true"
          on:input={handleTitleInput}
          on:focus={handleTitleFocus}
          on:blur={handleTitleBlur}
          on:keydown|stopPropagation={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          on:keypress|stopPropagation
          style="color: {titleColor};"
          class="editable"
          data-field="title"
        >
          {title}
        </h1>
        <!-- Editable subtitle -->
        <p
          bind:this={subtitleElement}
          contenteditable="true"
          on:input={handleSubtitleInput}
          on:focus={handleSubtitleFocus}
          on:blur={handleSubtitleBlur}
          on:keydown|stopPropagation
          on:keypress|stopPropagation
          style="display: block; color: {subtitleColor};"
          class="editable"
          data-field="subtitle"
          data-placeholder="Click to add subtitle"
        ></p>
      {:else}
        <!-- Static title -->
        <h1 style="color: {titleColor};">{title}</h1>
        {#if subtitle}
          <p style="color: {subtitleColor};">{subtitle}</p>
        {/if}
      {/if}
      {#if ctaText || secondaryCtaText}
        <div class="hero-cta-group">
          {#if ctaText}
            <a
              href={isEditable ? undefined : ctaLink}
              class="hero-cta hero-cta-primary"
              style="
                background-color: {ctaBackgroundColor};
                color: {ctaTextColor};
                font-size: {ctaFontSize};
                font-weight: {ctaFontWeight};
              "
              on:click|preventDefault={() => {}}
            >
              {ctaText}
            </a>
          {/if}
          {#if secondaryCtaText}
            <a
              href={isEditable ? undefined : secondaryCtaLink}
              class="hero-cta hero-cta-secondary"
              style="
                background-color: {secondaryCtaBackgroundColor};
                color: {secondaryCtaTextColor};
                border-color: {secondaryCtaBorderColor};
                font-size: {secondaryCtaFontSize};
                font-weight: {secondaryCtaFontWeight};
              "
              on:click|preventDefault={() => {}}
            >
              {secondaryCtaText}
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .hero-widget {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: black;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    padding: 2rem;
    max-width: 800px;
  }

  .hero-content h1 {
    font-size: 2.5rem;
    margin: 0 0 1rem 0;
    padding: 0;
  }

  .hero-content p {
    font-size: 1.25rem;
    margin: 0 0 1.5rem 0;
    opacity: 0.9;
  }

  .hero-cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .hero-cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .hero-cta-secondary {
    border: 2px solid;
  }

  .hero-cta-secondary:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  /* Container-based Hero styles */
  .hero-container {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .hero-content-wrapper {
    width: 100%;
    height: 100%;
  }

  /* Editable state styles */
  .hero-content h1.editable,
  .hero-content p.editable {
    outline: none;
    cursor: text;
  }

  .hero-content h1.editable:focus,
  .hero-content p.editable:focus {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
    border-radius: 4px;
  }

  .hero-content p.editable:empty::before {
    content: attr(data-placeholder);
    opacity: 0.5;
  }

  .hero-content p.editable {
    min-height: 1.5em;
  }

  /* Edit mode indicator */
  .hero-widget.is-editable,
  .hero-container.is-editable {
    position: relative;
  }

  @media (max-width: 768px) {
    .hero-content h1 {
      font-size: 2rem;
    }

    .hero-content p {
      font-size: 1rem;
    }
  }
</style>
