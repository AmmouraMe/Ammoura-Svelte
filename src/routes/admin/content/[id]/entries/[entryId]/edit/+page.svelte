<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast';
  import { confirmStore } from '$lib/stores/confirm';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageData } from './$types';
  import type { ContentFieldDefinition, NumberFieldConfig } from '$lib/types/contentTypes';

  export let data: PageData;

  $: contentType = data.contentType;
  $: entry = data.entry;
  $: fields = contentType.fieldsSchema;

  let title = data.entry.title;
  let slug = data.entry.slug;
  let fieldValues: Record<string, unknown> = { ...data.entry.fieldValues };
  let tagsInput = data.tags.map((t: { tagName: string }) => t.tagName).join(', ');

  const handleFormResult: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        const msg = (result.data as Record<string, unknown> | undefined)?.message ?? 'Saved';
        toastStore.success(msg as string);
      } else if (result.type === 'failure') {
        const err =
          (result.data as Record<string, unknown> | undefined)?.error ?? 'An error occurred';
        toastStore.error(err as string);
      }
      await update();
    };
  };

  function getFieldValue(slug: string): string {
    const val = fieldValues[slug];
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val;
    return String(val);
  }

  function setFieldValue(slug: string, value: unknown): void {
    fieldValues = { ...fieldValues, [slug]: value };
  }

  function getNumConfig(field: ContentFieldDefinition): NumberFieldConfig | undefined {
    return field.type === 'number' ? (field.config as NumberFieldConfig) : undefined;
  }

  async function handleDelete(): Promise<void> {
    const confirmed = await confirmStore.show(
      `Delete "${entry.title}" permanently? This cannot be undone.`,
      {
        title: 'Delete Entry',
        confirmText: 'Delete',
        variant: 'danger'
      }
    );
    if (confirmed) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '?/delete';
      document.body.appendChild(form);
      form.submit();
    }
  }
</script>

<svelte:head>
  <title>Edit {entry.title} - {contentType.name} - Admin</title>
</svelte:head>

