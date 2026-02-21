<script lang="ts">
  /**
   * Default content listing renderer for CMS listing pages without a Page Builder template.
   * Renders entries as a card grid with title, date, and excerpt.
   */
  import type { ContentEntry, ContentType, ContentFieldDefinition } from '$lib/types/contentTypes';

  export let entries: ContentEntry[];
  export let contentType: ContentType;

  function getExcerpt(entry: ContentEntry): string {
    const fields = contentType.fieldsSchema || [];
    // Try common field names for excerpts/descriptions
    for (const name of ['excerpt', 'description', 'summary', 'body', 'content']) {
      const field = fields.find((f: ContentFieldDefinition) => f.slug === name);
      if (field) {
        const val = entry.fieldValues?.[field.slug];
        if (typeof val === 'string' && val.length > 0) {
          // Strip HTML tags and truncate
          const text = val.replace(/<[^>]*>/g, '');
          return text.length > 200 ? text.slice(0, 200) + '...' : text;
        }
      }
    }
    return '';
  }

  function getFeaturedImage(entry: ContentEntry): string | null {
    const fields = contentType.fieldsSchema || [];
    for (const name of ['featured_image', 'image', 'thumbnail', 'cover', 'photo']) {
      const field = fields.find(
        (f: ContentFieldDefinition) => f.slug === name && f.type === 'media'
      );
      if (field) {
        const val = entry.fieldValues?.[field.slug];
        if (typeof val === 'string' && val.length > 0) return val;
      }
    }
    return null;
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

<div class="default-listing">
  <h1 class="listing-title">{contentType.name}</h1>
  {#if contentType.description}
    <p class="listing-description">{contentType.description}</p>
  {/if}

  {#if entries.length === 0}
    <p class="empty-message">No entries published yet.</p>
  {:else}
    <div class="entries-grid">
      {#each entries as entry (entry.id)}
        {@const image = getFeaturedImage(entry)}
        {@const excerpt = getExcerpt(entry)}
        <a href="{contentType.basePath}/{entry.slug}" class="entry-card">
          {#if image}
            <div class="card-image">
              <img src={image} alt={entry.title} loading="lazy" />
            </div>
          {/if}
          <div class="card-body">
            <h2 class="card-title">{entry.title}</h2>
            {#if entry.publishedAt}
              <time class="card-date">{formatDate(entry.publishedAt)}</time>
            {/if}
            {#if excerpt}
              <p class="card-excerpt">{excerpt}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .default-listing {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .listing-title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-primary, #111827);
    margin: 0 0 0.5rem;
    transition: color var(--transition-normal);
  }

  .listing-description {
    font-size: 1.0625rem;
    color: var(--color-text-secondary, #6b7280);
    margin: 0 0 2rem;
    transition: color var(--transition-normal);
  }

  .empty-message {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted, #9ca3af);
    font-size: 1.0625rem;
  }

  .entries-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .entry-card {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border-primary, #e5e7eb);
    border-radius: 12px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
      box-shadow 0.2s ease,
      transform 0.2s ease,
      border-color var(--transition-normal);
  }

  .entry-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .card-image {
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .entry-card:hover .card-image img {
    transform: scale(1.03);
  }

  .card-body {
    padding: 1.25rem;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary, #111827);
    margin: 0 0 0.375rem;
    line-height: 1.3;
    transition: color var(--transition-normal);
  }

  .card-date {
    display: block;
    font-size: 0.8125rem;
    color: var(--color-text-muted, #9ca3af);
    margin-bottom: 0.5rem;
    transition: color var(--transition-normal);
  }

  .card-excerpt {
    font-size: 0.9375rem;
    color: var(--color-text-secondary, #6b7280);
    margin: 0;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color var(--transition-normal);
  }

  @media (min-width: 640px) {
    .entries-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .entries-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .listing-title {
      font-size: 1.5rem;
    }
  }
</style>
