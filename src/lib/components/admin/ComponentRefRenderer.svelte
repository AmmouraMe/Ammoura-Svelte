<script lang="ts">
  /**
   * ComponentRefRenderer - Renders a referenced component
   * Fetches the component and renders it with its full configuration
   * This handles both:
   * 1. Components with children in component_widgets table (old system)
   * 2. Components with inline children in config.children (new architecture)
   */
  import { onMount } from 'svelte';
  import type { PageComponent, Breakpoint, ColorTheme, ChildComponent } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import ComponentRenderer from './ComponentRenderer.svelte';

  export let componentId: number | undefined;
  export let currentBreakpoint: Breakpoint;
  export let colorTheme: ColorTheme = 'default';
  export let isEditable = false;
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;

  let resolvedComponent: PageComponent | null = null;
  let isLoading = true;
  let error: string | null = null;

  onMount(async () => {
    if (!componentId) {
      error = 'No component ID provided';
      isLoading = false;
      return;
    }

    try {
      // First, fetch the component itself to get its type and config
      const componentResponse = await fetch(`/api/components/${componentId}`);
      if (!componentResponse.ok) {
        throw new Error('Failed to load component');
      }

      const componentData = (await componentResponse.json()) as {
        component: {
          id: number;
          type: string;
          name: string;
          config: Record<string, unknown>;
        };
      };

      const component = componentData.component;

      // Check if the component already has inline children in its config
      const hasInlineChildren =
        component.config?.children && Array.isArray(component.config.children);

      if (hasInlineChildren) {
        // Use the component directly with its inline children
        resolvedComponent = {
          id: `component-ref-${componentId}`,
          page_id: String(componentId),
          type: component.type as PageComponent['type'],
          position: 0,
          config: component.config,
          created_at: Date.now(),
          updated_at: Date.now()
        };
      } else {
        // Fetch children from component_widgets table
        const childrenResponse = await fetch(`/api/components/${componentId}/children`);
        if (!childrenResponse.ok) {
          throw new Error('Failed to load component children');
        }

        const childrenData = (await childrenResponse.json()) as { children: ChildComponent[] };

        // Convert children to the expected PageComponent format
        const children: PageComponent[] = childrenData.children.map((c) => ({
          id: c.id,
          page_id: String(componentId),
          type: c.type,
          position: c.position,
          config: c.config,
          parent_id: c.parent_id,
          created_at: Date.now(),
          updated_at: Date.now()
        }));

        // Create a resolved component with children injected
        resolvedComponent = {
          id: `component-ref-${componentId}`,
          page_id: String(componentId),
          type: component.type as PageComponent['type'],
          position: 0,
          config: {
            ...component.config,
            children
          },
          created_at: Date.now(),
          updated_at: Date.now()
        };
      }

      isLoading = false;
    } catch (err) {
      console.error('Failed to load component:', err);
      error = err instanceof Error ? err.message : 'Failed to load component';
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="component-ref-loading">
    <div class="spinner"></div>
    <span>Loading component...</span>
  </div>
{:else if error}
  <div class="component-ref-error">
    <span>⚠️ {error}</span>
  </div>
{:else if resolvedComponent}
  <div class="component-ref-container">
    <ComponentRenderer
      component={resolvedComponent}
      {currentBreakpoint}
      {colorTheme}
      {isEditable}
      {siteContext}
      {user}
      onUpdate={undefined}
    />
  </div>
{:else}
  <div class="component-ref-empty">
    <span>📦 This component is empty</span>
    <p class="hint">Edit this component in Admin → Components to add widgets</p>
  </div>
{/if}

<style>
  .component-ref-loading,
  .component-ref-error,
  .component-ref-empty {
    padding: 2rem;
    text-align: center;
    border: 2px dashed var(--color-border-secondary, #e5e7eb);
    border-radius: 8px;
    background: var(--color-bg-secondary, #f9fafb);
  }

  .component-ref-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border-primary, #d1d5db);
    border-top-color: var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .component-ref-error {
    color: var(--color-error, #ef4444);
    border-color: var(--color-error, #ef4444);
  }

  .component-ref-empty {
    color: var(--color-text-secondary, #6b7280);
  }

  .component-ref-empty .hint {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-tertiary, #9ca3af);
  }

  .component-ref-container {
    display: contents; /* Allow widgets to render in their parent's layout context */
  }
</style>
