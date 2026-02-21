<script lang="ts">
  /**
   * Default content entry renderer for CMS entries without a Page Builder template.
   * Renders entry fields in a clean, readable layout using the content type's field schema.
   */
  import type { ContentEntry, ContentType, ContentFieldDefinition } from '$lib/types/contentTypes';

  export let entry: ContentEntry;
  export let contentType: ContentType;

  $: fields = contentType.fieldsSchema || [];

  function getFieldValue(field: ContentFieldDefinition): string {
    const val = entry.fieldValues?.[field.slug];
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  function isRichText(field: ContentFieldDefinition): boolean {
    return field.type === 'rich_text' || field.type === 'textarea';
  }

  function isMedia(field: ContentFieldDefinition): boolean {
    return field.type === 'media';
  }

  function isUrl(field: ContentFieldDefinition): boolean {
    return field.type === 'url';
  }

  function formatDate(timestamp: number | null): string {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<article class="default-entry">
  <header class="entry-header">
    <h1 class="entry-title">{entry.title}</h1>
    {#if entry.publishedAt}
      <time class="entry-date" datetime={new Date(entry.publishedAt * 1000).toISOString()}>
        {formatDate(entry.publishedAt)}
      </time>
    {/if}
  </header>

  <div class="entry-body">
    {#each fields as field (field.slug)}
      {@const value = getFieldValue(field)}
      {#if value}
        {#if isMedia(field) && value}
          <figure class="entry-media">
            <img src={value} alt={field.name} loading="lazy" />
          </figure>
        {:else if isRichText(field)}
          <div class="entry-rich-text">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rich text content is sanitized before storage -->
            {@html value}
          </div>
        {:else if isUrl(field)}
          <p class="entry-field">
            <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
          </p>
        {:else if field.type === 'boolean'}
          <!-- Skip boolean display in default view -->
        {:else if field.type !== 'text' || field.slug !== 'title'}
          <p class="entry-field">{value}</p>
        {/if}
      {/if}
    {/each}
  </div>
</article>

<style>
  .default-entry {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .entry-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border-primary, #e5e7eb);
  }

  .entry-title {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1.2;
    color: var(--color-text-primary, #111827);
    margin: 0 0 0.5rem;
    transition: color var(--transition-normal);
  }

  .entry-date {
    display: block;
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
    transition: color var(--transition-normal);
  }

  .entry-body {
    font-size: 1.0625rem;
    line-height: 1.75;
    color: var(--color-text-primary, #374151);
    transition: color var(--transition-normal);
  }

  .entry-media {
    margin: 1.5rem 0;
  }

  .entry-media img {
    width: 100%;
    height: auto;
    border-radius: 12px;
    object-fit: cover;
  }

  .entry-rich-text {
    margin-bottom: 1.5rem;
  }

  .entry-rich-text :global(h2) {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 2rem 0 1rem;
    color: var(--color-text-primary, #111827);
  }

  .entry-rich-text :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: var(--color-text-primary, #111827);
  }

  .entry-rich-text :global(p) {
    margin-bottom: 1rem;
  }

  .entry-rich-text :global(ul),
  .entry-rich-text :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .entry-rich-text :global(blockquote) {
    margin: 1.5rem 0;
    padding: 1rem 1.5rem;
    border-left: 4px solid var(--color-primary, #6366f1);
    background: var(--color-bg-secondary, #f9fafb);
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: var(--color-text-secondary, #4b5563);
  }

  .entry-rich-text :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .entry-rich-text :global(a) {
    color: var(--color-primary, #6366f1);
    text-decoration: underline;
  }

  .entry-field {
    margin-bottom: 1rem;
  }

  .entry-field a {
    color: var(--color-primary, #6366f1);
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .entry-title {
      font-size: 1.75rem;
    }

    .entry-body {
      font-size: 1rem;
    }
  }
</style>
