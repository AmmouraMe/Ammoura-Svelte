<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  let creating: string | null = null;
  let errorMsg = '';

  async function startFromTemplate(templateId: string) {
    creating = templateId;
    errorMsg = '';
    try {
      const res = await fetch('/api/admin/products/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { productId } = (await res.json()) as { productId: string };
      goto(`/admin/products/${productId}/edit`);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Failed to create product';
      creating = null;
    }
  }
</script>

<svelte:head>
  <title>New Product - Ammoura Admin</title>
</svelte:head>

<div class="new-product-page">
  <div class="page-header">
    <div>
      <h1>Create a product</h1>
      <p>
        Start from a print-on-demand template with ready-made print areas, or build from scratch.
      </p>
    </div>
    <a href="/admin/products" class="back-link">← Back to products</a>
  </div>

  {#if errorMsg}
    <div class="error-banner">{errorMsg}</div>
  {/if}

  <h2 class="section-title">Start from a template</h2>
  <div class="template-grid">
    {#each data.templates as tpl (tpl.id)}
      <button
        class="template-card"
        disabled={creating !== null}
        on:click={() => startFromTemplate(tpl.id)}
      >
        <img src={tpl.baseImage} alt={tpl.name} class="template-image" />
        <div class="template-body">
          <h3>{tpl.name}</h3>
          {#if tpl.description}<p class="template-desc">{tpl.description}</p>{/if}
          <div class="print-areas">
            {#each tpl.printAreas as area}
              <span class="area-badge">
                {area.name} · {area.physWidth}×{area.physHeight}{area.unit} @ {area.requiredDpi}dpi
              </span>
            {/each}
          </div>
          <div class="template-foot">
            <span class="price">${tpl.defaultPrice.toFixed(2)}</span>
            <span class="cta">{creating === tpl.id ? 'Creating…' : 'Use template →'}</span>
          </div>
        </div>
      </button>
    {/each}
  </div>

  <h2 class="section-title">Or</h2>
  <a href="/admin/products/add" class="blank-option">
    <strong>Start from a blank product</strong>
    <span>A plain product with no print areas — add customization later.</span>
  </a>
</div>

<style>
  .new-product-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    margin: 0 0 0.25rem;
    color: var(--color-text-primary);
  }

  .page-header p {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .back-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    white-space: nowrap;
  }

  .error-banner {
    background: var(--color-bg-danger-light, rgba(248, 113, 113, 0.15));
    color: var(--color-danger);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 1.5rem 0 0.75rem;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }

  .template-card {
    text-align: left;
    padding: 0;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-secondary);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition:
      border-color 0.15s,
      transform 0.15s;
    color: inherit;
    font: inherit;
  }

  .template-card:hover:not(:disabled) {
    border-color: var(--color-primary);
    transform: translateY(-2px);
  }

  .template-card:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .template-image {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
    background: var(--color-bg-primary);
  }

  .template-body {
    padding: 0.85rem 1rem 1rem;
  }

  .template-body h3 {
    margin: 0 0 0.25rem;
    color: var(--color-text-primary);
  }

  .template-desc {
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .print-areas {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .area-badge {
    font-size: 0.7rem;
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
  }

  .template-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .price {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .cta {
    font-size: 0.85rem;
    color: var(--color-primary);
    font-weight: 500;
  }

  .blank-option {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 1rem 1.25rem;
    background: var(--color-bg-secondary);
    border: 1px dashed var(--color-border-primary);
    border-radius: 12px;
    text-decoration: none;
    max-width: 420px;
  }

  .blank-option strong {
    color: var(--color-text-primary);
  }

  .blank-option span {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
</style>
