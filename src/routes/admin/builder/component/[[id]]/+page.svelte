<script lang="ts">
  import { goto } from '$app/navigation';
  import { invalidateAll } from '$app/navigation';
  import { page as pageStore } from '$app/stores';
  import type { PageData } from './$types';
  import AdvancedBuilder from '$lib/components/builder/AdvancedBuilder.svelte';
  import { toastStore } from '$lib/stores/toast';
  import type { PageComponent } from '$lib/types/pages';

  export let data: PageData;

  // Convert component widgets to PageComponent format expected by AdvancedBuilder
  const parsedComponents: PageComponent[] = data.widgets.map((w) => ({
    id: w.id,
    page_id: data.component ? String(data.component.id) : 'new',
    type: w.type as PageComponent['type'],
    position: w.position,
    config: w.config,
    created_at: new Date(w.created_at).getTime(),
    updated_at: new Date(w.updated_at).getTime(),
    parent_id: w.parent_id // Preserve hierarchy for nested components
  }));

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
  }

  async function handleSave(saveData: SaveData): Promise<void> {
    console.log('[handleSave] Starting save with saveData:', {
      title: saveData.title,
      componentsCount: saveData.components.length,
      components: saveData.components.map((c) => ({
        id: c.id,
        type: c.type,
        parent_id: c.parent_id
      }))
    });

    try {
      // Convert PageComponent[] to component children format
      // Preserve parent_id to maintain the component hierarchy
      // Group by parent_id to calculate correct positions within each parent
      const componentsByParent = new Map<string | undefined, typeof saveData.components>();
      for (const c of saveData.components) {
        const parentId = c.parent_id;
        if (!componentsByParent.has(parentId)) {
          componentsByParent.set(parentId, []);
        }
        componentsByParent.get(parentId)!.push(c);
      }

      // Sort each group by position to ensure correct ordering
      for (const [_parentId, siblings] of componentsByParent) {
        siblings.sort((a, b) => a.position - b.position);
      }

      console.log(
        '[handleSave] Components grouped by parent (after sort):',
        Array.from(componentsByParent.entries()).map(([parentId, siblings]) => ({
          parentId,
          siblings: siblings.map((s) => ({ id: s.id, position: s.position }))
        }))
      );

      // Assign positions based on sorted order within each parent group
      const children = saveData.components.map((c) => {
        const siblings = componentsByParent.get(c.parent_id) || [];
        const positionInParent = siblings.indexOf(c);
        return {
          id: c.id,
          type: c.type,
          position: positionInParent >= 0 ? positionInParent : c.position,
          config: c.config,
          parent_id: c.parent_id
        };
      });

      console.log(
        '[handleSave] Final children to save:',
        children.map((c) => ({
          id: c.id,
          type: c.type,
          parent_id: c.parent_id,
          position: c.position
        }))
      );
      console.log('[handleSave] Full children data:', JSON.stringify(children, null, 2));

      // Determine component type
      // For navbar/footer components, preserve the original type to ensure proper rendering
      // For other components, use 'composite' if multiple children, otherwise first child type
      let componentType: string;
      if (
        data.component &&
        (data.component.type === 'navbar' || data.component.type === 'footer')
      ) {
        // Preserve navbar/footer type to ensure frontend can render correctly
        componentType = data.component.type;
      } else {
        componentType = children.length > 1 ? 'composite' : children[0]?.type || 'text';
      }

      if (data.isNewComponent) {
        // Create new component
        const response = await fetch('/api/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            type: componentType,
            config: {},
            description: '',
            children: children
          })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Failed to create component');
        }

        const result = (await response.json()) as { componentId: number };
        toastStore.success('Component created successfully!');

        // Redirect to the edit page with the new component ID
        await goto(`/admin/builder/component/${result.componentId}`);
        await invalidateAll();
      } else {
        // Update existing component
        const response = await fetch(`/api/components/${data.component!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            type: componentType,
            children: children
          })
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || 'Failed to save component');
        }

        toastStore.success('Component saved successfully!');
        await invalidateAll();
      }
    } catch (error) {
      console.error('Failed to save component:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to save component');
      throw error;
    }
  }

  async function handlePublish(_saveData: SaveData): Promise<void> {
    // For components, publishing is handled by the save operation
    // The AdvancedBuilder already calls onSave before onPublish for existing components
    // So we just need to show a success message here
    toastStore.info('Component published!');
  }

  function handleExit(): void {
    goto('/admin/components');
  }

  // Convert component to page-compatible format for AdvancedBuilder
  const pageFormatted = data.component
    ? {
        id: String(data.component.id),
        site_id: data.component.site_id,
        title: data.component.name,
        slug: `/component-${data.component.id}`,
        status: 'published' as const,
        created_at: new Date(data.component.created_at).getTime(),
        updated_at: new Date(data.component.updated_at).getTime()
      }
    : null;
</script>

<svelte:head>
  <title
    >{data.isNewComponent ? 'New Component' : `Edit ${data.component?.name || 'Component'}`} - Builder</title
  >
</svelte:head>

<AdvancedBuilder
  mode="component"
  page={pageFormatted}
  initialComponents={parsedComponents}
  revisions={data.revisions}
  currentRevisionId={data.currentRevisionId}
  currentRevisionIsPublished={data.currentRevisionIsPublished}
  colorThemes={data.colorThemes}
  components={data.customComponents}
  currentComponentId={data.component?.id || null}
  userName={data.userName}
  user={data.currentUser}
  siteContext={$pageStore.data.siteContext}
  onSave={handleSave}
  onPublish={handlePublish}
  onExit={handleExit}
/>
