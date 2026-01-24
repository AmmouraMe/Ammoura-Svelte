import { writable } from 'svelte/store';
import type { PageComponent } from '$lib/types/pages';

/**
 * Builder Context Store
 * Tracks the current state of the advanced builder for AI awareness
 */

export type BuilderMode = 'page' | 'layout' | 'component' | 'primitive';

export interface BuilderContextState {
  mode: BuilderMode | null;
  entityId: string | null;
  entityName: string;
  slug: string;
  components: PageComponent[];
  isActive: boolean;
  layoutId: number | null;
}

const initialState: BuilderContextState = {
  mode: null,
  entityId: null,
  entityName: '',
  slug: '',
  components: [],
  isActive: false,
  layoutId: null
};

function createBuilderContextStore() {
  const { subscribe, set, update } = writable<BuilderContextState>(initialState);

  return {
    subscribe,

    /**
     * Activate the builder with current context
     */
    activate: (
      mode: BuilderMode,
      entityId: string | null,
      entityName: string,
      slug: string,
      components: PageComponent[],
      layoutId: number | null = null
    ) => {
      set({
        mode,
        entityId,
        entityName,
        slug,
        components: JSON.parse(JSON.stringify(components)), // Deep clone
        isActive: true,
        layoutId
      });
    },

    /**
     * Update the current builder state
     */
    updateState: (updates: Partial<Omit<BuilderContextState, 'mode' | 'isActive'>>) => {
      update((state) => ({
        ...state,
        ...updates,
        // Deep clone components if provided
        components: updates.components
          ? JSON.parse(JSON.stringify(updates.components))
          : state.components
      }));
    },

    /**
     * Update components only
     */
    updateComponents: (components: PageComponent[]) => {
      update((state) => ({
        ...state,
        components: JSON.parse(JSON.stringify(components))
      }));
    },

    /**
     * Update entity name (title)
     */
    updateEntityName: (entityName: string) => {
      update((state) => ({
        ...state,
        entityName
      }));
    },

    /**
     * Update slug
     */
    updateSlug: (slug: string) => {
      update((state) => ({
        ...state,
        slug
      }));
    },

    /**
     * Deactivate the builder
     */
    deactivate: () => {
      set(initialState);
    },

    /**
     * Reset to initial state
     */
    reset: () => {
      set(initialState);
    }
  };
}

export const builderContextStore = createBuilderContextStore();
