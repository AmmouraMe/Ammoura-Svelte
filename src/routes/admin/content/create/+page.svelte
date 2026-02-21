<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: templates = data.templates || [];

  // Form state
  let name = (form?.name as string) || '';
  let slug = (form?.slug as string) || '';
  let description = (form?.description as string) || '';
  let basePath = (form?.basePath as string) || '';
  let icon = (form?.icon as string) || '📄';
  let selectedTemplateId: string | null = null;
  let mode: 'template' | 'custom' = 'template';
  let autoSlug = true;

  $: if (form?.error) {
    toastStore.error(form.error as string);
  }

  function selectTemplate(templateId: string): void {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      selectedTemplateId = templateId;
      if (!name || autoSlug) {
        name = template.name;
        slug = template.slug;
        basePath = template.basePath;
        description = template.description;
        icon = template.icon;
      }
    }
  }

  function clearTemplate(): void {
    selectedTemplateId = null;
  }

  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleNameInput(): void {
    if (autoSlug) {
      slug = generateSlug(name);
      basePath = '/' + slug;
    }
  }

  function handleSlugInput(): void {
    autoSlug = false;
  }
</script>

<svelte:head>
  <title>Create Content Type - Admin</title>
</svelte:head>

<div class="create-page">
  <div class="page-header">
    <button class="btn btn-ghost" on:click={() => goto('/admin/content')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline
          points="15 18 9 12 15 6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Back
    </button>
    <h1>Create Content Type</h1>
  </div>

  <!-- Mode selector -->
  <div class="mode-selector">
    <button
      class="mode-btn"
      class:active={mode === 'template'}
      on:click={() => (mode = 'template')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2" />
        <line x1="3" y1="9" x2="21" y2="9" stroke-width="2" />
        <line x1="9" y1="21" x2="9" y2="9" stroke-width="2" />
      </svg>
      Start from Template
    </button>
    <button
      class="mode-btn"
      class:active={mode === 'custom'}
      on:click={() => {
        mode = 'custom';
        clearTemplate();
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 20h9" stroke-width="2" stroke-linecap="round" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke-width="2" />
      </svg>
      Start from Scratch
    </button>
  </div>

  {#if mode === 'template'}
    <div class="templates-section">
      <h2>Choose a Template</h2>
      <p class="section-description">
        Select a pre-built template to get started quickly. You can customize the fields later.
      </p>

      <div class="template-grid">
        {#each templates as template (template.id)}
          <button
            class="template-card"
            class:selected={selectedTemplateId === template.id}
            on:click={() => selectTemplate(template.id)}
          >
            <div class="template-icon">{template.icon}</div>
            <div class="template-content">
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <div class="template-meta">
                <span>{template.fieldsSchema.length} fields</span>
                <span>{template.basePath}</span>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <form method="POST" action="?/create" use:enhance class="create-form">
    {#if selectedTemplateId}
      <input type="hidden" name="templateId" value={selectedTemplateId} />
    {/if}

    <div class="form-section">
      <h2>{mode === 'template' && selectedTemplateId ? 'Customize' : 'Content Type Details'}</h2>

      <div class="form-group">
        <label for="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          bind:value={name}
          on:input={handleNameInput}
          placeholder="e.g., Blog Posts"
          required
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="slug">Slug</label>
          <input
            type="text"
            id="slug"
            name="slug"
            bind:value={slug}
            on:input={handleSlugInput}
            placeholder="e.g., blog-posts"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <span class="form-hint">URL-safe identifier for this content type</span>
        </div>

        <div class="form-group">
          <label for="basePath">Base Path</label>
          <input
            type="text"
            id="basePath"
            name="basePath"
            bind:value={basePath}
            placeholder="e.g., /blog"
            required
          />
          <span class="form-hint">URL prefix for entries (e.g., /blog/my-post)</span>
        </div>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          name="description"
          bind:value={description}
          placeholder="Describe what this content type is for..."
          rows="2"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="icon">Icon</label>
        <input type="text" id="icon" name="icon" bind:value={icon} placeholder="📄" maxlength="4" />
        <span class="form-hint">An emoji icon for the sidebar</span>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" on:click={() => goto('/admin/content')}>
        Cancel
      </button>
      <button type="submit" class="btn btn-primary"> Create Content Type </button>
    </div>
  </form>
</div>

<style>
  /* === Mobile-first base styles === */
  .create-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  /* Mode selector */
  .mode-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border: 2px solid var(--color-border-primary);
    border-radius: 12px;
    background: var(--color-bg-primary);
    cursor: pointer;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-primary);
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .mode-btn:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-secondary);
  }

  .mode-btn.active {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-primary));
    color: var(--color-primary);
  }

  .mode-btn svg {
    flex-shrink: 0;
  }

  /* Templates */
  .templates-section {
    margin-bottom: 1.5rem;
  }

  .templates-section h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .section-description {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0 0 1.25rem 0;
    transition: color var(--transition-normal);
  }

  .template-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .template-card {
    text-align: left;
    padding: 1rem;
    border: 2px solid var(--color-border-primary);
    border-radius: 12px;
    background: var(--color-bg-primary);
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      box-shadow var(--transition-normal),
      transform var(--transition-fast);
  }

  .template-card:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px var(--color-shadow-medium);
    transform: translateY(-1px);
  }

  .template-card.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg-primary));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .template-icon {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--color-bg-secondary);
    overflow: hidden;
    transition: background-color var(--transition-normal);
  }

  .template-content {
    flex: 1;
    min-width: 0;
  }

  .template-card h3 {
    margin: 0 0 0.25rem 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .template-card p {
    margin: 0 0 0.5rem 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
    transition: color var(--transition-normal);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    transition: color var(--transition-normal);
  }

  .template-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    background: var(--color-bg-tertiary);
    border-radius: 4px;
    transition: background-color var(--transition-normal);
  }

  /* Form */
  .create-form {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: 1.25rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .form-section h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1.25rem 0;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border-primary);
    border-radius: 8px;
    font-size: 0.875rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    box-sizing: border-box;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: var(--color-text-muted);
  }

  .form-hint {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    transition: color var(--transition-normal);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-actions {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border-primary);
    transition: border-color var(--transition-normal);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--transition-normal),
      color var(--transition-normal),
      border-color var(--transition-normal),
      transform var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    border-color: var(--color-border-primary);
  }

  .btn-secondary:hover {
    background: var(--color-bg-tertiary);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary);
    border: none;
    padding: 0.5rem;
  }

  .btn-ghost:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-secondary);
    border-radius: 8px;
  }

  /* === Tablet (768px+) === */
  @media (min-width: 768px) {
    .create-page {
      padding: 1.5rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
    }

    .mode-selector {
      flex-direction: row;
      gap: 0.75rem;
    }

    .mode-btn {
      flex: 1;
    }

    .template-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .template-card {
      flex-direction: column;
      padding: 1.25rem;
    }

    .template-icon {
      width: 3rem;
      height: 3rem;
      font-size: 1.75rem;
    }

    .form-row {
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-actions {
      flex-direction: row;
      justify-content: flex-end;
    }

    .create-form {
      padding: 1.5rem;
    }
  }

  /* === Desktop (1024px+) === */
  @media (min-width: 1024px) {
    .create-page {
      padding: 2rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
    }

    .template-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
