/**
 * Component Changes Client Utilities
 * Client-side functions for applying component changes from AI
 */

import type { PageComponent } from '$lib/types/pages';

export interface ComponentChange {
  type: 'component_changes';
  changes: {
    action: 'add' | 'remove' | 'update' | 'reorder';
    components?: PageComponent[];
    componentIds?: string[];
    targetId?: string; // ID of the component to insert after (for nested additions)
    parentId?: string; // Parent container ID for nested widget additions
    position?: number;
  };
}

// Deprecated: Use ComponentChange instead
export type WidgetChange = ComponentChange;

/**
 * Apply component changes to component array
 */
export function applyComponentChanges(
  currentComponents: PageComponent[],
  change: ComponentChange
): PageComponent[] {
  const { action, components, componentIds, position, parentId, targetId } = change.changes;

  switch (action) {
    case 'add':
      // If parentId is specified, add to parent's children instead of top-level
      if (parentId) {
        return handleAddToParent(currentComponents, components || [], parentId, targetId);
      }
      return handleAddComponents(currentComponents, components || [], position);
    case 'remove':
      return handleRemoveComponents(currentComponents, componentIds || []);
    case 'update':
      return handleUpdateComponents(currentComponents, components || []);
    case 'reorder':
      return handleReorderComponents(currentComponents, components || []);
    default:
      return currentComponents;
  }
}

// Deprecated: Use applyComponentChanges instead
export const applyWidgetChanges = applyComponentChanges;

/**
 * Generate a unique temporary ID for new components
 */
function generateComponentId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if components are in flat structure (using parent_id references)
 * vs hierarchical structure (using config.children arrays)
 */
function isFlatStructure(components: PageComponent[]): boolean {
  // If any component has parent_id set, it's a flat structure
  return components.some((c) => c.parent_id !== undefined && c.parent_id !== null);
}

/**
 * Add new components as children of a parent container
 * This handles nested widget placement (e.g., adding a theme toggle to a navbar container)
 *
 * Supports two structures:
 * 1. FLAT: Components in a flat array with parent_id references (used by builder)
 * 2. HIERARCHICAL: Components with config.children arrays (used in some contexts)
 */
function handleAddToParent(
  current: PageComponent[],
  newComponents: PageComponent[],
  parentId: string,
  targetId?: string
): PageComponent[] {
  const now = Date.now();
  const pageId = current[0]?.page_id || '';

  // Check if we're working with a flat or hierarchical structure
  const isFlat = isFlatStructure(current);

  // Process new components with required fields
  const processedComponents = newComponents.map((component) => {
    const id = component.id || generateComponentId();

    return {
      ...component,
      id,
      page_id: component.page_id || pageId,
      parent_id: parentId,
      created_at: component.created_at || now,
      updated_at: component.updated_at || now,
      position: component.position ?? 0
    } as PageComponent;
  });

  if (isFlat) {
    // FLAT STRUCTURE: Add new components to the array with parent_id set
    // Find siblings (other components with same parent_id)
    const siblings = current.filter((c) => c.parent_id === parentId);

    // Determine insert position
    let insertPosition = siblings.length;

    if (targetId) {
      // Find target component and insert after it
      const targetComponent = siblings.find((c) => c.id === targetId);
      if (targetComponent) {
        insertPosition = targetComponent.position + 1;
      }
    }

    // Set positions for new components
    const processedWithPositions = processedComponents.map((comp, idx) => ({
      ...comp,
      position: insertPosition + idx
    }));

    // Update positions for siblings that come after the insert position
    const updatedCurrent = current.map((comp) => {
      if (comp.parent_id === parentId && comp.position >= insertPosition) {
        return {
          ...comp,
          position: comp.position + processedWithPositions.length,
          updated_at: now
        };
      }
      return comp;
    });

    // Add new components to the array
    return [...updatedCurrent, ...processedWithPositions];
  }

  // HIERARCHICAL STRUCTURE: Add to config.children of parent
  const updateComponentChildren = (components: PageComponent[]): PageComponent[] => {
    return components.map((comp) => {
      if (comp.id === parentId) {
        // Found the parent - add new components to its children array
        const existingChildren = (comp.config?.children as PageComponent[]) || [];

        let insertPosition = existingChildren.length;

        // If targetId is specified, find position after that widget
        if (targetId) {
          const targetIndex = existingChildren.findIndex((c) => c.id === targetId);
          if (targetIndex >= 0) {
            insertPosition = targetIndex + 1;
          }
        }

        // Insert new components at the calculated position
        const updatedChildren = [...existingChildren];
        updatedChildren.splice(insertPosition, 0, ...processedComponents);

        // Reindex positions
        const reindexedChildren = updatedChildren.map((child, idx) => ({
          ...child,
          position: idx
        }));

        return {
          ...comp,
          config: {
            ...comp.config,
            children: reindexedChildren
          },
          updated_at: now
        };
      }

      // Recursively check children for nested containers
      if (comp.config?.children && Array.isArray(comp.config.children)) {
        const updatedChildren = updateComponentChildren(comp.config.children as PageComponent[]);
        if (updatedChildren !== comp.config.children) {
          return {
            ...comp,
            config: {
              ...comp.config,
              children: updatedChildren
            },
            updated_at: now
          };
        }
      }

      return comp;
    });
  };

  return updateComponentChildren(current);
}

