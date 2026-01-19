<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { confirmStore } from '$lib/stores/confirm';
  import type { PageData } from './$types';

  export let data: PageData;

  let isDeleting = false;
  let _pendingDeleteLayoutId: number | null = null;

  async function handleDeleteLayout(layoutId: number): Promise<void> {
    const confirmed = await confirmStore.show('Are you sure you want to delete this layout?', {
      title: 'Delete Layout',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      _pendingDeleteLayoutId = layoutId;
      // Trigger form submission
      const form = document.getElementById(`delete-layout-${layoutId}`) as HTMLFormElement;
      if (form) form.requestSubmit();
    }
  }

  function handleEdit(layoutId: number): void {
    goto(`/admin/builder/layout/${layoutId}`);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<svelte:head>
  <title>Layouts - Admin</title>
</svelte:head>

<div class="layouts-page">
  <div class="page-header">
    <div>
      <h1>Layouts</h1>
      <p class="page-description">Manage page layouts for your site</p>
    </div>
    <a href="/admin/builder/layout" class="btn btn-primary">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      Create Layout
    </a>
  </div>

  <!-- Your Layouts Section -->
  <section class="layouts-section">
    <div class="section-header">
      <h2>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9" stroke-width="2"></line>
          <line x1="9" y1="21" x2="9" y2="9" stroke-width="2"></line>
        </svg>
        Your Layouts
      </h2>
      <p class="section-description">
        Layouts you've created to define the structure of your pages.
      </p>
    </div>
    {#if data.layouts.length === 0}
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9" stroke-width="2"></line>
          <line x1="9" y1="21" x2="9" y2="9" stroke-width="2"></line>
        </svg>
        <h3>No layouts yet</h3>
        <p>Create your first layout to define the structure of your pages</p>
        <a href="/admin/builder/layout" class="btn btn-primary">Create Layout</a>
      </div>
    {:else}
      <div class="layouts-grid">
        {#each data.layouts as layout (layout.id)}
          <div class="layout-card">
            <div class="layout-header">
              <div>
                <h3>{layout.name}</h3>
                {#if layout.description}
                  <p class="layout-description">{layout.description}</p>
                {/if}
              </div>
              {#if layout.is_default}
                <span class="default-badge">Default</span>
              {/if}
            </div>

            <div class="layout-meta">
              <span>Slug: <code>{layout.slug}</code></span>
              <span>Created: {formatDate(layout.created_at)}</span>
            </div>

            <div class="layout-actions">
              <button class="btn btn-secondary" on:click={() => handleEdit(layout.id)}>
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
              </button>

              {#if !layout.is_default}
                <form method="POST" action="?/setDefault" use:enhance>
                  <input type="hidden" name="layoutId" value={layout.id} />
                  <button type="submit" class="btn btn-outline">Set as Default</button>
                </form>

                <form
                  id="delete-layout-{layout.id}"
                  method="POST"
                  action="?/delete"
                  use:enhance={() => {
                    isDeleting = true;
                    return async ({ update }) => {
                      await update();
                      isDeleting = false;
                      _pendingDeleteLayoutId = null;
                    };
                  }}
                >
                  <input type="hidden" name="layoutId" value={layout.id} />
                  <button
                    type="button"
                    class="btn btn-danger"
                    disabled={isDeleting}
                    on:click={() => handleDeleteLayout(layout.id)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
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
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Built-in Layouts Section -->
  {#if data.builtInLayouts && data.builtInLayouts.length > 0}
    <section class="layouts-section builtin-section">
      <div class="section-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <polyline
              points="9,22 9,12 15,12 15,22"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></polyline>
          </svg>
          Built-in Layouts
        </h2>
        <p class="section-description">
          System layouts that come with your site. These can be customized but not deleted.
        </p>
      </div>
      <div class="layouts-grid">
        {#each data.builtInLayouts as layout (layout.id)}
          <div class="layout-card builtin-card">
            <div class="layout-header">
              <div>
                <h3>{layout.name}</h3>
                {#if layout.description}
                  <p class="layout-description">{layout.description}</p>
                {/if}
              </div>
              <div class="badge-group">
                {#if layout.is_default}
                  <span class="default-badge">Default</span>
                {/if}
                <span class="builtin-badge">Built-in</span>
              </div>
            </div>

            <div class="layout-meta">
              <span>Slug: <code>{layout.slug}</code></span>
              <span>Updated: {formatDate(layout.updated_at)}</span>
            </div>

            <div class="layout-actions">
              <button class="btn btn-secondary" on:click={() => handleEdit(layout.id)}>
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
              </button>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  /* Mobile-first styles */
  .layouts-page {
    width: 100%;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    color: var(--color-text-primary);
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    transition: color var(--transition-normal);
  }

  .page-description {
    color: var(--color-text-secondary);
    margin: 0;
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9375rem;
    text-decoration: none;
    cursor: pointer;
    width: 100%;
    transition:
      background-color var(--transition-normal),
      transform var(--transition-normal);
  }

  .btn:hover {
    background: var(--color-primary-hover);
    transform: translateY(-2px);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
    width: auto;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
    transform: none;
  }

  .btn-outline {
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-secondary);
    width: auto;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
    transform: none;
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
    width: auto;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .btn-danger:hover {
    background: var(--color-error-dark);
    transform: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Section styles */
  .layouts-section {
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-primary);
    font-size: 1.25rem;
    margin: 0 0 0.25rem 0;
    transition: color var(--transition-normal);
  }

  .section-header h2 svg {
    color: var(--color-text-secondary);
  }

  .section-description {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0;
    transition: color var(--transition-normal);
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    background: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .empty-state svg {
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
    opacity: 0.5;
    width: 48px;
    height: 48px;
  }

  .empty-state h3 {
    color: var(--color-text-primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    transition: color var(--transition-normal);
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  .empty-state .btn {
    display: inline-flex;
    width: auto;
  }

  /* Grid layout */
  .layouts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .layout-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      box-shadow var(--transition-normal);
  }

  .layout-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .layout-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .layout-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--color-text-primary);
  }

  .layout-description {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .default-badge {
    background: var(--color-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .builtin-badge {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid var(--color-border-secondary);
  }

  .badge-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .builtin-card {
    background: var(--color-bg-secondary);
    border-style: dashed;
  }

  .builtin-card:hover {
    border-style: solid;
  }

  .builtin-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border-secondary);
  }

  .layout-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .layout-meta code {
    background: var(--color-bg-secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.75rem;
  }

  .layout-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border-secondary);
    margin-top: auto;
  }

  .layout-actions form {
    display: contents;
  }

  /* Tablet and up */
  @media (min-width: 768px) {
    .page-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .page-description {
      font-size: 1rem;
    }

    .btn-primary {
      width: auto;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    }

    .section-header h2 {
      font-size: 1.5rem;
    }

    .section-description {
      font-size: 1rem;
    }

    .empty-state {
      padding: 4rem 2rem;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
    }

    .empty-state h3 {
      font-size: 1.5rem;
    }

    .empty-state p {
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .layouts-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .layout-card {
      padding: 1.5rem;
    }

    .layout-header h3 {
      font-size: 1.25rem;
    }

    .layout-meta {
      font-size: 0.875rem;
    }

    .layout-meta code {
      font-size: 0.8125rem;
    }

    .layout-actions {
      gap: 0.75rem;
    }
  }
</style>
