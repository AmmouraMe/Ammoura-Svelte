<script lang="ts">
  import { onMount } from 'svelte';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import type { WidgetConfig } from '$lib/types/pages';
  import type { Product } from '$lib/types';

  export let config: WidgetConfig;

  let product: Product | null = null;
  let loading = true;
  let error = false;

  $: productId = config.productId || '';

  onMount(async () => {
    if (!productId) {
      loading = false;
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = (await response.json()) as Product;
        product = data;
      } else {
        error = true;
      }
    } catch (err) {
      console.error('Error loading product:', err);
      error = true;
    } finally {
      loading = false;
    }
  });
</script>

<div class="single-product-widget" id={config.anchorName || undefined}>
  {#if loading}
    <div class="loading">Loading product...</div>
  {:else if error}
    <div class="error">Failed to load product</div>
  {:else if product}
    <ProductCard {product} />
  {:else}
    <div class="empty">No product configured</div>
  {/if}
</div>

<style>
  .single-product-widget {
    padding: 1rem 0;
  }

  .loading,
  .error,
  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    border-radius: 8px;
    transition:
      color var(--transition-normal),
      background-color var(--transition-normal);
  }

  .error {
    color: var(--color-danger);
  }
</style>
