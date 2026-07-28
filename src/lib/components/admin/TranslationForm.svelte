<script lang="ts">
  /**
   * Side-by-side source→target translation form used by the admin translation
   * editors. Field inputs are named `t:<field>` so the actions can map them
   * straight to content_translations rows; blank target = fall back to source.
   */
  import { enhance } from '$app/forms';
  import { toastStore } from '$lib/stores/toast';

  export let rows: Array<{ field: string; label: string; source: string; value: string }>;
  export let heading: string;
  export let subheading = '';
  export let form: { success?: boolean; message?: string; error?: string } | null = null;

  $: if (form?.success) {
    toastStore.success(form.message || 'Translations saved');
  }
  $: if (form?.error) {
    toastStore.error(form.error);
  }

  let isSubmitting = false;
</script>

<div class="translation-editor">
  <div class="page-header">
    <a class="back-link" href="/admin/translations">← All translations</a>
    <h1>{heading}</h1>
    {#if subheading}
      <p>{subheading}</p>
    {/if}
  </div>

  {#if rows.length === 0}
    <div class="editor-card">
      <p class="empty">Nothing translatable found on this item yet.</p>
    </div>
  {:else}
    <form
      method="POST"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update({ reset: false });
          isSubmitting = false;
        };
      }}
    >
      <div class="editor-card">
        <div class="row header-row">
          <span>Original</span>
          <span>Translation</span>
        </div>
        {#each rows as row (row.field)}
          <div class="row">
            <div class="source">
              <span class="field-label">{row.label}</span>
              <p>{row.source}</p>
            </div>
            <div class="target">
              {#if row.source.length > 80}
                <textarea
                  name={`t:${row.field}`}
                  rows="3"
                  value={row.value}
                  placeholder={row.source}
                ></textarea>
              {:else}
                <input
                  type="text"
                  name={`t:${row.field}`}
                  value={row.value}
                  placeholder={row.source}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <button type="submit" class="save-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Translations'}
      </button>
    </form>
  {/if}
</div>

<style>
  .translation-editor {
    width: 100%;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .back-link {
    color: var(--color-primary);
    font-size: 0.85rem;
  }

  h1 {
    color: var(--color-text-primary);
    font-size: 1.6rem;
    margin: 0.5rem 0 0.25rem 0;
  }

  .page-header p {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .editor-card {
    background: var(--color-bg-primary);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 8px var(--color-shadow-light);
    margin-bottom: 1.25rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .row:last-child {
    border-bottom: none;
  }

  .header-row {
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    padding: 0.5rem 0;
  }

  .field-label {
    display: block;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.2rem;
  }

  .source p {
    color: var(--color-text-primary);
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .target input,
  .target textarea {
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 0.92rem;
    font-family: inherit;
    resize: vertical;
  }

  .empty {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .save-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.4rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
  }
</style>
