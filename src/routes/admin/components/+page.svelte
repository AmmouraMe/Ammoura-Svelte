<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import { toastStore } from '$lib/stores/toast';
  import type { Component } from '$lib/types/pages';

  export let data: PageData;

  let isDeleting = false;
  let isCloning = false;
  let isResetting = false;

  async function handleDeleteComponent(componentId: string, componentName: string): Promise<void> {
    const confirmed = await confirmStore.show(`Delete component "${componentName}"?`, {
      title: 'Delete Component',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      const form = document.getElementById(`delete-component-${componentId}`) as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  async function handleResetComponent(componentId: string, componentName: string): Promise<void> {
    const confirmed = await confirmStore.show(
      `Reset "${componentName}" to its original state? This will undo any customizations.`,
      {
        title: 'Reset Component',
        confirmText: 'Reset',
        variant: 'warning'
      }
    );
    if (confirmed) {
      const form = document.getElementById(`reset-component-${componentId}`) as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  // Categories matching the builder sidebar
  const widgetCategories: Record<
    string,
    { label: string; types: string[]; icon: string; color: string }
  > = {
    containers: {
      label: 'Main',
      types: ['navbar', 'footer', 'composite', 'container', 'spacer', 'divider'],
      icon: '⬛',
      color: '#6366f1'
    },
    content: {
      label: 'Content',
      types: ['heading', 'text', 'button'],
      icon: '📝',
      color: '#8b5cf6'
    },
    media: {
      label: 'Media',
      types: ['image', 'icon'],
      icon: '🖼️',
      color: '#ec4899'
    },
    commerce: {
      label: 'Commerce',
      types: ['single_product', 'product_list'],
      icon: '🛒',
      color: '#14b8a6'
    },
    marketing: {
      label: 'Marketing',
      types: ['hero', 'features', 'pricing', 'cta'],
      icon: '📣',
      color: '#f59e0b'
    },
    theme: {
      label: 'Theme',
      types: ['theme_toggle'],
      icon: '🎨',
      color: '#a855f7'
    },
    structure: {
      label: 'Structure',
      types: ['yield'],
      icon: '🏗️',
      color: '#64748b'
    }
  };

  function getCategoryForType(type: string): string {
    for (const [category, info] of Object.entries(widgetCategories)) {
      if (info.types.includes(type)) {
        return category;
      }
    }
    return 'other';
  }

  // Get category based on component name (for special cases like Hero Section)
  function getCategoryForComponent(component: Component): string {
    // Special handling for composite components based on their name
    const nameLower = component.name.toLowerCase();
    if (
      nameLower.includes('hero') ||
      nameLower.includes('features') ||
      nameLower.includes('pricing') ||
      nameLower.includes('call to action') ||
      nameLower.includes('cta')
    ) {
      return 'marketing';
    }
    // Default to type-based categorization
    return getCategoryForType(component.type);
  }

  // Group built-in components by category and sort by type order
  function groupByCategory(components: Component[]): Record<string, Component[]> {
    const grouped: Record<string, Component[]> = {};
    for (const category of Object.keys(widgetCategories)) {
      grouped[category] = [];
    }
    grouped['other'] = [];

    for (const component of components) {
      const category = getCategoryForComponent(component);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(component);
    }

    // Sort each category's components by their type order in widgetCategories
    for (const [category, categoryComponents] of Object.entries(grouped)) {
      const typeOrder = widgetCategories[category]?.types || [];
      grouped[category] = categoryComponents.sort((a, b) => {
        const aIndex = typeOrder.indexOf(a.type);
        const bIndex = typeOrder.indexOf(b.type);
        // If type not found in order, put at end
        const aOrder = aIndex === -1 ? Infinity : aIndex;
        const bOrder = bIndex === -1 ? Infinity : bIndex;
        return aOrder - bOrder;
      });
    }

    return grouped;
  }

  $: groupedBuiltIn = groupByCategory(data.builtInComponents || []);
</script>

<svelte:head>
  <title>Components - Admin</title>
</svelte:head>

<div class="components-page">
  <div class="page-header">
    <div>
      <h1>Components</h1>
      <p class="page-description">Manage reusable components for your site</p>
    </div>
    <a href="/admin/builder/component" class="btn btn-primary">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      Create Component
    </a>
  </div>

  <!-- Custom Components Section -->
  <section class="components-section">
    <h2 class="section-title">Your Components</h2>
    {#if data.components.length === 0}
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7" stroke-width="2"></rect>
          <rect x="14" y="3" width="7" height="7" stroke-width="2"></rect>
          <rect x="14" y="14" width="7" height="7" stroke-width="2"></rect>
          <rect x="3" y="14" width="7" height="7" stroke-width="2"></rect>
        </svg>
        <h3>No custom components yet</h3>
        <p>Create your first reusable component to use across your site</p>
        <a href="/admin/builder/component" class="btn btn-primary">Create Component</a>
      </div>
    {:else}
      <div class="components-grid">
        {#each data.components as component (component.id)}
          <div class="component-card">
            <div class="component-header">
              <div>
                <h3>{component.name}</h3>
                {#if component.description}
                  <p class="component-description">{component.description}</p>
                {/if}
              </div>
            </div>

            <div class="component-actions">
              <a href="/admin/builder/component/{component.id}" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                  <path
                    d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                </svg>
                Edit
              </a>
              <form
                method="POST"
                action="?/clone"
                use:enhance={() => {
                  isCloning = true;
                  return async ({ result }) => {
                    isCloning = false;
                    if (result.type === 'redirect' && 'location' in result) {
                      await goto(result.location);
                    } else if (result.type === 'failure') {
                      alert(result.data?.error || 'Failed to clone component');
                    }
                  };
                }}
              >
                <input type="hidden" name="id" value={component.id} />
                <button type="submit" class="btn btn-secondary" disabled={isCloning}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"></rect>
                    <path
                      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                  Clone
                </button>
              </form>
              <form
                id="delete-component-{component.id}"
                method="POST"
                action="?/delete"
                use:enhance={() => {
                  isDeleting = true;
                  return async ({ result, update }) => {
                    if (result.type === 'failure' && result.data && 'error' in result.data) {
                      toastStore.error(String(result.data.error) || 'Failed to delete component');
                    } else if (result.type === 'failure') {
                      toastStore.error('Failed to delete component');
                    }
                    await update();
                    isDeleting = false;
                  };
                }}
              >
                <input type="hidden" name="id" value={component.id} />
                <button
                  type="button"
                  class="btn btn-danger"
                  disabled={isDeleting}
                  on:click={() => handleDeleteComponent(String(component.id), component.name)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                  Delete
                </button>
              </form>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Built-in Components Section - Organized by Category -->
  {#if data.builtInComponents && data.builtInComponents.length > 0}
    <section class="components-section builtin-section">
      <div class="builtin-header">
        <h2 class="section-title">
          Built-in Components
          <span class="section-badge">Templates</span>
        </h2>
        <p class="builtin-description">
          These are the same components available in the Pages and Layouts builder. Use them as
          starting points or customize them for your site.
        </p>
      </div>

      {#each Object.entries(widgetCategories) as [categoryKey, categoryInfo]}
        {#if groupedBuiltIn[categoryKey] && groupedBuiltIn[categoryKey].length > 0}
          <div class="category-section">
            <h3 class="category-title">
              <span class="category-icon" style="background: {categoryInfo.color}"
                >{categoryInfo.icon}</span
              >
              {categoryInfo.label}
            </h3>
            <div class="components-grid">
              {#each groupedBuiltIn[categoryKey] as component (component.id)}
                <div class="component-card builtin-card">
                  <div class="component-header">
                    <div>
                      <h3>{component.name}</h3>
                      {#if component.description}
                        <p class="component-description">{component.description}</p>
                      {/if}
                    </div>
                  </div>

                  <div class="component-actions">
                    <a href="/admin/builder/component/{component.id}" class="btn btn-secondary">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>
                        <path
                          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>
                      </svg>
                      Edit
                    </a>
                    <form
                      method="POST"
                      action="?/clone"
                      use:enhance={() => {
                        isCloning = true;
                        return async ({ result }) => {
                          isCloning = false;
                          if (result.type === 'redirect' && 'location' in result) {
                            await goto(result.location);
                          } else if (result.type === 'failure') {
                            alert(result.data?.error || 'Failed to clone component');
                          }
                        };
                      }}
                    >
                      <input type="hidden" name="id" value={component.id} />
                      <button type="submit" class="btn btn-secondary" disabled={isCloning}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"
                          ></rect>
                          <path
                            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          ></path>
                        </svg>
                        Clone
                      </button>
                    </form>
                    <form
                      id="reset-component-{component.id}"
                      method="POST"
                      action="?/reset"
                      use:enhance={() => {
                        isResetting = true;
                        return async ({ update }) => {
                          await update();
                          isResetting = false;
                        };
                      }}
                    >
                      <input type="hidden" name="id" value={component.id} />
                      <button
                        type="button"
                        class="btn btn-warning"
                        disabled={isResetting}
                        on:click={() => handleResetComponent(String(component.id), component.name)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          ></path>
                          <path
                            d="M3 3v5h5"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          ></path>
                        </svg>
                        Reset
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </section>
  {/if}
</div>

<style>
  .components-page {
    padding: 2rem;
    width: 100%;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--color-text-primary);
  }

  .page-description {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .components-section {
    margin-bottom: 3rem;
  }

  .components-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 1.5rem;
    margin: 0 0 1.5rem 0;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .builtin-section {
    padding-top: 2rem;
    border-top: 2px solid var(--color-border-secondary);
  }

  .builtin-card {
    background: var(--color-bg-secondary);
    border-color: var(--color-border-primary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-dark);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
  }

  .btn-danger:hover {
    background: var(--color-error-dark);
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .btn-warning:hover {
    background: #d97706;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  .components-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .component-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 200px;
  }

  .component-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .component-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--color-text-primary);
  }

  .component-description {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .component-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border-secondary);
    margin-top: auto;
  }

  .component-actions form {
    display: contents;
  }

  @media (max-width: 768px) {
    .components-page {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
    }

    .components-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Category organization styles */
  .builtin-header {
    margin-bottom: 2rem;
  }

  .builtin-description {
    margin: 0.5rem 0 0 0;
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
    max-width: 600px;
  }

  .category-section {
    margin-bottom: 2.5rem;
  }

  .category-section:last-child {
    margin-bottom: 0;
  }

  .category-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 1rem 0;
  }

  .category-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    font-size: 14px;
    color: white;
  }
</style>
