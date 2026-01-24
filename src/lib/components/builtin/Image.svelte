<script lang="ts">
  import type { WidgetConfig } from '$lib/types/pages';

  export let config: WidgetConfig;

  $: src = config.src || '';
  $: alt = config.alt || '';
  $: width = config.width;
</script>

{#if src}
  <div class="image-widget" id={config.anchorName || undefined}>
    <img {src} {alt} style:max-width={width ? `${width}px` : '100%'} />
  </div>
{/if}

<style>
  .image-widget {
    padding: 1rem 0;
    text-align: center;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }
</style>
