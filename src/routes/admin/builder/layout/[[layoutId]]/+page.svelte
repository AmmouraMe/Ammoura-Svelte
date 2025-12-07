<script lang="ts">
  import { goto } from '$app/navigation';
  import { invalidateAll } from '$app/navigation';
  import { page as pageStore } from '$app/stores';
  import type { PageData } from './$types';
  import AdvancedBuilder from '$lib/components/builder/AdvancedBuilder.svelte';
  import { toastStore } from '$lib/stores/toast';
  import type { PageComponent } from '$lib/types/pages';

  export let data: PageData;

  // Convert layout components to PageComponent format expected by AdvancedBuilder
  const parsedComponents: PageComponent[] = data.components.map((c) => ({
    id: c.id,
    page_id: data.layout ? String(data.layout.id) : 'new',
    type: c.type as PageComponent['type'],
    position: c.position,
    config: c.config,
    created_at: new Date(c.created_at).getTime(),
    updated_at: new Date(c.updated_at).getTime()
  }));

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
  }

  async function handleSave(saveData: SaveData): Promise<void> {
    try {
      if (data.isNewLayout) {
        // Create new layout
        const response = await fetch('/api/layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            slug: saveData.slug,
            components: saveData.components
          })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Failed to create layout');
        }

        const result = (await response.json()) as { layoutId: number };
        toastStore.success('Layout created successfully!');

        // Redirect to the edit page with the new layout ID
        await goto(`/admin/builder/layout/${result.layoutId}`);
        await invalidateAll();
      } else {
        // Update existing layout
        const response = await fetch(`/api/layouts/${data.layout!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            slug: saveData.slug,
            components: saveData.components
          })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Failed to save layout');
        }

        toastStore.success('Layout saved successfully!');
        await invalidateAll();
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to save layout');
      throw error;
    }
  }

  async function handlePublish(_saveData: SaveData): Promise<void> {
    // For layouts, publishing is handled by the save operation
    // The AdvancedBuilder already calls onSave before onPublish for existing layouts
    // So we just need to show a success message here
    toastStore.info('Layout published!');
  }

  function handleExit(): void {
    goto('/admin/layouts');
  }

  // Convert layout to page-compatible format for AdvancedBuilder
  const pageFormatted = data.layout
    ? {
        id: String(data.layout.id),
        site_id: data.layout.site_id,
        title: data.layout.name,
        slug: data.layout.slug,
        status: 'published' as const,
        created_at: new Date(data.layout.created_at).getTime(),
        updated_at: new Date(data.layout.updated_at).getTime()
      }
    : null;
</script>

<svelte:head>
  <title
    >{data.isNewLayout ? 'New Layout' : `Edit ${data.layout?.name || 'Layout'}`} - Builder</title
  >
</svelte:head>

<AdvancedBuilder
  mode="layout"
  page={pageFormatted}
  initialComponents={parsedComponents}
  revisions={data.revisions}
  currentRevisionId={data.currentRevisionId}
  currentRevisionIsPublished={data.currentRevisionIsPublished}
  colorThemes={data.colorThemes}
  components={data.customComponents}
  userName={data.userName}
  user={data.currentUser}
  siteContext={$pageStore.data.siteContext}
  onSave={handleSave}
  onPublish={handlePublish}
  onExit={handleExit}
/>
