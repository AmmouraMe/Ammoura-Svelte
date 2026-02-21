<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast';
  import type { PageData, ActionData } from './$types';
  import type { ContentFieldDefinition, NumberFieldConfig } from '$lib/types/contentTypes';

  export let data: PageData;
  export let form: ActionData;

  $: contentType = data.contentType;
  $: fields = contentType.fieldsSchema;

  let title = '';
  let slug = '';
  let status = 'draft';
  let autoSlug = true;
  let fieldValues: Record<string, unknown> = {};

  // Initialize field defaults
  $: {
    for (const field of fields) {
      if (fieldValues[field.slug] === undefined && field.defaultValue !== undefined) {
        fieldValues[field.slug] = field.defaultValue;
      }
    }
  }

  $: if (form?.error) {
    toastStore.error(form.error as string);
  }

  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleTitleInput(): void {
    if (autoSlug) {
      slug = generateSlug(title);
    }
  }

  function handleSlugInput(): void {
    autoSlug = false;
  }

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
</script>

<svelte:head>
  <title>New {contentType.name} Entry - Admin</title>
</svelte:head>

<div class="create-entry-page">
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
    <h1>New {contentType.name} Entry</h1>
  </div>

  <form method="POST" action="?/create" use:enhance>
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
              on:input={handleTitleInput}
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
                on:input={handleSlugInput}
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
      </div>

      <div class="sidebar">
        <section class="form-card">
          <h3>Publishing</h3>
          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" bind:value={status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div class="publish-actions">
            <button type="submit" class="btn btn-primary btn-full">
              {status === 'published' ? 'Create & Publish' : 'Create Draft'}
            </button>
          </div>
        </section>
      </div>
    </div>
  </form>
</div>

<style>
  /* === Mobile-first base styles === */
  .create-entry-page {
    max-width: 1100px;
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

  .publish-actions {
    margin-top: 1rem;
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
    .create-entry-page {
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
    .create-entry-page {
      padding: 2rem;
    }
  }
</style>
