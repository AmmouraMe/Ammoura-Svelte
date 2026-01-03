<script lang="ts">
  import type { PageComponent, Breakpoint, ComponentConfig, ColorTheme } from '$lib/types/pages';
  import ComponentRenderer from './ComponentRenderer.svelte';
  import ComponentControls from './ComponentControls.svelte';
  import { getThemeColors, generateThemeStyles } from '$lib/utils/editor/colorThemes';

  export let components: PageComponent[];
  export let selectedComponentId: string | null;
  export let currentBreakpoint: Breakpoint;
  export let colorTheme: ColorTheme = 'default';

  interface ComponentEvents {
    select: (componentId: string) => void;
    moveUp: (componentId: string) => void;
    moveDown: (componentId: string) => void;
    duplicate: (componentId: string) => void;
    delete: (componentId: string) => void;
    updateConfig: (componentId: string, config: ComponentConfig) => void;
    dragStart: (index: number) => void;
    dragOver: (event: DragEvent, index: number) => void;
    dragEnd: () => void;
  }

  export let events: ComponentEvents;

  $: themeColors = getThemeColors(colorTheme);
  $: themeStyles = generateThemeStyles(themeColors);
</script>

<div class="canvas-area">
  <div
    class="canvas-container"
    class:mobile={currentBreakpoint === 'mobile'}
    class:tablet={currentBreakpoint === 'tablet'}
    style={themeStyles}
  >
    {#if components.length === 0}
      <div class="empty-canvas">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
          <path d="M12 8v8M8 12h8" stroke-width="2" stroke-linecap="round" />
        </svg>
        <h3>Start Building Your Page</h3>
        <p>Select a component from the library on the left to add content</p>
      </div>
    {:else}
      <div class="components-canvas">
        {#each components as component, index}
          <div
            class="canvas-component"
            class:selected={selectedComponentId === component.id}
            draggable="true"
            on:dragstart={() => events.dragStart(index)}
            on:dragover={(e) => events.dragOver(e, index)}
            on:dragend={events.dragEnd}
            on:click={() => events.select(component.id)}
            on:keydown={(e) => e.key === 'Enter' && events.select(component.id)}
            role="button"
            tabindex="0"
          >
            <div class="component-controls-wrapper">
              <ComponentControls
                componentType={component.type}
                canMoveUp={index > 0}
                canMoveDown={index < components.length - 1}
                events={{
                  moveUp: () => events.moveUp(component.id),
                  moveDown: () => events.moveDown(component.id),
                  duplicate: () => events.duplicate(component.id),
                  delete: () => events.delete(component.id)
                }}
              />
            </div>
            <div class="component-render">
              <ComponentRenderer
                {component}
                {currentBreakpoint}
                {colorTheme}
                onUpdate={(config) => events.updateConfig(component.id, config)}
              />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Mobile-first canvas */
  .canvas-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0.75rem;
    overflow-y: auto;
    background: var(--color-bg-secondary);
  }

  .canvas-container {
    width: 100%;
    max-width: 100%;
    background: var(--theme-background, var(--color-bg-primary));
    border-radius: 8px;
    box-shadow: 0 2px 8px var(--color-shadow-light);
    min-height: 400px;
    height: auto;
    transition: max-width 0.3s ease;
  }

  .canvas-container.tablet {
    max-width: 768px;
  }

  .canvas-container.mobile {
    max-width: 375px;
  }

  .empty-canvas {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: var(--theme-text-secondary, var(--color-text-secondary));
    text-align: center;
    padding: 1.5rem;
  }

  .empty-canvas svg {
    opacity: 0.3;
    margin-bottom: 1rem;
    stroke: var(--theme-text, currentColor);
    width: 48px;
    height: 48px;
  }

  .empty-canvas h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: var(--theme-text, var(--color-text-primary));
  }

  .empty-canvas p {
    margin: 0;
    font-size: 0.8125rem;
  }

  .components-canvas {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .canvas-component {
    position: relative;
    border: 2px solid transparent;
    border-radius: 6px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .canvas-component:hover {
    border-color: var(--color-border-secondary);
  }

  .canvas-component.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .component-controls-wrapper {
    display: none;
  }

  .canvas-component:hover .component-controls-wrapper,
  .canvas-component.selected .component-controls-wrapper {
    display: block;
  }

  .component-render {
    padding: 0.75rem;
    min-height: 50px;
  }

  /* Tablet */
  @media (min-width: 768px) {
    .canvas-area {
      padding: 1.5rem;
    }

    .canvas-container {
      max-width: 1200px;
      min-height: 500px;
    }

    .empty-canvas {
      min-height: 500px;
      padding: 2rem;
    }

    .empty-canvas svg {
      width: 56px;
      height: 56px;
      margin-bottom: 1.25rem;
    }

    .empty-canvas h3 {
      font-size: 1.25rem;
    }

    .empty-canvas p {
      font-size: 0.875rem;
    }

    .components-canvas {
      padding: 1rem;
      gap: 0.875rem;
    }

    .canvas-component {
      border-radius: 8px;
    }

    .canvas-component.selected {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .component-render {
      padding: 0.875rem;
      min-height: 55px;
    }
  }

  /* Desktop */
  @media (min-width: 1024px) {
    .canvas-area {
      padding: 2rem;
    }

    .canvas-container {
      min-height: 600px;
    }

    .empty-canvas {
      min-height: 600px;
    }

    .empty-canvas svg {
      width: 64px;
      height: 64px;
      margin-bottom: 1.5rem;
    }

    .components-canvas {
      gap: 1rem;
    }

    .component-render {
      padding: 1rem;
      min-height: 60px;
    }
  }
</style>
