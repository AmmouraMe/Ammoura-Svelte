<script lang="ts">
  import { goto } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import type { PageData } from './$types';
  import type { LayoutWidget } from '$lib/types/pages';

  export let data: PageData;

  let widgets: LayoutWidget[] = data.widgets;
  let hasUnsavedChanges = false;

  async function handleSave(): Promise<void> {
    try {
      const response = await fetch(`/api/layouts/${data.layout.id}/widgets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets })
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }

      hasUnsavedChanges = false;
      alert('Layout saved successfully!');
    } catch (error) {
      console.error('Failed to save layout:', error);
      alert('Failed to save layout. Please try again.');
    }
  }

  function handleAddWidget(type: string): void {
    const newWidget: LayoutWidget = {
      id: crypto.randomUUID(),
      layout_id: data.layout.id,
      type: type as LayoutWidget['type'],
      position: widgets.length,
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    widgets = [...widgets, newWidget];
    hasUnsavedChanges = true;
  }

  function handleDeleteWidget(widgetId: string): void {
    widgets = widgets.filter((w) => w.id !== widgetId);
    // Reorder positions
    widgets = widgets.map((w, index) => ({ ...w, position: index }));
    hasUnsavedChanges = true;
  }

  async function handleBack(): Promise<void> {
    if (hasUnsavedChanges) {
      const confirmed = await confirmStore.show(
        'You have unsaved changes. Are you sure you want to leave?',
        {
          title: 'Unsaved Changes',
          confirmText: 'Leave',
          cancelText: 'Stay',
          variant: 'warning'
        }
      );
      if (!confirmed) {
        return;
      }
    }
    goto('/admin/layouts');
  }
</script>

<svelte:head>
  <title>Edit Layout: {data.layout.name} - Admin</title>
</svelte:head>

<div class="layout-editor">
  <div class="editor-header">
    <div class="header-left">
      <button class="btn-back" on:click={handleBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        </svg>
      </button>
      <div>
        <h1>{data.layout.name}</h1>
        <p class="layout-slug">Slug: {data.layout.slug}</p>
      </div>
    </div>
    <button class="btn btn-primary" on:click={handleSave} disabled={!hasUnsavedChanges}>
      {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
    </button>
  </div>

  <div class="editor-content">
    <div class="widgets-sidebar">
      <h3>Add Widgets</h3>
      <div class="widget-buttons">
        <button class="widget-btn" on:click={() => handleAddWidget('navbar')}>
          <span>📊</span> Navigation Bar
        </button>
        <button class="widget-btn" on:click={() => handleAddWidget('yield')}>
          <span>📄</span> Page Content (Yield)
        </button>
        <button class="widget-btn" on:click={() => handleAddWidget('footer')}>
          <span>👣</span> Footer
        </button>
        <button class="widget-btn" on:click={() => handleAddWidget('hero')}>
          <span>🎯</span> Hero Section
        </button>
        <button class="widget-btn" on:click={() => handleAddWidget('text')}>
          <span>📝</span> Text
        </button>
      </div>
    </div>

    <div class="canvas">
      {#if widgets.length === 0}
        <div class="empty-canvas">
          <p>No widgets yet. Add widgets from the sidebar to build your layout.</p>
        </div>
      {:else}
        <div class="widgets-list">
          {#each widgets as widget (widget.id)}
            <div class="widget-item">
              <div class="widget-header">
                <span class="widget-type">{widget.type}</span>
                <button class="btn-delete" on:click={() => handleDeleteWidget(widget.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"></path>
                  </svg>
                </button>
              </div>
              <div class="widget-preview">
                {#if widget.type === 'yield'}
                  <div class="yield-indicator">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                        stroke-width="2"
                      ></path>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke-width="2"></path>
                    </svg>
                    <p>Page content will be rendered here</p>
                  </div>
                {:else}
                  <p>Widget position: {widget.position}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .layout-editor {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-secondary);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-secondary);
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .btn-back {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    border-radius: 6px;
  }

  .btn-back:hover {
    background: var(--color-bg-secondary);
  }

  .editor-header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .layout-slug {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .editor-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .widgets-sidebar {
    width: 280px;
    background: var(--color-bg-primary);
    border-right: 1px solid var(--color-border-secondary);
    padding: 1.5rem;
    overflow-y: auto;
  }

  .widgets-sidebar h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
  }

  .widget-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .widget-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    font-weight: 500;
    transition: all 0.2s;
  }

  .widget-btn:hover {
    background: var(--color-bg-tertiary);
    border-color: var(--color-primary);
  }

  .widget-btn span {
    font-size: 1.25rem;
  }

  .canvas {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .empty-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .widgets-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .widget-item {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    overflow: hidden;
  }

  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .widget-type {
    font-weight: 600;
    text-transform: capitalize;
  }

  .btn-delete {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--color-error);
    display: flex;
    align-items: center;
    border-radius: 4px;
  }

  .btn-delete:hover {
    background: var(--color-error);
    color: white;
  }

  .widget-preview {
    padding: 1.5rem;
    min-height: 100px;
  }

  .yield-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    border: 2px dashed var(--color-border-secondary);
    border-radius: 8px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .yield-indicator p {
    margin: 0;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .widgets-sidebar {
      display: none;
    }
  }
</style>
