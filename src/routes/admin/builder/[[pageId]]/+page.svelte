<script lang="ts">
  import { goto } from '$app/navigation';
  import { invalidateAll } from '$app/navigation';
  import { page as pageStore } from '$app/stores';
  import type { PageData } from './$types';
  import AdvancedBuilder from '$lib/components/builder/AdvancedBuilder.svelte';
  import { toastStore } from '$lib/stores/toast';
  import type { PageComponent, PageProperties } from '$lib/types/pages';

  export let data: PageData;

  // Components are already in the correct format (PageComponent[]) when coming from revisions
  // They only need parsing when coming from DB page_widgets table (which we no longer use here)
  const parsedComponents: PageComponent[] = data.pageComponents;

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
    layout_id?: number;
    pageProperties?: PageProperties;
    currentRevisionId?: string | null;
  }

  async function handleSave(pageData: SaveData) {
    try {
      if (data.isNewPage) {
        // Create new page (slug should already be unique from AdvancedBuilder)
        const response = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            status: 'draft',
            layout_id: pageData.layout_id || data.defaultLayoutId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create page');
        }

        const newPage = (await response.json()) as { id: string };

        // Create initial revision with components
        const revisionResponse = await fetch(`/api/pages/${newPage.id}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            status: 'draft',
            components: pageData.components,
            pageProperties: pageData.pageProperties,
            notes: 'Initial revision'
          })
        });

        if (!revisionResponse.ok) {
          throw new Error('Failed to create initial revision');
        }

        toastStore.success('Page created successfully');

        // Redirect to edit the new page
        goto(`/admin/builder/${newPage.id}`);
      } else {
        // First, update the page's title, slug, and layout
        // NOTE: We don't update status here - the page keeps its published status
        // The revision will have status: 'draft' but the page remains published if it was
        const pageUpdateResponse = await fetch(`/api/pages/${pageData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            layout_id: pageData.layout_id
          })
        });

        if (!pageUpdateResponse.ok) {
          throw new Error('Failed to update page');
        }

        // Then create a new revision with the updated content
        const response = await fetch(`/api/pages/${pageData.id}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            status: 'draft',
            components: pageData.components,
            pageProperties: pageData.pageProperties,
            parent_revision_id: pageData.currentRevisionId,
            notes: 'Draft save'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save revision');
        }

        const revisionResult = (await response.json()) as { id: string };

        toastStore.success('Page saved successfully');

        // Refetch the page data to get updated revisions
        await invalidateAll();

        // Return the revision ID so the builder can track it
        return { revisionId: revisionResult.id };
      }
    } catch (error) {
      console.error('Save error:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to save page');
    }
  }

  async function handlePublish(pageData: {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
    layout_id?: number;
    pageProperties?: PageProperties;
    currentRevisionId?: string | null;
    hasUnsavedChanges?: boolean;
  }) {
    try {
      let targetPageId = pageData.id;

      // For new pages, we need to create the page first
      if (!targetPageId) {
        // Create new page with published status
        const response = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            status: 'published',
            layout_id: pageData.layout_id || data.defaultLayoutId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create page');
        }

        const newPage = (await response.json()) as { id: string };
        targetPageId = newPage.id;

        // Create a published revision for the new page
        const revisionResponse = await fetch(`/api/pages/${targetPageId}/revisions?publish=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pageData.title,
            slug: pageData.slug,
            status: 'published',
            components: pageData.components,
            pageProperties: pageData.pageProperties,
            notes: 'Initial published version'
          })
        });

        if (!revisionResponse.ok) {
          throw new Error('Failed to create revision');
        }
      } else {
        // Existing page - check if we can just publish the current revision
        const hasChanges = pageData.hasUnsavedChanges !== false;
        const currentRevisionId = pageData.currentRevisionId;

        if (!hasChanges && currentRevisionId) {
          // No unsaved changes - just publish the existing revision directly
          const publishResponse = await fetch(
            `/api/pages/${targetPageId}/revisions/${currentRevisionId}/publish`,
            { method: 'POST' }
          );

          if (!publishResponse.ok) {
            throw new Error('Failed to publish revision');
          }
        } else {
          // Has unsaved changes - need to create a new revision and publish it
          // First, update the page's title and slug
          const pageUpdateResponse = await fetch(`/api/pages/${targetPageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pageData.title,
              slug: pageData.slug,
              status: 'published',
              layout_id: pageData.layout_id
            })
          });

          if (!pageUpdateResponse.ok) {
            throw new Error('Failed to update page');
          }

          // Create a published revision directly with ?publish=true
          const response = await fetch(`/api/pages/${targetPageId}/revisions?publish=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pageData.title,
              slug: pageData.slug,
              status: 'published',
              components: pageData.components,
              pageProperties: pageData.pageProperties,
              parent_revision_id: currentRevisionId,
              notes: 'Published revision'
            })
          });

          if (!response.ok) {
            throw new Error('Failed to publish revision');
          }
        }
      }

      toastStore.success('Page published successfully');

      // For new pages, redirect to the edit page; for existing, just refresh
      if (!pageData.id) {
        goto(`/admin/builder/${targetPageId}`);
      } else {
        // Refetch the page data to show updated page
        await invalidateAll();
      }
    } catch (error) {
      console.error('Publish error:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to publish page');
    }
  }

  function handleExit() {
    goto('/admin/pages');
  }
</script>

<svelte:head>
  <title>{data.isNewPage ? 'New Page' : `Edit ${data.page?.title || 'Page'}`} - Builder</title>
</svelte:head>

<AdvancedBuilder
  page={data.page}
  initialComponents={parsedComponents}
  initialPageProperties={data.pageProperties}
  layoutComponents={data.layoutComponents}
  revisions={data.revisions}
  currentRevisionId={data.currentRevisionId}
  currentRevisionIsPublished={data.currentRevisionIsPublished}
  colorThemes={data.colorThemes}
  layouts={data.layouts}
  defaultLayoutId={data.defaultLayoutId}
  components={data.customComponents}
  userName={data.userName}
  user={data.currentUser}
  siteContext={$pageStore.data.siteContext}
  onSave={handleSave}
  onPublish={handlePublish}
  onExit={handleExit}
/>
