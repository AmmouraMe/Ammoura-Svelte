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
  // Using reactive statement to handle data updates when navigating to the same route
  $: parsedComponents = data.widgets.map((w) => ({
    id: w.id,
    page_id: data.component ? String(data.component.id) : 'new',
    type: w.type as PageComponent['type'],
    position: w.position,
    config: w.config,
    created_at: new Date(w.created_at).getTime(),
    updated_at: new Date(w.updated_at).getTime(),
    parent_id: w.parent_id // Preserve hierarchy for nested components
  })) as PageComponent[];

  interface SaveData {
    id?: string;
    title: string;
    slug: string;
    components: PageComponent[];
    pageProperties?: {
      backgroundColor?: string;
      backgroundImage?: string;
      minHeight?: string;
      borderColor?: string;
      borderWidth?: string;
      borderStyle?: string;
      borderRadius?: string;
      padding?: string;
      boxShadow?: string;
    };
  }

  async function handleSave(
    saveData: SaveData,
    options?: { silent?: boolean; message?: string }
  ): Promise<{ revisionId?: string } | void> {
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
      // For navbar/footer/hero/features components, preserve the original type to ensure proper rendering
      // and reset functionality - these built-in types have container-based architecture
      // For other components, use 'composite' if multiple children, otherwise first child type
      // Also check component name as fallback (in case type was incorrectly saved as 'composite')
      let componentType: string;
      const componentName = data.component?.name?.toLowerCase() || '';
      const isBuiltInByName =
        componentName === 'navbar' ||
        componentName === 'navigation bar' ||
        componentName === 'footer' ||
        componentName === 'hero' ||
        componentName === 'features';

      if (
        data.component &&
        (data.component.type === 'navbar' ||
          data.component.type === 'footer' ||
          data.component.type === 'hero' ||
          data.component.type === 'features' ||
          isBuiltInByName)
      ) {
        // Preserve navbar/footer/hero/features type to ensure frontend can render correctly
        // If the type was incorrectly set to 'composite', restore it based on name
        if (
          data.component.type === 'navbar' ||
          componentName === 'navbar' ||
          componentName === 'navigation bar'
        ) {
          componentType = 'navbar';
        } else if (data.component.type === 'footer' || componentName === 'footer') {
          componentType = 'footer';
        } else if (data.component.type === 'hero' || componentName === 'hero') {
          componentType = 'hero';
        } else if (data.component.type === 'features' || componentName === 'features') {
          componentType = 'features';
        } else {
          componentType = data.component.type;
        }
      } else {
        componentType = children.length > 1 ? 'composite' : children[0]?.type || 'text';
      }

      if (data.isNewComponent) {
        // Create new component
        // Build component config from pageProperties
        const componentConfig = {
          backgroundColor: saveData.pageProperties?.backgroundColor || 'transparent',
          backgroundImage: saveData.pageProperties?.backgroundImage || '',
          minHeight: saveData.pageProperties?.minHeight || '100vh',
          padding: saveData.pageProperties?.padding || '',
          borderColor: saveData.pageProperties?.borderColor || '',
          borderWidth: saveData.pageProperties?.borderWidth || '0',
          borderStyle: saveData.pageProperties?.borderStyle || 'solid',
          borderRadius: saveData.pageProperties?.borderRadius || '0',
          boxShadow: saveData.pageProperties?.boxShadow || ''
        };

        const response = await fetch('/api/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            type: componentType,
            config: componentConfig,
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
        // Build component config from pageProperties
        // Only include properties that were explicitly set (non-default values)
        // This prevents overwriting existing component config for built-in components like navbar
        const componentConfig: Record<string, unknown> = {};

        // Only add properties that have meaningful values (not defaults)
        if (
          saveData.pageProperties?.backgroundColor &&
          saveData.pageProperties.backgroundColor !== 'transparent'
        ) {
          componentConfig.backgroundColor = saveData.pageProperties.backgroundColor;
        }
        if (saveData.pageProperties?.backgroundImage) {
          componentConfig.backgroundImage = saveData.pageProperties.backgroundImage;
        }
        if (saveData.pageProperties?.minHeight && saveData.pageProperties.minHeight !== '100vh') {
          componentConfig.minHeight = saveData.pageProperties.minHeight;
        }
        if (saveData.pageProperties?.padding) {
          componentConfig.padding = saveData.pageProperties.padding;
        }
        if (saveData.pageProperties?.borderColor) {
          componentConfig.borderColor = saveData.pageProperties.borderColor;
        }
        if (saveData.pageProperties?.borderWidth && saveData.pageProperties.borderWidth !== '0') {
          componentConfig.borderWidth = saveData.pageProperties.borderWidth;
        }
        if (
          saveData.pageProperties?.borderStyle &&
          saveData.pageProperties.borderStyle !== 'solid'
        ) {
          componentConfig.borderStyle = saveData.pageProperties.borderStyle;
        }
        if (saveData.pageProperties?.borderRadius && saveData.pageProperties.borderRadius !== '0') {
          componentConfig.borderRadius = saveData.pageProperties.borderRadius;
        }
        if (saveData.pageProperties?.boxShadow) {
          componentConfig.boxShadow = saveData.pageProperties.boxShadow;
        }

        // Create a new revision to track this change (draft save)
        // IMPORTANT: We only create a revision here, NOT updating the live component.
        // The live component is only updated when the user publishes via handlePublish.
        // This ensures draft changes don't leak to the front-end until published.
        const revisionResponse = await fetch(`/api/components/${data.component!.id}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveData.title,
            description: data.component!.description || '',
            type: componentType,
            config: {
              ...componentConfig,
              children: children
            },
            message: options?.message || 'Draft save'
          })
        });

        let revisionId: string | undefined;
        if (!revisionResponse.ok) {
          const errorData = (await revisionResponse.json()) as { error?: string };
          throw new Error(errorData.error || 'Failed to save draft');
        } else {
          // Extract the revision ID from the response to return to the builder
          const revisionData = (await revisionResponse.json()) as { id: string };
          revisionId = revisionData.id;
        }

        // Only show toast if not called silently (e.g., from handlePublish)
        if (!options?.silent) {
          toastStore.success('Draft saved successfully!');
        }

        // Don't call invalidateAll() for draft saves - the local state is already correct
        // and calling it would cause the component name to revert to the DB value
        // (since draft names are stored in the revision, not the component record)

        // Return the new revision ID so the builder can update its state
        return { revisionId };
      }
    } catch (error) {
      console.error('Failed to save component:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to save component');
      throw error;
    }
  }

  async function handlePublish(
    saveData: SaveData & {
      currentRevisionId?: string | null;
      hasUnsavedChanges?: boolean;
    }
  ): Promise<void> {
    if (data.isNewComponent) {
      // For new components, we need to save first to create the component
      await handleSave(saveData, { silent: true });
      toastStore.success('Component created and published!');
      return;
    }

    try {
      const hasChanges = saveData.hasUnsavedChanges !== false;
      const currentRevisionId = saveData.currentRevisionId;

      if (!hasChanges && currentRevisionId) {
        // No unsaved changes - just publish the existing revision directly
        const publishResponse = await fetch(
          `/api/components/${data.component!.id}/revisions/${currentRevisionId}/publish`,
          { method: 'POST' }
        );

        if (!publishResponse.ok) {
          throw new Error('Failed to publish revision');
        }
      } else {
        // Has unsaved changes - save first (silently), then publish
        const saveResult = await handleSave(saveData, {
          silent: true,
          message: 'Published revision'
        });
        const revisionId = saveResult?.revisionId;

        if (revisionId) {
          // Publish the newly created revision
          const publishResponse = await fetch(
            `/api/components/${data.component!.id}/revisions/${revisionId}/publish`,
            { method: 'POST' }
          );

          if (!publishResponse.ok) {
            throw new Error('Failed to publish revision');
          }
        }
      }

      toastStore.success('Component published!');
      await invalidateAll();
    } catch (error) {
      console.error('Failed to publish component:', error);
      toastStore.error(error instanceof Error ? error.message : 'Failed to publish component');
      throw error;
    }
  }

  function handleExit(): void {
    goto('/admin/components');
  }

  // Convert component to page-compatible format for AdvancedBuilder
  // Use reactive statement so it updates when data.component changes after invalidateAll()
  $: pageFormatted = data.component
    ? {
        id: String(data.component.id),
        site_id: data.component.site_id,
        title: data.component.name,
        slug: `/component-${data.component.id}`,
        status: 'published' as const,
        is_builtin: false,
        created_at: new Date(data.component.created_at).getTime(),
        updated_at: new Date(data.component.updated_at).getTime()
      }
    : null;

  // Extract page properties from component config for root-level styling
  // This ensures the component's backgroundColor (set to 'transparent' for built-in components)
  // is properly displayed in the builder's page properties panel
  $: initialPageProperties = data.component?.config
    ? {
        backgroundColor:
          typeof data.component.config.backgroundColor === 'string'
            ? data.component.config.backgroundColor
            : undefined,
        backgroundImage:
          typeof data.component.config.backgroundImage === 'string'
            ? data.component.config.backgroundImage
            : undefined,
        minHeight:
          typeof data.component.config.minHeight === 'string'
            ? data.component.config.minHeight
            : undefined,
        padding:
          typeof data.component.config.padding === 'string'
            ? data.component.config.padding
            : undefined
      }
    : undefined;
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
  {initialPageProperties}
  revisions={data.revisions}
  currentRevisionId={data.currentRevisionId}
  currentRevisionIsPublished={data.currentRevisionIsPublished}
  colorThemes={data.colorThemes}
  components={data.customComponents}
  currentComponentId={data.component?.id || null}
  isBuiltIn={data.component?.is_global || false}
  userName={data.userName}
  user={data.currentUser}
  siteContext={$pageStore.data.siteContext}
  onSave={handleSave}
  onPublish={handlePublish}
  onExit={handleExit}
/>
