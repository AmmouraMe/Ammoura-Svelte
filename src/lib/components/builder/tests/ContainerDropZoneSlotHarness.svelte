<script lang="ts">
  import ContainerDropZone from '../ContainerDropZone.svelte';
  import type { PageWidget } from '$lib/types/pages';

  export let containerId: string;
  export let children: PageWidget[] = [];
</script>

<ContainerDropZone {containerId} {children}>
  <div slot="child" let:child let:index data-testid="slot-child">
    {index}:{child.id}:{child.type}
  </div>
</ContainerDropZone>