/**
 * Add new components to the array
 */
function handleAddComponents(
  current: PageComponent[],
  newComponents: PageComponent[],
  position?: number
): PageComponent[] {
  const result = [...current];
  const now = Date.now();

  // Ensure new components have all required fields
  const processedComponents = newComponents.map((component) => {
    // Generate ID if not present or if it doesn't start with 'temp-'
    const id =
      component.id && (component.id.startsWith('temp-') || component.id.match(/^[0-9]+$/))
        ? component.id
        : generateComponentId();

    // Get page_id from existing components or use empty string (will be set on save)
    const pageId = component.page_id || current[0]?.page_id || '';

    return {
      ...component,
      id,
      page_id: pageId,
      created_at: component.created_at || now,
      updated_at: component.updated_at || now,
      position: component.position ?? 0 // Will be reindexed below
    } as PageComponent;
  });

  if (position !== undefined && position >= 0 && position <= result.length) {
    // Insert at specific position
    result.splice(position, 0, ...processedComponents);
  } else {
    // Add at the end
    result.push(...processedComponents);
  }

  // Reindex positions
  return result.map((c, idx) => ({ ...c, position: idx }));
}

/**
 * Remove components by ID
 */
function handleRemoveComponents(current: PageComponent[], componentIds: string[]): PageComponent[] {
  const result = current.filter((c) => !componentIds.includes(c.id));
  // Reindex positions
  return result.map((c, idx) => ({ ...c, position: idx }));
}

/**
 * Update existing components
 */
function handleUpdateComponents(
  current: PageComponent[],
  updates: PageComponent[]
): PageComponent[] {
  const updateMap = new Map(updates.map((c) => [c.id, c]));

  return current.map((c) => {
    const update = updateMap.get(c.id);
    if (update) {
      return {
        ...c,
        ...update,
        config: { ...c.config, ...update.config }
      };
    }
    return c;
  });
}

/**
 * Reorder components based on provided array
 */
function handleReorderComponents(
  current: PageComponent[],
  orderedComponents: PageComponent[]
): PageComponent[] {
  // Create a map of components by ID for quick lookup
  const componentMap = new Map(current.map((c) => [c.id, c]));

  // Build new array with provided order
  const result = orderedComponents
    .map((c) => componentMap.get(c.id))
    .filter((c): c is PageComponent => c !== undefined);

  // Reindex positions
  return result.map((c, idx) => ({ ...c, position: idx }));
}