<div class="edit-entry-page">
  <div class="page-header">
    <button class="btn btn-ghost" on:click={() => goto(`/admin/content/${contentType.id}/entries`)}>
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
    <h1>Edit Entry</h1>
    <span class="status-badge status-{entry.status}">{entry.status}</span>
  </div>

  <form method="POST" action="?/update" use:enhance={handleFormResult}>
    <input type="hidden" name="fieldValues" value={JSON.stringify(fieldValues)} />

    <div class="form-layout">
      <div class="main-column">
        <!-- Title and slug -->
        <section class="form-card">
          <div class="form-group">
            <label for="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              bind:value={title}
              placeholder="Entry title"
              required
            />
          </div>

          <div class="form-group">
            <label for="slug">Slug</label>
            <div class="slug-preview">
              <span class="slug-prefix">{contentType.basePath}/</span>
              <input
                type="text"
                id="slug"
                name="slug"
                bind:value={slug}
                placeholder="entry-slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
          </div>
        </section>

        <!-- Dynamic fields -->
        <section class="form-card">
          <h2>Content Fields</h2>

          {#each fields as field (field.slug)}
            <div class="form-group">
              <label for="field-{field.slug}">
                {field.name}
                {#if field.required}<span class="required">*</span>{/if}
              </label>
              {#if field.helpText}
                <span class="field-description">{field.helpText}</span>
              {/if}

              {#if field.type === 'text' || field.type === 'email' || field.type === 'url' || field.type === 'tel'}
                <input
                  type={field.type === 'text' ? 'text' : field.type}
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  placeholder={field.helpText || `Enter ${field.name.toLowerCase()}`}
                  required={field.required}
                />
              {:else if field.type === 'textarea' || field.type === 'rich_text'}
                <textarea
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  rows={field.type === 'rich_text' ? 8 : 4}
                  placeholder={field.helpText || `Enter ${field.name.toLowerCase()}`}
                  required={field.required}
                ></textarea>
              {:else if field.type === 'number'}
                <input
                  type="number"
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) =>
                    setFieldValue(field.slug, parseFloat(e.currentTarget.value) || 0)}
                  min={getNumConfig(field)?.min}
                  max={getNumConfig(field)?.max}
                  step={getNumConfig(field)?.step || 1}
                  required={field.required}
                />
              {:else if field.type === 'boolean'}
                <label class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="field-{field.slug}"
                    checked={!!getFieldValue(field.slug)}
                    on:change={(e) => setFieldValue(field.slug, e.currentTarget.checked)}
                  />
                  <span>{field.name}</span>
                </label>
              {:else if field.type === 'date'}
                <input
                  type="date"
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  required={field.required}
                />
              {:else if field.type === 'datetime'}
                <input
                  type="datetime-local"
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  required={field.required}
                />
              {:else if field.type === 'selection'}
                <select
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:change={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {#if field.config && 'options' in field.config}
                    {#each field.config.options as opt}
                      <option value={opt.value}>{opt.label}</option>
                    {/each}
                  {/if}
                </select>
              {:else if field.type === 'media'}
                <input
                  type="url"
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  placeholder="Media URL or path"
                  required={field.required}
                />
                <span class="form-hint">Enter a URL for the media file</span>
              {:else if field.type === 'json'}
                <textarea
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => {
                    try {
                      setFieldValue(field.slug, JSON.parse(e.currentTarget.value));
                    } catch {
                      setFieldValue(field.slug, e.currentTarget.value);
                    }
                  }}
                  rows="4"
                  placeholder="Enter JSON object"
                ></textarea>
              {:else}
                <input
                  type="text"
                  id="field-{field.slug}"
                  value={getFieldValue(field.slug)}
                  on:input={(e) => setFieldValue(field.slug, e.currentTarget.value)}
                  placeholder={`Enter ${field.name.toLowerCase()}`}
                />
              {/if}
            </div>
          {/each}
        </section>

        <!-- Tags -->
        <section class="form-card">
          <h2>Tags</h2>
          <div class="form-group">
            <label for="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              bind:value={tagsInput}
              placeholder="tag1, tag2, tag3"
            />
            <span class="form-hint">Comma-separated list of tags</span>
          </div>
        </section>
      </div>

      <div class="sidebar">
        <!-- Publishing -->
        <section class="form-card">
          <h3>Publishing</h3>
          <div class="status-info">
            <span>Status:</span>
            <span class="status-badge status-{entry.status}">{entry.status}</span>
          </div>

          {#if entry.publishedAt}
            <div class="meta-item">
              <span>Published:</span>
              <span>{new Date(entry.publishedAt * 1000).toLocaleDateString()}</span>
            </div>
          {/if}

          <div class="meta-item">
            <span>Created:</span>
            <span>{new Date(entry.createdAt * 1000).toLocaleDateString()}</span>
          </div>

          <div class="meta-item">
            <span>Updated:</span>
            <span>{new Date(entry.updatedAt * 1000).toLocaleDateString()}</span>
          </div>

          <div class="publish-actions">
            <button type="submit" class="btn btn-primary btn-full">Save Changes</button>
          </div>

          {#if entry.status === 'draft'}
            <form
              method="POST"
              action="?/publish"
              use:enhance={handleFormResult}
              class="publish-form"
            >
              <button type="submit" class="btn btn-success btn-full">Publish</button>
            </form>
          {:else if entry.status === 'published'}
            <form
              method="POST"
              action="?/unpublish"
              use:enhance={handleFormResult}
              class="publish-form"
            >
              <button type="submit" class="btn btn-warning btn-full">Unpublish</button>
            </form>
          {/if}
        </section>

        <!-- Preview -->
        <section class="form-card">
          <h3>Preview</h3>
          <a
            href="{contentType.basePath}/{entry.slug}"
            class="btn btn-outline btn-full"
            target="_blank"
            rel="noopener"
          >
            View on site &rarr;
          </a>
        </section>

        <!-- Danger zone -->
        <section class="form-card danger-zone">
          <h3>Danger Zone</h3>
          <p>Permanently delete this entry. This action cannot be undone.</p>
          <button type="button" class="btn btn-danger btn-full" on:click={handleDelete}>
            Delete Entry
          </button>
        </section>
      </div>
    </div>
  </form>
</div>

<style>
  /* === Mobile-first base styles === */
  .edit-entry-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .form-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .form-card {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal);
  }

  .form-card h2,
  .form-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    transition: color var(--transition-normal);
  }

  .required {
    color: var(--color-danger);
  }

  .field-description {
    display: block;
    margin-bottom: 0.375rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    transition: color var(--transition-normal);
  }

  .form-group input[type='text'],
  .form-group input[type='email'],
  .form-group input[type='url'],
  .form-group input[type='tel'],
  .form-group input[type='number'],
  .form-group input[type='date'],
  .form-group input[type='datetime-local'],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.5rem 0.75rem;
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
  .form-group textarea:focus,
  .form-group select:focus {
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

  .slug-preview {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .slug-prefix {
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-primary);
    border-right: none;
    border-radius: 8px 0 0 8px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    white-space: nowrap;
    transition:
      background-color var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal);
  }

  .slug-preview input {
    border-radius: 0 8px 8px 0 !important;
    font-family: var(--font-mono);
  }

  .checkbox-wrapper {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-wrapper input[type='checkbox'] {
    width: auto;
  }

  /* Status badges */
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-draft {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
  }

  .status-published {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
  }

  .status-archived {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }

  .status-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    transition: color var(--transition-normal);
  }

  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
    transition: color var(--transition-normal);
  }

  .publish-actions {
    margin-top: 1rem;
  }

  .publish-form {
    margin-top: 0.5rem;
  }

  /* Danger zone */
  .danger-zone {
    border-color: var(--color-danger);
    border-style: dashed;
  }

  .danger-zone h3 {
    color: var(--color-danger);
  }

  .danger-zone p {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    margin: 0 0 1rem 0;
    transition: color var(--transition-normal);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
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

  .btn-success {
    background: var(--color-success);
    color: var(--color-text-inverse);
  }

  .btn-success:hover {
    background: var(--color-success-hover);
  }

  .btn-warning {
    background: var(--color-warning);
    color: var(--color-text-inverse);
  }

  .btn-warning:hover {
    background: var(--color-warning-hover);
  }

  .btn-danger {
    background: var(--color-danger);
    color: var(--color-text-inverse);
  }

  .btn-danger:hover {
    background: var(--color-danger-hover);
  }

  .btn-outline {
    background: transparent;
    border-color: var(--color-border-primary);
    color: var(--color-text-primary);
    text-align: center;
  }

  .btn-outline:hover {
    background: var(--color-bg-secondary);
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

  .btn-full {
    width: 100%;
  }

  /* === Tablet (768px+) === */
  @media (min-width: 768px) {
    .edit-entry-page {
      padding: 1.5rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
    }

    .form-layout {
      grid-template-columns: 1fr 280px;
    }

    .form-card {
      padding: 1.5rem;
    }
  }

  /* === Desktop (1024px+) === */
  @media (min-width: 1024px) {
    .edit-entry-page {
      padding: 2rem;
    }
  }
</style>
