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

  async function handleSave(saveData: SaveData, options?: { message?: string }): Promise<void> {
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

        // Create a new revision to track this change
        const revisionResponse = await fetch(`/api/layouts/${data.layout!.id}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            description: data.layout!.description || '',
            slug: saveData.slug,
            is_default: data.layout!.is_default || false,
            widgets: saveData.components.map((c) => ({
              id: c.id,
              type: c.type,
              position: c.position,
              config: c.config
            })),
            message: options?.message || 'Draft save'
          })
        });

        if (!revisionResponse.ok) {
          console.error('Failed to create revision, but layout was saved');
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

  async function handlePublish(saveData: SaveData): Promise<void> {
    if (data.isNewLayout) {
      // For new layouts, onSave should have been called first
      toastStore.info('Layout created!');
      return;
    }

    try {
      // First save the changes with 'Published revision' message
      await handleSave(saveData, { message: 'Published revision' });

      // Get the most recent revision for this layout
      const revisionsResponse = await fetch(`/api/layouts/${data.layout!.id}/revisions`);
      if (!revisionsResponse.ok) {
        throw new Error('Failed to fetch revisions');
      }

      const revisions = (await revisionsResponse.json()) as Array<{
        id: string;
        is_current: boolean;
      }>;
      const latestRevision = revisions[0]; // Revisions are sorted by created_at DESC

      if (latestRevision && !latestRevision.is_current) {
        // Publish the latest revision
        const publishResponse = await fetch(
          `/api/layouts/${data.layout!.id}/revisions/${latestRevision.id}/publish`,
          { method: 'POST' }
        );

        if (!publishResponse.ok) {
          throw new Error('Failed to publish revision');
        }
      }

      toastStore.success('Layout published!');
      await invalidateAll();
    } catch (error) {
      console.error('Failed to publish layout:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to publish layout');
      throw error;
    }
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
        is_builtin: false,
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
