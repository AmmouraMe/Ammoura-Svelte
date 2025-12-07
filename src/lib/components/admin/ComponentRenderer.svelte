<script lang="ts">
  import type {
    PageComponent,
    Breakpoint,
    ComponentConfig,
    ColorTheme,
    ComponentType
  } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
  import {
    applyThemeColors,
    generateThemeStyles,
    resolveThemeColor
  } from '$lib/utils/editor/colorThemes';
  import { getDefaultConfig } from '$lib/utils/editor/componentDefaults';
  import ContainerDropZone from '$lib/components/builder/ContainerDropZone.svelte';
  import IconDisplay from './IconDisplay.svelte';

  export let component: PageComponent;
  export let currentBreakpoint: Breakpoint;
  export let colorTheme: ColorTheme = 'default';
  export let onUpdate: ((config: ComponentConfig) => void) | undefined = undefined;
  export let isEditable = false; // Whether we're in edit mode (builder)
  export let siteContext: SiteContext | undefined = undefined; // Site context for template substitution
  export let user: UserInfo | null | undefined = undefined; // User context for template substitution
  // Callback for when a child component is selected (for containers)
  export let onSelectComponent: ((component: PageComponent) => void) | undefined = undefined;

  // Helper to substitute templates if site context is available
  $: userContext = createUserContext(user);
  const sub = (text: string): string =>
    siteContext ? substituteTemplate(text, { site: siteContext, user: userContext }) : text;

  $: themeColors = applyThemeColors(colorTheme, component.config.themeOverrides);

  // Local state for contenteditable fields
  let titleElement: HTMLElement | undefined;
  let subtitleElement: HTMLElement | undefined;

  // Track if we're currently editing to prevent external updates during typing
  let isEditingTitle = false;
  let isEditingSubtitle = false;

  // Track if a drag is happening over the dropdown
  let isDropdownDragOver = false;
  let dropdownDragCounter = 0; // Counter to handle nested drag events

  // Sync component config to contenteditable when NOT editing
  // When not editing, show substituted (rendered) values
  // When editing, show raw code (the original template)
  $: if (titleElement && !isEditingTitle) {
    const rawTitle = component.config.title || 'Hero Title';
    titleElement.textContent = sub(rawTitle);
  }
  $: if (subtitleElement && !isEditingSubtitle) {
    const rawSubtitle = component.config.subtitle || 'Click to add subtitle';
    subtitleElement.textContent = sub(rawSubtitle);
  }

  // Handle focus - show raw code
  function handleTitleFocus() {
    isEditingTitle = true;
    if (titleElement) {
      // Show the raw template code when focused
      titleElement.textContent = component.config.title || 'Hero Title';
    }
  }

  function handleSubtitleFocus() {
    isEditingSubtitle = true;
    if (subtitleElement) {
      // Show the raw template code when focused
      subtitleElement.textContent = component.config.subtitle || 'Click to add subtitle';
    }
  }

  // Handle blur - show rendered value
  function handleTitleBlur() {
    isEditingTitle = false;
    // The reactive statement will update the content to show the substituted value
  }

  function handleSubtitleBlur() {
    isEditingSubtitle = false;
    // The reactive statement will update the content to show the substituted value
  }

  function handleTitleInput() {
    if (!onUpdate || !titleElement) return;
    const newValue = titleElement.textContent || '';
    onUpdate({ ...component.config, title: newValue });
  }

  function handleSubtitleInput() {
    if (!onUpdate || !subtitleElement) return;
    const newValue = subtitleElement.textContent || '';
    onUpdate({ ...component.config, subtitle: newValue });
  }

  function getResponsiveValue<T>(value: T | { mobile?: T; tablet?: T; desktop: T }): T {
    if (typeof value === 'object' && value !== null && 'desktop' in value) {
      if (currentBreakpoint === 'mobile' && value.mobile !== undefined) {
        return value.mobile;
      }
      if (currentBreakpoint === 'tablet' && value.tablet !== undefined) {
        return value.tablet;
      }
      return value.desktop;
    }
    return value as T;
  }

  function getBreakpointValue<T>(
    value: T | { mobile?: T; tablet?: T; desktop?: T } | undefined,
    breakpoint: Breakpoint
  ): T | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const responsive = value as { mobile?: T; tablet?: T; desktop?: T };
      return responsive[breakpoint] ?? responsive.desktop ?? undefined;
    }
    return value as T;
  }

  // For featuresLimit, we want to return undefined if the breakpoint isn't explicitly set
  function getResponsiveLimitValue(
    value: { mobile?: number; tablet?: number; desktop?: number } | number | undefined
  ): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (currentBreakpoint === 'mobile') {
        return value.mobile;
      }
      if (currentBreakpoint === 'tablet') {
        return value.tablet;
      }
      return value.desktop;
    }
    return undefined;
  }

  // Helper to format grid template columns/rows
  function formatGridTemplate(
    value: string | number | undefined | null,
    defaultValue: string
  ): string {
    if (!value) return defaultValue;

    // Convert to string if it's a number
    const stringValue = String(value);

    // If it's a simple number (like "3"), convert to repeat syntax
    if (/^\d+$/.test(stringValue)) {
      return `repeat(${stringValue}, 1fr)`;
    }

    // If it already contains CSS units or keywords, use as-is
    return stringValue;
  }

  // Recursively find a container by ID in the component tree
  function findContainerInTree(
    components: PageComponent[],
    containerId: string
  ): { container: PageComponent; path: string[] } | null {
    for (const comp of components) {
      if (comp.id === containerId) {
        return { container: comp, path: [comp.id] };
      }
      if (comp.config.children && Array.isArray(comp.config.children)) {
        const found = findContainerInTree(comp.config.children, containerId);
        if (found) {
          return { container: found.container, path: [comp.id, ...found.path] };
        }
      }
    }
    return null;
  }

  // Recursively update a container's children at a given path
  function updateContainerChildren(
    components: PageComponent[],
    containerId: string,
    newChildren: PageComponent[]
  ): PageComponent[] {
    return components.map((comp) => {
      if (comp.id === containerId) {
        return { ...comp, config: { ...comp.config, children: newChildren } };
      }
      if (comp.config.children && Array.isArray(comp.config.children)) {
        return {
          ...comp,
          config: {
            ...comp.config,
            children: updateContainerChildren(comp.config.children, containerId, newChildren)
          }
        };
      }
      return comp;
    });
  }

  // Handle dropping a new component into a container
  function handleContainerDrop(
    event: CustomEvent<{ containerId: string; componentType: string; insertIndex: number }>
  ) {
    const { containerId, componentType: rawComponentType, insertIndex } = event.detail;

    // Determine the actual component type and config
    let actualType: ComponentType;
    let componentConfig: ComponentConfig;

    // Check if this is a custom component reference (format: "component:123")
    if (rawComponentType.startsWith('component:')) {
      const componentId = parseInt(rawComponentType.split(':')[1]);
      actualType = 'component_ref';
      componentConfig = { componentId };
    } else {
      actualType = rawComponentType as ComponentType;
      componentConfig = getDefaultConfig(actualType);
    }

    const newChild: PageComponent = {
      id: `temp-${Date.now()}`,
      type: actualType,
      config: componentConfig,
      position: insertIndex,
      page_id: component.page_id,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Check if the drop target is this component directly
    if (containerId === component.id) {
      // Update this component's children directly
      const updatedChildren = [...(component.config.children || [])];
      updatedChildren.splice(insertIndex, 0, newChild);

      // Update positions for all children to match their array index
      const childrenWithUpdatedPositions = updatedChildren.map((child, index) => ({
        ...child,
        position: index
      }));

      console.log('[ContainerDrop] Direct container drop:', {
        containerId,
        insertIndex,
        childrenBefore: (component.config.children || []).map((c: PageComponent) => ({
          id: c.id,
          position: c.position
        })),
        childrenAfter: childrenWithUpdatedPositions.map((c) => ({ id: c.id, position: c.position }))
      });

      if (onUpdate) {
        onUpdate({ ...component.config, children: childrenWithUpdatedPositions });
      } else {
        console.warn('[ContainerDrop] No onUpdate callback available!');
      }
    } else {
      // The drop target is a nested container - find it and update
      const currentChildren = component.config.children || [];
      const found = findContainerInTree(currentChildren, containerId);

      if (found) {
        const targetContainer = found.container;
        const targetChildren = [...(targetContainer.config.children || [])];
        targetChildren.splice(insertIndex, 0, newChild);

        // Update positions for all children to match their array index
        const childrenWithUpdatedPositions = targetChildren.map((child, index) => ({
          ...child,
          position: index
        }));

        // Update the tree with the new children
        const updatedChildren = updateContainerChildren(
          currentChildren,
          containerId,
          childrenWithUpdatedPositions
        );

        if (onUpdate) {
          onUpdate({ ...component.config, children: updatedChildren });
        } else {
          console.warn('[ContainerDrop] No onUpdate callback available!');
        }
      } else {
        console.warn(`[ContainerDrop] Could not find container with id: ${containerId}`);
      }
    }
  }

  // Handle clicking on a child component to select it
  function handleChildClick(event: CustomEvent<{ childId: string }>) {
    const { childId } = event.detail;
    // Find the child component and trigger selection
    const childComponent = (component.config.children || []).find(
      (child: PageComponent) => child.id === childId
    );
    if (childComponent && onSelectComponent) {
      onSelectComponent(childComponent);
    }
  }

  // Handle reordering components within a container
  function handleContainerReorder(
    event: CustomEvent<{ containerId: string; fromIndex: number; toIndex: number }>
  ) {
    const { containerId, fromIndex, toIndex } = event.detail;

    // Check if the reorder target is this component directly
    if (containerId === component.id) {
      const updatedChildren = [...(component.config.children || [])];
      const [movedComponent] = updatedChildren.splice(fromIndex, 1);
      updatedChildren.splice(toIndex, 0, movedComponent);

      // Update positions for all children to match their array index
      const childrenWithUpdatedPositions = updatedChildren.map((child, index) => ({
        ...child,
        position: index
      }));

      if (onUpdate) {
        onUpdate({ ...component.config, children: childrenWithUpdatedPositions });
      }
    } else {
      // The reorder target is a nested container - find it and update
      const currentChildren = component.config.children || [];
      const found = findContainerInTree(currentChildren, containerId);

      if (found) {
        const targetContainer = found.container;
        const targetChildren = [...(targetContainer.config.children || [])];
        const [movedComponent] = targetChildren.splice(fromIndex, 1);
        targetChildren.splice(toIndex, 0, movedComponent);

        // Update positions for all children to match their array index
        const childrenWithUpdatedPositions = targetChildren.map((child, index) => ({
          ...child,
          position: index
        }));

        // Update the tree with the new children
        const updatedChildren = updateContainerChildren(
          currentChildren,
          containerId,
          childrenWithUpdatedPositions
        );

        if (onUpdate) {
          onUpdate({ ...component.config, children: updatedChildren });
        }
      } else {
        console.warn(`[ContainerReorder] Could not find container with id: ${containerId}`);
      }
    }
  }

  // Create an onUpdate handler for a nested child component
  // This ensures that updates to nested children are properly propagated up the tree
  function createChildUpdateHandler(childId: string): (config: ComponentConfig) => void {
    const _parentId = component.id;
    const _parentType = component.type;
    const parentOnUpdate = onUpdate;

    return (newChildConfig: ComponentConfig) => {
      if (!parentOnUpdate) {
        console.warn('[createChildUpdateHandler] No onUpdate callback available!');
        return;
      }

      const currentChildren = component.config.children || [];

      const updatedChildren = currentChildren.map((child: PageComponent) =>
        child.id === childId ? { ...child, config: newChildConfig } : child
      );

      parentOnUpdate({ ...component.config, children: updatedChildren });
    };
  }

  function getStyleString(comp: PageComponent): string {
    const styles = comp.config.styles;
    if (!styles) return '';

    let styleStr = '';

    if (styles.padding) {
      const padding = getResponsiveValue(styles.padding);
      if (padding) {
        styleStr += `padding: ${padding.top || 0}px ${padding.right || 0}px ${padding.bottom || 0}px ${padding.left || 0}px;`;
      }
    }

    if (styles.margin) {
      const margin = getResponsiveValue(styles.margin);
      if (margin) {
        styleStr += `margin: ${margin.top || 0}px ${margin.right || 0}px ${margin.bottom || 0}px ${margin.left || 0}px;`;
      }
    }

    if (styles.textAlign) {
      styleStr += `text-align: ${getResponsiveValue(styles.textAlign)};`;
    }

    if (styles.width) {
      styleStr += `width: ${getResponsiveValue(styles.width)};`;
    }

    if (styles.height) {
      styleStr += `height: ${getResponsiveValue(styles.height)};`;
    }

    return styleStr;
  }

  // Generate position styles from config.position
  function getPositionStyleString(comp: PageComponent): string {
    const positionConfig = comp.config.position;
    if (!positionConfig) return '';

    // Handle legacy format where position might be a string
    if (typeof positionConfig === 'string') {
      if (positionConfig === 'static') return '';
      return `position: ${positionConfig};`;
    }

    // Get position values for current breakpoint, falling back to desktop
    const position = positionConfig[currentBreakpoint] || positionConfig.desktop;
    if (!position) return '';

    const posType = position.type;
    if (!posType || posType === 'static') return '';

    const styles: string[] = [`position: ${posType}`];
    if (position.top) styles.push(`top: ${position.top}`);
    if (position.right) styles.push(`right: ${position.right}`);
    if (position.bottom) styles.push(`bottom: ${position.bottom}`);
    if (position.left) styles.push(`left: ${position.left}`);
    if (position.zIndex !== undefined) styles.push(`z-index: ${position.zIndex}`);

    return styles.join('; ') + ';';
  }

  // Generate child layout styles for components inside containers
  function getChildLayoutStyles(childConfig: ComponentConfig): string {
    let styles = '';

    // Flex properties
    const flexGrow = getBreakpointValue(childConfig.layoutFlexGrow, currentBreakpoint);
    const flexShrink = getBreakpointValue(childConfig.layoutFlexShrink, currentBreakpoint);
    const flexBasis = getBreakpointValue(childConfig.layoutFlexBasis, currentBreakpoint);
    const alignSelf = getBreakpointValue(childConfig.layoutAlignSelf, currentBreakpoint);

    if (flexGrow !== undefined) styles += `flex-grow: ${flexGrow};`;
    if (flexShrink !== undefined) styles += `flex-shrink: ${flexShrink};`;
    if (flexBasis !== undefined && flexBasis !== 'auto') styles += `flex-basis: ${flexBasis};`;
    if (alignSelf !== undefined && alignSelf !== 'auto') styles += `align-self: ${alignSelf};`;

    // Grid properties
    const gridColumn = getBreakpointValue(childConfig.layoutGridColumn, currentBreakpoint);
    const gridRow = getBreakpointValue(childConfig.layoutGridRow, currentBreakpoint);
    const placeSelf = getBreakpointValue(childConfig.layoutPlaceSelf, currentBreakpoint);
    const justifySelf = getBreakpointValue(childConfig.layoutJustifySelf, currentBreakpoint);

    if (gridColumn !== undefined && gridColumn !== 'auto') styles += `grid-column: ${gridColumn};`;
    if (gridRow !== undefined && gridRow !== 'auto') styles += `grid-row: ${gridRow};`;
    if (placeSelf !== undefined && placeSelf !== 'auto') styles += `place-self: ${placeSelf};`;
    if (justifySelf !== undefined && justifySelf !== 'stretch')
      styles += `justify-self: ${justifySelf};`;

    // Order (works in both flex and grid)
    const order = getBreakpointValue(childConfig.layoutOrder, currentBreakpoint);
    if (order !== undefined && order !== 0) styles += `order: ${order};`;

    // Size constraints
    const width = getBreakpointValue(childConfig.layoutWidth, currentBreakpoint);
    const height = getBreakpointValue(childConfig.layoutHeight, currentBreakpoint);
    const minWidth = getBreakpointValue(childConfig.layoutMinWidth, currentBreakpoint);
    const maxWidth = getBreakpointValue(childConfig.layoutMaxWidth, currentBreakpoint);
    const minHeight = getBreakpointValue(childConfig.layoutMinHeight, currentBreakpoint);
    const maxHeight = getBreakpointValue(childConfig.layoutMaxHeight, currentBreakpoint);

    if (width !== undefined && width !== 'auto') styles += `width: ${width};`;
    if (height !== undefined && height !== 'auto') styles += `height: ${height};`;
    if (minWidth !== undefined && minWidth !== 'auto') styles += `min-width: ${minWidth};`;
    if (maxWidth !== undefined && maxWidth !== 'none') styles += `max-width: ${maxWidth};`;
    if (minHeight !== undefined && minHeight !== 'auto') styles += `min-height: ${minHeight};`;
    if (maxHeight !== undefined && maxHeight !== 'none') styles += `max-height: ${maxHeight};`;

    return styles;
  }

  // Declare reactive variables
  let styleString: string;
  let positionStyleString: string;
  let heroHeight: string;
  let buttonFullWidth: boolean;
  let spacerHeight: number;
  let dividerSpacing: number;
  let _columnsLayout: number;
  let columnsGap: number;
  let columnsCount: number;
  let productListColumns: number;
  let featuresColumns: number;
  let featuresGap: number;
  let featuresLimit: number | undefined;

  // Make all reactive computations depend on both component.config AND currentBreakpoint
  $: {
    // Explicitly read currentBreakpoint to establish reactive dependency
    // This ensures the block re-runs whenever currentBreakpoint changes
    const _bp = currentBreakpoint;

    styleString = getStyleString(component);
    positionStyleString = getPositionStyleString(component);
    heroHeight = getResponsiveValue(component.config.heroHeight || { desktop: '500px' });
    buttonFullWidth = getResponsiveValue(component.config.fullWidth || { desktop: false });
    spacerHeight = getResponsiveValue(component.config.space || { desktop: 40 });
    dividerSpacing = getResponsiveValue(component.config.spacing || { desktop: 20 });
    const _columnsLayout = getResponsiveValue(component.config.columns || { desktop: 2 });
    columnsGap = getResponsiveValue(component.config.gap || { desktop: 20 });
    columnsCount = getResponsiveValue(component.config.columnCount || { desktop: 2 });
    productListColumns = getResponsiveValue(
      component.config.columns || { desktop: 3, tablet: 2, mobile: 1 }
    );
    featuresColumns = getResponsiveValue(
      component.config.featuresColumns || { desktop: 3, tablet: 2, mobile: 1 }
    );
    featuresGap = getResponsiveValue(
      component.config.featuresGap || { desktop: 32, tablet: 24, mobile: 16 }
    );
    featuresLimit = getResponsiveLimitValue(component.config.featuresLimit);
  }
</script>

<div
  class="widget-renderer"
  style="{positionStyleString} {styleString} {generateThemeStyles(themeColors)}"
>
  {#if component.type === 'text'}
    <div
      class="text-widget"
      style="text-align: {component.config.alignment || 'left'}; 
             color: {component.config.textColor || 'inherit'};
             font-size: {component.config.fontSize ? component.config.fontSize + 'px' : 'inherit'};
             line-height: {component.config.lineHeight || 'inherit'};"
    >
      {#if component.config.html}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html sub(component.config.html)}
      {:else}
        <p>{sub(component.config.text || 'Enter your text here')}</p>
      {/if}
    </div>
  {:else if component.type === 'heading'}
    {@const textColor = resolveThemeColor(
      component.config.textColor,
      colorTheme,
      themeColors.text,
      true
    )}
    {@const headingStyle = `color: ${textColor}; text-align: ${component.config.alignment || 'left'};`}
    {#if component.config.level === 1}
      <h1 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h1>
    {:else if component.config.level === 2}
      <h2 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h2>
    {:else if component.config.level === 3}
      <h3 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h3>
    {:else if component.config.level === 4}
      <h4 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h4>
    {:else if component.config.level === 5}
      <h5 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h5>
    {:else}
      <h6 style={headingStyle}>{sub(component.config.heading || 'Heading')}</h6>
    {/if}
  {:else if component.type === 'image'}
    <div class="image-widget">
      {#if component.config.src}
        <img
          src={component.config.src}
          alt={component.config.alt || ''}
          style="width: {component.config.imageWidth || '100%'}; height: {component.config
            .imageHeight || 'auto'}; object-fit: {component.config.objectFit || 'cover'};"
        />
      {:else}
        <div class="image-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span>No image selected</span>
        </div>
      {/if}
    </div>
  {:else if component.type === 'hero'}
    {@const bgColor = resolveThemeColor(
      component.config.backgroundColor,
      colorTheme,
      themeColors.primary,
      true
    )}
    {@const ctaBgColor = resolveThemeColor(
      component.config.ctaBackgroundColor,
      colorTheme,
      '#ffffff',
      true
    )}
    {@const ctaTxtColor = resolveThemeColor(
      component.config.ctaTextColor,
      colorTheme,
      themeColors.primary,
      true
    )}
    {@const secondaryCtaBgColor = resolveThemeColor(
      component.config.secondaryCtaBackgroundColor,
      colorTheme,
      'transparent',
      true
    )}
    {@const secondaryCtaTxtColor = resolveThemeColor(
      component.config.secondaryCtaTextColor,
      colorTheme,
      '#ffffff',
      true
    )}
    {@const secondaryCtaBorderColor = resolveThemeColor(
      component.config.secondaryCtaBorderColor,
      colorTheme,
      '#ffffff',
      true
    )}
    {@const heroTextColor =
      resolveThemeColor(component.config.textColor, colorTheme, '', true) ||
      (component.config.overlay || component.config.backgroundImage
        ? '#ffffff'
        : `var(--theme-text)`)}
    {@const heroTitleColor =
      resolveThemeColor(component.config.titleColor, colorTheme, '', true) || heroTextColor}
    {@const heroSubtitleColor =
      resolveThemeColor(component.config.subtitleColor, colorTheme, '', true) || heroTextColor}
    <div
      class="hero-widget"
      style="
        height: {heroHeight};
        background-image: {component.config.backgroundImage
        ? `url(${component.config.backgroundImage})`
        : 'none'};
        background-color: {bgColor};
        background-size: cover;
        background-position: center;
        text-align: {component.config.contentAlign || 'center'};
      "
    >
      {#if component.config.overlay}
        <div
          class="hero-overlay"
          style="opacity: {component.config.overlayOpacity !== undefined
            ? component.config.overlayOpacity / 100
            : 0.5}"
        />
      {/if}
      <div class="hero-content" style="color: {heroTextColor};">
        <h1
          bind:this={titleElement}
          contenteditable="true"
          on:input={handleTitleInput}
          on:focus={handleTitleFocus}
          on:blur={handleTitleBlur}
          on:keydown={(e) => {
            // Prevent default behaviors that might interfere with editing
            if (e.key === 'Enter') {
              e.preventDefault();
            }
            // Stop propagation to prevent window-level handlers from interfering
            e.stopPropagation();
          }}
          on:keypress={(e) => {
            // Explicitly allow space and stop propagation
            e.stopPropagation();
          }}
          style="color: {heroTitleColor};"
          data-field="title"
        >
          {component.config.title || ''}
        </h1>
        <p
          bind:this={subtitleElement}
          contenteditable="true"
          on:input={handleSubtitleInput}
          on:focus={handleSubtitleFocus}
          on:blur={handleSubtitleBlur}
          on:keydown={(e) => {
            // Stop propagation to prevent window-level handlers from interfering
            e.stopPropagation();
          }}
          on:keypress={(e) => {
            // Explicitly allow space and stop propagation
            e.stopPropagation();
          }}
          style="display: block; color: {heroSubtitleColor};"
          data-field="subtitle"
        ></p>
        {#if component.config.ctaText || component.config.secondaryCtaText}
          <div class="hero-cta-group">
            {#if component.config.ctaText}
              <a
                href={component.config.ctaLink || '#'}
                class="hero-cta hero-cta-primary"
                style="
                  background-color: {ctaBgColor};
                  color: {ctaTxtColor};
                  font-size: {component.config.ctaFontSize || '16px'};
                  font-weight: {component.config.ctaFontWeight || '600'};
                "
                on:click|preventDefault={() => {}}
              >
                {sub(component.config.ctaText)}
              </a>
            {/if}
            {#if component.config.secondaryCtaText}
              <a
                href={component.config.secondaryCtaLink || '#'}
                class="hero-cta hero-cta-secondary"
                style="
                  background-color: {secondaryCtaBgColor};
                  color: {secondaryCtaTxtColor};
                  border-color: {secondaryCtaBorderColor};
                  font-size: {component.config.secondaryCtaFontSize || '16px'};
                  font-weight: {component.config.secondaryCtaFontWeight || '600'};
                "
                on:click|preventDefault={() => {}}
              >
                {sub(component.config.secondaryCtaText)}
              </a>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {:else if component.type === 'button'}
    <div class="button-widget">
      <button
        class="btn btn-{component.config.variant || 'primary'} btn-{component.config.size ||
          'medium'}"
        class:has-icon={component.config.icon}
        style="width: {buttonFullWidth ? '100%' : 'auto'}"
      >
        {#if component.config.icon}
          <span class="btn-icon">
            <IconDisplay iconName={component.config.icon} size={18} />
          </span>
        {/if}
        <span class="btn-label">{sub(component.config.label || 'Button')}</span>
      </button>
    </div>
  {:else if component.type === 'dropdown'}
    {@const triggerLabel = component.config.triggerLabel || component.config.label || 'Menu'}
    {@const triggerIcon = component.config.triggerIcon || ''}
    {@const showChevron = component.config.showChevron !== false}
    {@const triggerVariant = component.config.triggerVariant || 'text'}
    {@const menuWidth = component.config.menuWidth || '200px'}
    {@const menuAlign = component.config.menuAlign || 'left'}
    {@const menuBackground = component.config.menuBackground || 'var(--color-bg-primary)'}
    {@const menuBorderRadius = component.config.menuBorderRadius || 8}
    {@const menuPadding = component.config.menuPadding || { top: 8, right: 8, bottom: 8, left: 8 }}
    {@const dropdownChildren = component.config.children || []}
    <div
      class="dropdown-widget-container"
      class:drag-over={isDropdownDragOver}
      class:edit-mode={isEditable}
      role="region"
      aria-label="Dropdown component drop zone"
      on:dragenter={(e) => {
        e.preventDefault();
        dropdownDragCounter++;
        isDropdownDragOver = true;
      }}
      on:dragleave={() => {
        dropdownDragCounter--;
        if (dropdownDragCounter === 0) {
          isDropdownDragOver = false;
        }
      }}
      on:dragend={() => {
        dropdownDragCounter = 0;
        isDropdownDragOver = false;
      }}
      on:drop={() => {
        dropdownDragCounter = 0;
        isDropdownDragOver = false;
      }}
    >
      <!-- Trigger preview -->
      <div class="dropdown-trigger-preview variant-{triggerVariant}">
        {#if triggerIcon}
          <span class="trigger-icon">
            {#if triggerIcon === 'user'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle
                  cx="12"
                  cy="7"
                  r="4"
                /></svg
              >
            {:else}
              {triggerIcon}
            {/if}
          </span>
        {/if}
        {#if triggerVariant !== 'icon'}
          <span class="trigger-label">{sub(triggerLabel)}</span>
        {/if}
        {#if showChevron}
          <span class="trigger-chevron">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
            >
          </span>
        {/if}
      </div>
      <!-- Menu container: always visible in edit mode, otherwise only when dragging -->
      {#if isEditable || isDropdownDragOver}
        <div
          class="dropdown-menu-preview align-{menuAlign}"
          class:drag-target={isDropdownDragOver}
          class:always-visible={isEditable}
          style="
            min-width: {typeof menuWidth === 'number' ? `${menuWidth}px` : menuWidth};
            background: {menuBackground};
            border-radius: {menuBorderRadius}px;
            padding: {menuPadding.top}px {menuPadding.right}px {menuPadding.bottom}px {menuPadding.left}px;
          "
        >
          {#if isEditable}
            <ContainerDropZone
              containerId={component.id}
              children={dropdownChildren}
              isActive={false}
              allowedTypes={['button', 'text', 'heading', 'divider', 'image']}
              displayMode="flex"
              showLayoutHints={true}
              label="Dropdown Menu"
              containerStyles="flex-direction: column; gap: 4px;"
              on:drop={handleContainerDrop}
              on:reorder={handleContainerReorder}
              on:childClick={handleChildClick}
            >
              <svelte:fragment slot="child" let:child>
                <div class="dropdown-item-wrapper">
                  <svelte:self
                    component={child}
                    {currentBreakpoint}
                    {colorTheme}
                    onUpdate={createChildUpdateHandler(child.id)}
                    {isEditable}
                    {siteContext}
                    {user}
                    {onSelectComponent}
                  />
                </div>
              </svelte:fragment>
            </ContainerDropZone>
          {:else if dropdownChildren.length > 0}
            {#each dropdownChildren as child}
              <div class="dropdown-item">
                <svelte:self
                  component={child}
                  {currentBreakpoint}
                  {colorTheme}
                  onUpdate={createChildUpdateHandler(child.id)}
                  {isEditable}
                  {siteContext}
                  {user}
                  {onSelectComponent}
                />
              </div>
            {/each}
          {:else}
            <div class="dropdown-placeholder">
              <p>📋 Drop menu items here</p>
              <span>Buttons, links, text, dividers</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else if component.type === 'spacer'}
    <div class="spacer-widget" style="height: {spacerHeight}px" />
  {:else if component.type === 'theme_toggle'}
    {@const toggleSize = component.config.size || 'medium'}
    {@const toggleVariant = component.config.toggleVariant || 'icon'}
    {@const toggleAlignment = component.config.alignment || 'left'}
    {@const alignmentStyle =
      toggleAlignment === 'center'
        ? 'center'
        : toggleAlignment === 'right'
          ? 'flex-end'
          : 'flex-start'}
    {@const iconSize = toggleSize === 'small' ? 16 : toggleSize === 'large' ? 24 : 20}
    <div class="theme-toggle-widget" style="justify-content: {alignmentStyle}">
      <button
        class="theme-toggle theme-toggle-{toggleSize} theme-toggle-{toggleVariant}"
        aria-label="Toggle theme"
        title="Toggle light/dark mode"
        disabled
      >
        <!-- Sun/Moon icon preview -->
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        {#if toggleVariant === 'icon-label' || toggleVariant === 'button'}
          <span class="theme-toggle-label">Light Mode</span>
        {/if}
      </button>
    </div>
  {:else if component.type === 'divider'}
    {@const divColor = resolveThemeColor(
      component.config.dividerColor,
      colorTheme,
      themeColors.border,
      true
    )}
    <div
      class="divider-widget"
      style="
        border-top: {component.config.thickness || 1}px {component.config.dividerStyle ||
        'solid'} {divColor};
        margin: {dividerSpacing}px 0;
      "
    />
  {:else if component.type === 'columns'}
    <div
      class="columns-widget"
      style="
        display: grid;
        grid-template-columns: repeat({columnsCount}, 1fr);
        gap: {columnsGap}px;
        align-items: {component.config.verticalAlign || 'stretch'};
      "
    >
      {#if component.config.children && component.config.children.length > 0}
        {#each component.config.children as child}
          <div class="column">
            <svelte:self
              component={child}
              {currentBreakpoint}
              {colorTheme}
              {onUpdate}
              {isEditable}
              {siteContext}
              {user}
              {onSelectComponent}
            />
          </div>
        {/each}
      {:else}
        {#each Array(columnsCount) as _, i}
          <div class="column-placeholder">
            <span>Column {i + 1}</span>
          </div>
        {/each}
      {/if}
    </div>
  {:else if component.type === 'single_product'}
    <div class="product-widget layout-{component.config.layout || 'card'}">
      {#if component.config.productId}
        <div class="product-preview">
          <div class="product-image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
                stroke-width="2"
              />
            </svg>
          </div>
          <div class="product-info">
            <h3>Product #{component.config.productId}</h3>
            {#if component.config.showPrice}
              <p class="product-price">$0.00</p>
            {/if}
            {#if component.config.showDescription}
              <p class="product-description">Product description will appear here</p>
            {/if}
          </div>
        </div>
      {:else}
        <div class="widget-placeholder">
          <span>Select a product to display</span>
        </div>
      {/if}
    </div>
  {:else if component.type === 'product_list'}
    <div
      class="product-list-widget"
      style="
        display: grid;
        grid-template-columns: repeat({productListColumns}, 1fr);
        gap: 1rem;
      "
    >
      {#each Array(Math.min(component.config.limit || 6, 6)) as _, i}
        <div class="product-card">
          <div class="product-image-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
                stroke-width="2"
              />
            </svg>
          </div>
          <h4>Product {i + 1}</h4>
          <p class="product-price">$0.00</p>
        </div>
      {/each}
    </div>
  {:else if component.type === 'features'}
    {@const cardBg = resolveThemeColor(
      component.config.cardBackground,
      colorTheme,
      themeColors.surface,
      true
    )}
    {@const cardBorder = resolveThemeColor(
      component.config.cardBorderColor,
      colorTheme,
      themeColors.border,
      true
    )}
    <div class="features-preview">
      <h3>{sub(component.config.title || 'Features')}</h3>
      {#if component.config.subtitle}
        <p class="features-subtitle">{sub(component.config.subtitle)}</p>
      {/if}
      {#if component.config.features && component.config.features.length > 0}
        <div
          class="features-grid"
          style="grid-template-columns: repeat({featuresColumns}, 1fr); gap: {featuresGap}px;"
        >
          {#each featuresLimit && featuresLimit > 0 ? component.config.features.slice(0, featuresLimit) : component.config.features as feature}
            <div
              class="feature-card"
              style="background: {cardBg}; border-color: {cardBorder}; border-radius: {component
                .config.cardBorderRadius !== undefined
                ? component.config.cardBorderRadius
                : 12}px;"
            >
              <div class="feature-icon">{feature.icon}</div>
              <h4>{sub(feature.title)}</h4>
              <p>{sub(feature.description)}</p>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-message">
          No features added yet. Use the properties panel to add features.
        </p>
      {/if}
    </div>
  {:else if component.type === 'pricing'}
    <div class="pricing-preview">
      <h3>{sub(component.config.title || 'Pricing')}</h3>
      {#if component.config.tagline}
        <p class="tagline">{sub(component.config.tagline)}</p>
      {/if}
      <div class="pricing-grid">
        {#each (component.config.tiers || []).slice(0, 2) as tier}
          <div class="tier-card">
            <span class="tier-range">{sub(tier.range)}</span>
            <span class="tier-fee">{sub(tier.fee)}</span>
          </div>
        {/each}
      </div>
    </div>
  {:else if component.type === 'cta'}
    {@const ctaBgColor = resolveThemeColor(
      component.config.backgroundColor,
      colorTheme,
      `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
      true
    )}
    <div
      class="cta-preview"
      style="background: {ctaBgColor ||
        `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`};"
    >
      <h3>{sub(component.config.title || 'Call to Action')}</h3>
      {#if component.config.subtitle}
        <p>{sub(component.config.subtitle)}</p>
      {/if}
      <div class="cta-buttons">
        <button class="btn-primary">{sub(component.config.primaryCtaText || 'Get Started')}</button>
        {#if component.config.secondaryCtaText}
          <button class="btn-secondary">{sub(component.config.secondaryCtaText)}</button>
        {/if}
      </div>
    </div>
  {:else if component.type === 'navbar'}
    <!-- Navbar with container-based architecture (new) or legacy format -->
    {@const navChildrenRaw = component.config.children}
    {@const hasNavChildren =
      navChildrenRaw && Array.isArray(navChildrenRaw) && navChildrenRaw.length > 0}
    {@const navDisplay =
      getBreakpointValue(component.config.containerDisplay, currentBreakpoint) || 'flex'}
    {@const navFlexDirection =
      getBreakpointValue(component.config.containerFlexDirection, currentBreakpoint) || 'row'}
    {@const navGap = getBreakpointValue(component.config.containerGap, currentBreakpoint) || 16}
    {@const navPadding = getBreakpointValue(component.config.containerPadding, currentBreakpoint)}
    {@const navBackground =
      component.config.containerBackground || component.config.navbarBackground || 'transparent'}
    {@const rawConfig = component.config}
    {@const isSticky = 'positionType' in rawConfig && rawConfig['positionType'] === 'sticky'}
    {#if hasNavChildren || isEditable}
      <!-- New container-based navbar with children (or editable empty navbar) -->
      <nav
        class="navbar-container-based"
        style="
          background: {resolveThemeColor(navBackground, colorTheme, 'transparent', true)};
          max-width: {component.config.containerMaxWidth || '100%'};
          width: 100%;
          box-sizing: border-box;
          {isSticky ? 'position: sticky; top: 0; z-index: 100;' : ''}
        "
      >
        {#if isEditable}
          <!-- Use ContainerDropZone for editable navbar -->
          <ContainerDropZone
            containerId={component.id}
            children={navChildrenRaw || []}
            isActive={false}
            allowedTypes={[]}
            displayMode={navDisplay === 'grid' ? 'grid' : 'flex'}
            showLayoutHints={true}
            label="Navigation Bar"
            containerStyles="
              flex-direction: {navFlexDirection};
              justify-content: {component.config.containerJustifyContent || 'space-between'};
              align-items: {component.config.containerAlignItems || 'center'};
              flex-wrap: {component.config.containerWrap || 'nowrap'};
              gap: {navGap}px;
              padding: {navPadding
              ? `${navPadding.top || 16}px ${navPadding.right || 24}px ${navPadding.bottom || 16}px ${navPadding.left || 24}px`
              : '16px 24px'};
            "
            on:drop={handleContainerDrop}
            on:reorder={handleContainerReorder}
            on:childClick={handleChildClick}
          >
            <svelte:fragment slot="child" let:child>
              <svelte:self
                component={child}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={createChildUpdateHandler(child.id)}
                {isEditable}
                {siteContext}
                {user}
                {onSelectComponent}
              />
            </svelte:fragment>
          </ContainerDropZone>
        {:else}
          <!-- Non-editable: render children directly -->
          <div
            class="navbar-content-wrapper"
            style="
              display: {navDisplay};
              flex-direction: {navFlexDirection};
              justify-content: {component.config.containerJustifyContent || 'space-between'};
              align-items: {component.config.containerAlignItems || 'center'};
              flex-wrap: {component.config.containerWrap || 'nowrap'};
              gap: {navGap}px;
              padding: {navPadding
              ? `${navPadding.top || 16}px ${navPadding.right || 24}px ${navPadding.bottom || 16}px ${navPadding.left || 24}px`
              : '16px 24px'};
            "
          >
            {#each navChildrenRaw || [] as child (child.id)}
              <svelte:self
                component={child}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={createChildUpdateHandler(child.id)}
                {isEditable}
                {siteContext}
                {user}
                {onSelectComponent}
              />
            {/each}
          </div>
        {/if}
      </nav>
    {:else}
      <!-- Legacy navbar format -->
      <div class="navbar-preview">
        <div class="navbar-container">
          <div class="navbar-brand">
            {#if component.config.logo?.image}
              <img
                src={component.config.logo.image}
                alt={sub(component.config.logo.text || 'Logo')}
                class="logo"
              />
            {:else}
              <span class="logo-text">{sub(component.config.logo?.text || 'Store')}</span>
            {/if}
          </div>
          <div class="navbar-links">
            {#each component.config.links || [] as link}
              <a href={link.url} class="nav-link">{sub(link.text)}</a>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {:else if component.type === 'footer'}
    <!-- Footer with container-based architecture (new) or legacy format -->
    {@const footerChildrenRaw = component.config.children}
    {@const hasFooterChildren =
      footerChildrenRaw && Array.isArray(footerChildrenRaw) && footerChildrenRaw.length > 0}
    {@const footerDisplay =
      getBreakpointValue(component.config.containerDisplay, currentBreakpoint) || 'flex'}
    {@const footerFlexDirection =
      getBreakpointValue(component.config.containerFlexDirection, currentBreakpoint) || 'column'}
    {@const footerGap = getBreakpointValue(component.config.containerGap, currentBreakpoint) || 32}
    {@const footerPadding = getBreakpointValue(
      component.config.containerPadding,
      currentBreakpoint
    )}
    {@const footerBackground =
      component.config.containerBackground || component.config.footerBackground || 'theme:surface'}
    {#if hasFooterChildren || isEditable}
      <!-- New container-based footer with children (or editable empty footer) -->
      <footer
        class="footer-container-based"
        style="
          background: {resolveThemeColor(footerBackground, colorTheme, '#f9fafb', true)};
          max-width: {component.config.containerMaxWidth || '100%'};
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid {resolveThemeColor(
          component.config.footerBorderColor || 'theme:border',
          colorTheme,
          '#e5e7eb',
          true
        )};
        "
      >
        {#if isEditable}
          <!-- Use ContainerDropZone for editable footer -->
          <ContainerDropZone
            containerId={component.id}
            children={footerChildrenRaw || []}
            isActive={false}
            allowedTypes={[]}
            displayMode={footerDisplay === 'grid' ? 'grid' : 'flex'}
            showLayoutHints={true}
            label="Footer"
            containerStyles="
              flex-direction: {footerFlexDirection};
              justify-content: {component.config.containerJustifyContent || 'center'};
              align-items: {component.config.containerAlignItems || 'stretch'};
              flex-wrap: {component.config.containerWrap || 'wrap'};
              gap: {footerGap}px;
              padding: {footerPadding
              ? `${footerPadding.top || 48}px ${footerPadding.right || 24}px ${footerPadding.bottom || 48}px ${footerPadding.left || 24}px`
              : '48px 24px'};
            "
            on:drop={handleContainerDrop}
            on:reorder={handleContainerReorder}
            on:childClick={handleChildClick}
          >
            <svelte:fragment slot="child" let:child>
              <svelte:self
                component={child}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={createChildUpdateHandler(child.id)}
                {isEditable}
                {siteContext}
                {user}
                {onSelectComponent}
              />
            </svelte:fragment>
          </ContainerDropZone>
        {:else}
          <!-- Non-editable: render children directly -->
          <div
            class="footer-content-wrapper"
            style="
              display: {footerDisplay};
              flex-direction: {footerFlexDirection};
              justify-content: {component.config.containerJustifyContent || 'center'};
              align-items: {component.config.containerAlignItems || 'stretch'};
              flex-wrap: {component.config.containerWrap || 'wrap'};
              gap: {footerGap}px;
              padding: {footerPadding
              ? `${footerPadding.top || 48}px ${footerPadding.right || 24}px ${footerPadding.bottom || 48}px ${footerPadding.left || 24}px`
              : '48px 24px'};
            "
          >
            {#each footerChildrenRaw || [] as child (child.id)}
              <svelte:self
                component={child}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={createChildUpdateHandler(child.id)}
                {isEditable}
                {siteContext}
                {user}
                {onSelectComponent}
              />
            {/each}
          </div>
        {/if}
      </footer>
    {:else}
      <!-- Legacy footer format -->
      <div class="footer-preview">
        <div class="footer-container">
          {#if component.config.footerLinks && component.config.footerLinks.length > 0}
            <div class="footer-links">
              {#each component.config.footerLinks as link}
                <a href={link.url} class="footer-link">{sub(link.text)}</a>
              {/each}
            </div>
          {/if}
          <div class="footer-copyright">
            {sub(component.config.copyright || '© 2025 Store Name. All rights reserved.')}
          </div>
        </div>
      </div>
    {/if}
  {:else if component.type === 'yield'}
    <div class="yield-preview">
      <div class="yield-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <p>Page Content Area</p>
        <span>Page widgets will be rendered here</span>
      </div>
    </div>
  {:else if component.type === 'container'}
    {@const containerDisplay =
      getBreakpointValue(component.config.containerDisplay, currentBreakpoint) || 'flex'}
    {@const flexDirection =
      getBreakpointValue(component.config.containerFlexDirection, currentBreakpoint) || 'row'}
    {@const containerWidth =
      getBreakpointValue(component.config.containerWidth, currentBreakpoint) || 'auto'}
    {@const containerMinHeight =
      getBreakpointValue(component.config.containerMinHeight, currentBreakpoint) || 'auto'}
    {@const containerMaxHeight =
      getBreakpointValue(component.config.containerMaxHeight, currentBreakpoint) || 'none'}
    {@const containerGap =
      getBreakpointValue(component.config.containerGap, currentBreakpoint) || 16}
    {@const containerOpacity =
      getBreakpointValue(component.config.containerOpacity, currentBreakpoint) || 1}
    {@const containerOverflow = getBreakpointValue(
      component.config.containerOverflow,
      currentBreakpoint
    )}
    {@const containerZIndex = getBreakpointValue(
      component.config.containerZIndex,
      currentBreakpoint
    )}
    {@const containerGridCols = getBreakpointValue(
      component.config.containerGridCols,
      currentBreakpoint
    )}
    {@const containerGridRows = getBreakpointValue(
      component.config.containerGridRows,
      currentBreakpoint
    )}
    {@const containerGridAutoFlow = getBreakpointValue(
      component.config.containerGridAutoFlow,
      currentBreakpoint
    )}
    {@const containerPlaceItems = getBreakpointValue(
      component.config.containerPlaceItems,
      currentBreakpoint
    )}
    {@const containerPlaceContent = getBreakpointValue(
      component.config.containerPlaceContent,
      currentBreakpoint
    )}
    {@const containerPadding = getBreakpointValue(
      component.config.containerPadding,
      currentBreakpoint
    )}
    {@const containerMargin = getBreakpointValue(
      component.config.containerMargin,
      currentBreakpoint
    )}
    <div
      class="container-component"
      style="
        display: {containerDisplay};
        {containerDisplay === 'flex'
        ? `
          flex-direction: ${flexDirection};
          justify-content: ${component.config.containerJustifyContent || 'flex-start'};
          align-items: ${component.config.containerAlignItems || 'stretch'};
          align-content: ${component.config.containerAlignContent || 'normal'};
          flex-wrap: ${component.config.containerWrap || 'nowrap'};
        `
        : containerDisplay === 'grid'
          ? `
          grid-template-columns: ${formatGridTemplate(containerGridCols, 'repeat(3, 1fr)')};
          ${containerGridRows && containerGridRows !== 'auto' ? `grid-template-rows: ${formatGridTemplate(containerGridRows, 'auto')};` : ''}
          ${containerGridAutoFlow ? `grid-auto-flow: ${containerGridAutoFlow};` : ''}
          ${containerPlaceItems ? `place-items: ${containerPlaceItems};` : ''}
          ${containerPlaceContent ? `place-content: ${containerPlaceContent};` : ''}
        `
          : ''}
        gap: ${containerGap}px;
        width: ${containerWidth};
        max-width: ${component.config.containerMaxWidth || '1200px'};
        min-height: ${containerMinHeight};
        max-height: ${containerMaxHeight};
        padding: ${containerPadding
        ? `${containerPadding.top || 40}px ${containerPadding.right || 40}px ${containerPadding.bottom || 40}px ${containerPadding.left || 40}px`
        : '40px'};
        margin: ${containerMargin
        ? `${containerMargin.top || 0}px auto ${containerMargin.bottom || 0}px`
        : '0px auto'};
        background: ${component.config.containerBackground || 'transparent'};
        ${component.config.containerBackgroundImage
        ? `background-image: url(${component.config.containerBackgroundImage});`
        : ''}
        ${component.config.containerBackgroundSize
        ? `background-size: ${getBreakpointValue(component.config.containerBackgroundSize, currentBreakpoint)};`
        : ''}
        ${component.config.containerBackgroundPosition
        ? `background-position: ${getBreakpointValue(component.config.containerBackgroundPosition, currentBreakpoint)};`
        : ''}
        ${component.config.containerBackgroundRepeat
        ? `background-repeat: ${getBreakpointValue(component.config.containerBackgroundRepeat, currentBreakpoint)};`
        : ''}
        border-radius: ${component.config.containerBorderRadius || 0}px;
        ${(() => {
        const borderWidth = getBreakpointValue(
          component.config.containerBorderWidth,
          currentBreakpoint
        );
        return borderWidth
          ? `border-width: ${borderWidth.top || 0}px ${borderWidth.right || 0}px ${borderWidth.bottom || 0}px ${borderWidth.left || 0}px;`
          : '';
      })()}
        ${component.config.containerBorderColor
        ? `border-color: ${component.config.containerBorderColor}; border-style: solid;`
        : ''}
        opacity: ${containerOpacity};
        ${containerOverflow
        ? `overflow: ${typeof containerOverflow === 'object' ? `${containerOverflow.x || 'visible'} ${containerOverflow.y || 'visible'}` : containerOverflow};`
        : ''}
        ${containerZIndex !== undefined ? `z-index: ${containerZIndex};` : ''}
        ${component.config.containerCursor
        ? `cursor: ${getBreakpointValue(component.config.containerCursor, currentBreakpoint)};`
        : ''}
        ${component.config.containerPointerEvents
        ? `pointer-events: ${getBreakpointValue(component.config.containerPointerEvents, currentBreakpoint)};`
        : ''}
      "
    >
      {#if isEditable}
        <ContainerDropZone
          containerId={component.id}
          children={component.config.children || []}
          isActive={false}
          allowedTypes={[]}
          displayMode={containerDisplay}
          showLayoutHints={true}
          containerStyles={containerDisplay === 'flex'
            ? `
              flex-direction: ${flexDirection};
              justify-content: ${component.config.containerJustifyContent || 'flex-start'};
              align-items: ${component.config.containerAlignItems || 'stretch'};
              flex-wrap: ${component.config.containerWrap || 'nowrap'};
              gap: ${containerGap}px;
            `
            : containerDisplay === 'grid'
              ? `
              grid-template-columns: ${formatGridTemplate(containerGridCols, 'repeat(3, 1fr)')};
              ${containerGridRows && containerGridRows !== 'auto' ? `grid-template-rows: ${formatGridTemplate(containerGridRows, 'auto')};` : ''}
              ${containerGridAutoFlow ? `grid-auto-flow: ${containerGridAutoFlow};` : ''}
              ${containerPlaceItems ? `place-items: ${containerPlaceItems};` : ''}
              ${containerPlaceContent ? `place-content: ${containerPlaceContent};` : ''}
              gap: ${containerGap}px;
            `
              : `gap: ${containerGap}px;`}
          on:drop={handleContainerDrop}
          on:reorder={handleContainerReorder}
          on:childClick={handleChildClick}
        >
          <svelte:fragment slot="child" let:child>
            <div class="container-child-wrapper" style={getChildLayoutStyles(child.config)}>
              <svelte:self
                component={child}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={createChildUpdateHandler(child.id)}
                {isEditable}
                {siteContext}
                {user}
                {onSelectComponent}
              />
            </div>
          </svelte:fragment>
        </ContainerDropZone>
      {:else if component.config.children && component.config.children.length > 0}
        {#each component.config.children as child}
          <div class="container-child" style={getChildLayoutStyles(child.config)}>
            <svelte:self
              component={child}
              {currentBreakpoint}
              {colorTheme}
              onUpdate={createChildUpdateHandler(child.id)}
              {isEditable}
              {siteContext}
              {user}
              {onSelectComponent}
            />
          </div>
        {/each}
      {:else}
        <div class="layout-placeholder">
          <p>📦 Container</p>
          <span>Drop widgets here</span>
        </div>
      {/if}
    </div>
  {:else if component.type === 'component_ref'}
    {#await import('./ComponentRefRenderer.svelte')}
      <div class="component-ref-loading">Loading component...</div>
    {:then { default: ComponentRefRenderer }}
      <ComponentRefRenderer
        componentId={component.config.componentId}
        {currentBreakpoint}
        {colorTheme}
        {isEditable}
        {siteContext}
        {user}
      />
    {:catch error}
      <div class="component-ref-error">
        Failed to load component: {error.message}
      </div>
    {/await}
  {:else}
    <div class="unknown-widget">
      <span>Unknown widget type: {component.type}</span>
    </div>
  {/if}
</div>

<style>
  .widget-renderer {
    min-height: 20px;
  }

  /* Container child wrapper - ensures children act as independent flex/grid items */
  .container-child {
    /* No display property - inherits block/inline behavior naturally */
    /* This allows the wrapper to be a proper flex/grid item */
    position: relative; /* Ensures element is rendered */
  }

  /* Container child wrapper in edit mode - same behavior as container-child */
  .container-child-wrapper {
    position: relative;
    /* flex/grid properties are applied inline via getChildLayoutStyles() */
  }

  /* Text Widget */
  .text-widget {
    padding: 1rem;
    line-height: 1.6;
  }

  .text-widget p {
    margin: 0;
  }

  /* Heading Widget */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
    padding: 1rem;
  }

  /* Image Widget */
  .image-widget {
    position: relative;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background: var(--color-bg-tertiary, #f5f5f5);
    color: var(--color-text-secondary);
    border-radius: 8px;
  }

  .image-placeholder svg {
    opacity: 0.5;
    margin-bottom: 0.5rem;
  }

  /* Hero Widget */
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
    outline: none;
    cursor: text;
  }

  .hero-content h1:focus {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
    border-radius: 4px;
  }

  .hero-content p {
    font-size: 1.25rem;
    margin: 0 0 1.5rem 0;
    opacity: 0.9;
    outline: none;
    cursor: text;
    min-height: 1.5em;
  }

  .hero-content p:focus {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 4px;
    border-radius: 4px;
  }

  .hero-content p:empty:before {
    content: 'Click to add subtitle';
    opacity: 0.5;
  }

  .hero-cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    cursor: pointer;
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

  /* Button Widget */
  .button-widget {
    padding: 1rem;
  }

  .btn {
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-label {
    line-height: 1;
  }

  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn-medium {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .btn-large {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    color: white;
  }

  .btn-secondary {
    background: var(--color-secondary, #6b7280);
    color: white;
  }

  .btn-outline {
    background: transparent;
    border: 2px solid var(--color-primary, #3b82f6);
    color: var(--color-primary, #3b82f6);
  }

  .btn-text {
    background: transparent;
    color: var(--color-primary, #3b82f6);
  }

  /* Spacer Widget */
  .spacer-widget {
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 10px,
      rgba(0, 0, 0, 0.05) 10px,
      rgba(0, 0, 0, 0.05) 20px
    );
  }

  /* Theme Toggle Widget */
  .theme-toggle-widget {
    display: flex;
    width: 100%;
    padding: 0.5rem 0;
  }

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid var(--color-border-primary, #e5e7eb);
    border-radius: 0.375rem;
    background-color: var(--color-bg-primary, #ffffff);
    color: var(--color-text-primary, #111827);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .theme-toggle-small {
    width: 2rem;
    height: 2rem;
    padding: 0;
  }

  .theme-toggle-medium {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
  }

  .theme-toggle-large {
    width: 3rem;
    height: 3rem;
    padding: 0;
  }

  .theme-toggle-icon-label,
  .theme-toggle-button {
    width: auto;
    padding: 0.5rem 1rem;
  }

  .theme-toggle-small.theme-toggle-icon-label,
  .theme-toggle-small.theme-toggle-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .theme-toggle-large.theme-toggle-icon-label,
  .theme-toggle-large.theme-toggle-button {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }

  .theme-toggle-label {
    font-weight: 500;
    line-height: 1;
  }

  .theme-toggle-icon {
    padding: 0;
  }

  .theme-toggle-button {
    background-color: var(--color-primary, #3b82f6);
    color: white;
    border-color: var(--color-primary, #3b82f6);
  }

  /* Divider Widget */
  .divider-widget {
    width: 100%;
  }

  /* Container Widget */
  .container-component {
    min-height: 60px;
    width: 100%;
    box-sizing: border-box;
  }

  .container-component > .layout-placeholder {
    flex: 1;
    min-width: 200px;
  }

  /* Columns Widget */
  .columns-widget {
    padding: 1rem;
  }

  .column-placeholder {
    padding: 2rem 1rem;
    background: var(--color-bg-tertiary, #f5f5f5);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 8px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  /* Product Widgets */
  .product-widget {
    padding: 1rem;
  }

  .product-preview {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  .product-image-placeholder {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-tertiary, #e5e5e5);
    border-radius: 6px;
    color: var(--color-text-secondary);
  }

  .product-info h3 {
    margin: 0 0 0.5rem 0;
    padding: 0;
    font-size: 1.125rem;
  }

  .product-price {
    font-weight: 600;
    color: var(--color-primary, #3b82f6);
    margin: 0.5rem 0;
  }

  .product-description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .product-list-widget {
    padding: 1rem;
  }

  .product-card {
    padding: 1rem;
    background: var(--color-bg-secondary, #f5f5f5);
    border-radius: 8px;
    text-align: center;
  }

  .product-card .product-image-placeholder {
    width: 100%;
    height: 150px;
    margin-bottom: 0.75rem;
  }

  .product-card h4 {
    margin: 0 0 0.5rem 0;
    padding: 0;
    font-size: 1rem;
  }

  .product-card .product-price {
    margin: 0;
  }

  /* Placeholders */
  .widget-placeholder,
  .unknown-widget {
    padding: 2rem 1rem;
    background: var(--color-bg-tertiary, #f5f5f5);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 8px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  /* Features Preview */
  .features-preview {
    padding: 2rem;
    background: var(--color-bg-secondary);
  }

  .features-preview h3 {
    text-align: center;
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
  }

  .features-subtitle {
    text-align: center;
    margin: 0 0 2rem 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .features-grid {
    display: grid;
    margin-top: 2rem;
  }

  .feature-card {
    border: 1px solid;
    padding: 1.5rem;
    text-align: center;
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .feature-card h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .feature-card p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .empty-message {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    background: var(--color-bg-tertiary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 8px;
    margin-top: 1rem;
  }

  /* Pricing Preview */
  .pricing-preview {
    padding: 2rem;
    background: var(--color-bg-secondary);
    text-align: center;
  }

  .pricing-preview h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
  }

  .pricing-preview .tagline {
    color: var(--color-primary);
    font-weight: 600;
    margin: 0 0 1.5rem 0;
  }

  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .tier-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tier-range {
    font-weight: 600;
  }

  .tier-fee {
    font-size: 1.5rem;
    color: var(--color-primary);
    font-weight: 700;
  }

  /* CTA Preview */
  .cta-preview {
    padding: 2rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    text-align: center;
    color: white;
  }

  .cta-preview h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  .cta-preview p {
    margin: 0 0 1.5rem 0;
    opacity: 0.9;
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .cta-buttons button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary {
    background: white;
    color: var(--color-primary);
  }

  .btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white !important;
  }

  /* Navbar Preview */
  .navbar-preview {
    background: #ffffff;
    border-bottom: 1px solid var(--color-border-secondary);
    padding: 1rem;
  }

  .navbar-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .navbar-brand {
    font-weight: 600;
    font-size: 1.25rem;
  }

  .logo {
    height: 32px;
    width: auto;
  }

  .logo-text {
    color: var(--color-text-primary);
  }

  .navbar-links {
    display: flex;
    gap: 1.5rem;
    flex: 1;
  }

  .nav-link {
    color: var(--color-text-primary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* Footer Preview */
  .footer-preview {
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border-secondary);
    padding: 2rem 1rem;
  }

  .footer-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .footer-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .footer-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .footer-copyright {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-secondary);
  }

  /* Footer Container-based Architecture */
  .footer-container-based {
    width: 100%;
    box-sizing: border-box;
  }

  .footer-content-wrapper {
    width: 100%;
    box-sizing: border-box;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Yield Preview */
  .yield-preview {
    background: var(--color-bg-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 8px;
    padding: 3rem 2rem;
    min-height: 200px;
  }

  .yield-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .yield-placeholder svg {
    opacity: 0.5;
  }

  .yield-placeholder p {
    margin: 0;
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--color-text-primary);
  }

  .yield-placeholder span {
    font-size: 0.875rem;
    font-style: italic;
  }

  /* Layout Widget Previews */
  .container-preview,
  .row-preview {
    width: 100%;
    box-sizing: border-box;
    min-height: 100px;
  }

  .layout-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-tertiary);
  }

  .layout-placeholder p {
    margin: 0;
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-primary);
  }

  .layout-placeholder span {
    font-size: 0.875rem;
    font-style: italic;
  }

  .component-ref-loading,
  .component-ref-error {
    padding: 1rem;
    text-align: center;
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-secondary);
  }

  .component-ref-error {
    color: var(--color-error);
    border-color: var(--color-error);
  }

  /* Dropdown Menu Widget */
  .dropdown-widget-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .dropdown-widget-container.drag-over {
    background: rgba(59, 130, 246, 0.05);
    outline: 2px dashed var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }

  .dropdown-trigger-preview {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--color-text-primary);
    width: fit-content;
  }

  .dropdown-trigger-preview.variant-button {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .dropdown-trigger-preview.variant-icon {
    padding: 0.5rem;
    border-radius: 50%;
  }

  .dropdown-trigger-preview .trigger-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dropdown-trigger-preview .trigger-label {
    font-weight: 500;
  }

  .dropdown-trigger-preview .trigger-chevron {
    display: flex;
    align-items: center;
    opacity: 0.7;
  }

  .dropdown-menu-preview {
    border: 1px solid var(--color-border-secondary);
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    min-height: 60px;
    animation: fadeIn 0.2s ease-out;
  }

  .dropdown-menu-preview.drag-target {
    border-color: var(--color-primary, #3b82f6);
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.2),
      0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-menu-preview.align-left {
    align-self: flex-start;
  }

  .dropdown-menu-preview.align-right {
    align-self: flex-end;
  }

  .dropdown-menu-preview.align-center {
    align-self: center;
  }

  .dropdown-item-wrapper {
    width: 100%;
  }

  .dropdown-item {
    width: 100%;
  }

  .dropdown-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 1.5rem;
    text-align: center;
    color: var(--color-text-secondary);
    border: 2px dashed var(--color-border-secondary);
    border-radius: 4px;
    background: var(--color-bg-tertiary);
  }

  .dropdown-placeholder p {
    margin: 0;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text-primary);
  }

  .dropdown-placeholder span {
    font-size: 0.75rem;
    font-style: italic;
  }
</style>
