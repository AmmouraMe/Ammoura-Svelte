<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';

  export let config: WidgetConfig;

  $: src = config.src || '';
  $: alt = config.alt || '';
  $: width = config.width;
</script>

{#if src}
  <div class="image-widget" id={config.anchorName || undefined}>
    <!-- Lazy + async by default: content images are rarely the LCP element, and
         this keeps them off the critical path. (A true responsive srcset needs a
         media-library variant system — only one thumbnailUrl exists today.) -->
    <img
      {src}
      {alt}
      loading="lazy"
      decoding="async"
      style:max-width={width ? `${width}px` : '100%'}
    />
  </div>
{/if}

<style>
  .image-widget {
    padding: var(--space-4) 0;
    text-align: center;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
  }
</style>
