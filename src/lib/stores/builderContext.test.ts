import { describe, it, expect, beforeEach } from 'vitest';
import { builderContextStore, type BuilderContextState } from './builderContext';
import type { PageComponent } from '$lib/types/pages';

describe('builderContextStore', () => {
  beforeEach(() => {
    builderContextStore.reset();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });
      unsubscribe();

      expect(state).toEqual({
        mode: null,
        entityId: null,
        entityName: '',
        slug: '',
        components: [],
        isActive: false,
        layoutId: null
      });
    });
  });

  describe('activate', () => {
    const mockComponents: PageComponent[] = [
      {
        id: 'comp-1',
        page_id: 'page-1',
        type: 'hero',
        position: 0,
        config: { title: 'Test' },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    it('should activate with page mode', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.activate('page', 'page-123', 'Test Page', '/test', mockComponents);

      expect(state?.mode).toBe('page');
      expect(state?.entityId).toBe('page-123');
      expect(state?.entityName).toBe('Test Page');
      expect(state?.slug).toBe('/test');
      expect(state?.isActive).toBe(true);
      expect(state?.layoutId).toBeNull();
      expect(state?.components).toHaveLength(1);

      unsubscribe();
    });

    it('should activate with layout mode and layoutId', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.activate('layout', 'layout-1', 'Main Layout', 'main', [], 5);

      expect(state?.mode).toBe('layout');
      expect(state?.layoutId).toBe(5);

      unsubscribe();
    });

    it('should activate with component mode', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.activate('component', 'comp-1', 'Hero Component', 'hero', []);

      expect(state?.mode).toBe('component');
      expect(state?.entityId).toBe('comp-1');

      unsubscribe();
    });

    it('should activate with primitive mode', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.activate('primitive', 'prim-1', 'Button Primitive', 'button', []);

      expect(state?.mode).toBe('primitive');

      unsubscribe();
    });

    it('should deep clone components to avoid mutation', () => {
      const originalComponents = [
        {
          id: 'comp-1',
          page_id: 'page-1',
          type: 'text',
          position: 0,
          config: { text: 'Original' },
          created_at: Date.now(),
          updated_at: Date.now()
        } as PageComponent
      ];

      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.activate('page', '1', 'Test', '/test', originalComponents);

      // Mutate the original
      (originalComponents[0].config as Record<string, unknown>).text = 'Mutated';

      // State should not be affected
      expect(state?.components[0].config.text).toBe('Original');

      unsubscribe();
    });
  });

  describe('updateState', () => {
    const mockComponents: PageComponent[] = [
      {
        id: 'comp-1',
        page_id: 'page-1',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    beforeEach(() => {
      builderContextStore.activate('page', 'page-1', 'Initial', '/initial', mockComponents);
    });

    it('should update entityName', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateState({ entityName: 'Updated Name' });

      expect(state?.entityName).toBe('Updated Name');
      expect(state?.slug).toBe('/initial'); // Unchanged

      unsubscribe();
    });

    it('should update slug', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateState({ slug: '/updated' });

      expect(state?.slug).toBe('/updated');

      unsubscribe();
    });

    it('should update components with deep clone', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      const newComponents: PageComponent[] = [
        {
          id: 'new-1',
          page_id: 'page-1',
          type: 'text',
          position: 0,
          config: { text: 'New' },
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      builderContextStore.updateState({ components: newComponents });

      expect(state?.components).toHaveLength(1);
      expect(state?.components[0].id).toBe('new-1');

      unsubscribe();
    });

    it('should preserve existing components when not provided', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateState({ entityName: 'Updated' });

      expect(state?.components).toHaveLength(1);
      expect(state?.components[0].id).toBe('comp-1');

      unsubscribe();
    });

    it('should update multiple fields at once', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateState({
        entityName: 'Multi Update',
        slug: '/multi',
        layoutId: 10
      });

      expect(state?.entityName).toBe('Multi Update');
      expect(state?.slug).toBe('/multi');
      expect(state?.layoutId).toBe(10);

      unsubscribe();
    });
  });

  describe('updateComponents', () => {
    beforeEach(() => {
      builderContextStore.activate('page', 'page-1', 'Test', '/test', []);
    });

    it('should update components', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      const newComponents: PageComponent[] = [
        {
          id: 'comp-1',
          page_id: 'page-1',
          type: 'hero',
          position: 0,
          config: {},
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      builderContextStore.updateComponents(newComponents);

      expect(state?.components).toHaveLength(1);

      unsubscribe();
    });

    it('should deep clone components', () => {
      const components: PageComponent[] = [
        {
          id: 'comp-1',
          page_id: 'page-1',
          type: 'text',
          position: 0,
          config: { text: 'Original' },
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateComponents(components);

      // Mutate original
      components[0].config.text = 'Mutated';

      // State should be unaffected
      expect(state?.components[0].config.text).toBe('Original');

      unsubscribe();
    });
  });

  describe('updateEntityName', () => {
    beforeEach(() => {
      builderContextStore.activate('page', 'page-1', 'Initial', '/test', []);
    });

    it('should update entity name only', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateEntityName('New Name');

      expect(state?.entityName).toBe('New Name');
      expect(state?.slug).toBe('/test'); // Unchanged

      unsubscribe();
    });
  });

  describe('updateSlug', () => {
    beforeEach(() => {
      builderContextStore.activate('page', 'page-1', 'Test', '/initial', []);
    });

    it('should update slug only', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.updateSlug('/new-slug');

      expect(state?.slug).toBe('/new-slug');
      expect(state?.entityName).toBe('Test'); // Unchanged

      unsubscribe();
    });
  });

  describe('deactivate', () => {
    beforeEach(() => {
      builderContextStore.activate('page', 'page-1', 'Test', '/test', [
        {
          id: 'comp-1',
          page_id: 'page-1',
          type: 'hero',
          position: 0,
          config: {},
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]);
    });

    it('should reset to initial state', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.deactivate();

      expect(state?.mode).toBeNull();
      expect(state?.entityId).toBeNull();
      expect(state?.entityName).toBe('');
      expect(state?.slug).toBe('');
      expect(state?.components).toHaveLength(0);
      expect(state?.isActive).toBe(false);
      expect(state?.layoutId).toBeNull();

      unsubscribe();
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      builderContextStore.activate('layout', 'layout-1', 'Layout', '/layout', [], 5);
    });

    it('should reset to initial state', () => {
      let state: BuilderContextState | undefined;
      const unsubscribe = builderContextStore.subscribe((s) => {
        state = s;
      });

      builderContextStore.reset();

      expect(state).toEqual({
        mode: null,
        entityId: null,
        entityName: '',
        slug: '',
        components: [],
        isActive: false,
        layoutId: null
      });

      unsubscribe();
    });
  });

  describe('subscribe', () => {
    it('should notify on state changes', () => {
      const updates: BuilderContextState[] = [];
      const unsubscribe = builderContextStore.subscribe((s) => {
        updates.push({ ...s });
      });

      builderContextStore.activate('page', '1', 'Test', '/test', []);
      builderContextStore.updateEntityName('Updated');
      builderContextStore.deactivate();

      expect(updates.length).toBeGreaterThan(1);
      expect(updates[updates.length - 1].isActive).toBe(false);

      unsubscribe();
    });
  });
});
