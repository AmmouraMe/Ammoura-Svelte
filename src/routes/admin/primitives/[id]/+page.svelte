<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import AdvancedBuilder from '$lib/components/builder/AdvancedBuilder.svelte';
  import { toastStore } from '$lib/stores/toast';
  import type { PageComponent } from '$lib/types/pages';

  export let data: PageData;

  // Convert primitive widgets to PageComponent format expected by AdvancedBuilder
  const parsedComponents: PageComponent[] = data.widgets.map((w) => ({
    id: w.id,
    page_id: data.primitive ? String(data.primitive.id) : 'primitive',
    type: w.type as PageComponent['type'],
    position: w.position,
    config: w.config,
    created_at: new Date(w.created_at).getTime(),
    updated_at: new Date(w.updated_at).getTime()
  }));

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
  }

  async function handleSave(saveData: SaveData): Promise<void> {
    try {
      // For primitives, we only update the config of the single widget
      const primitiveConfig = saveData.components[0]?.config || {};

      const response = await fetch(`/api/components/${data.primitive!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveData.title,
          type: data.primitive!.type, // Keep the same type
          config: primitiveConfig // Update the default config
        })
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to save primitive');
      }

      toastStore.success('Primitive defaults saved successfully!');
      await invalidateAll();
    } catch (error) {
      console.error('Failed to save primitive:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to save primitive');
      throw error;
    }
  }

  async function handlePublish(_saveData: SaveData): Promise<void> {
    // For primitives, publishing is handled by the save operation
    // The AdvancedBuilder already calls onSave before onPublish for existing primitives
    // So we just need to show a success message here
    toastStore.info('Primitive defaults applied!');
  }

  function handleExit(): void {
    goto('/admin/primitives');
  }

  // Convert primitive to page-compatible format for AdvancedBuilder
  const pageFormatted = data.primitive
    ? {
        id: String(data.primitive.id),
        site_id: data.primitive.site_id,
        title: data.primitive.name,
        slug: `/primitive-${data.primitive.id}`,
        status: 'published' as const,
        is_builtin: false,
        created_at: new Date(data.primitive.created_at).getTime(),
        updated_at: new Date(data.primitive.updated_at).getTime()
      }
    : null;
</script>

<svelte:head>
  <title>Edit {data.primitive?.name || 'Primitive'} Defaults - Admin</title>
</svelte:head>

<AdvancedBuilder
  mode="primitive"
  page={pageFormatted}
  initialComponents={parsedComponents}
  revisions={data.revisions}
  currentRevisionId={data.currentRevisionId}
  currentRevisionIsPublished={data.currentRevisionIsPublished}
  colorThemes={data.colorThemes}
  components={[]}
  currentComponentId={data.primitive?.id || null}
  userName={data.userName}
  onSave={handleSave}
  onPublish={handlePublish}
  onExit={handleExit}
/>
