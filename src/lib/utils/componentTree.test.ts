import { describe, it, expect } from 'vitest';
import { buildComponentTree } from './componentTree';
import type { PageComponent } from '$lib/types/pages';

// Helper to create a minimal PageComponent
function makeComponent(
  overrides: Partial<PageComponent> & { id: string; type: string }
): PageComponent {
  return {
    page_id: 'page-1',
    config: {},
    position: 0,
    created_at: 0,
    updated_at: 0,
    ...overrides
  } as PageComponent;
}

describe('buildComponentTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildComponentTree([])).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildComponentTree(null as any)).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildComponentTree(undefined as any)).toEqual([]);
  });

  it('returns flat components unchanged when none have parent_id', () => {
    const components = [
      makeComponent({ id: 'a', type: 'text', position: 1 }),
      makeComponent({ id: 'b', type: 'image', position: 2 })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('sorts root components by position', () => {
    const components = [
      makeComponent({ id: 'b', type: 'text', position: 2 }),
      makeComponent({ id: 'a', type: 'text', position: 1 }),
      makeComponent({ id: 'c', type: 'text', position: 3 })
    ];

    const result = buildComponentTree(components);
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('nests children into parent config.children', () => {
    const components = [
      makeComponent({ id: 'hero-1', type: 'hero', position: 0 }),
      makeComponent({
        id: 'child-1',
        type: 'text',
        position: 0,
        parent_id: 'hero-1',
        config: { text: 'Hello' }
      }),
      makeComponent({
        id: 'child-2',
        type: 'button',
        position: 1,
        parent_id: 'hero-1',
        config: { label: 'Click' }
      })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hero-1');
    expect(result[0].config.children).toHaveLength(2);

    const children = result[0].config.children as PageComponent[];
    expect(children[0].id).toBe('child-1');
    expect(children[0].config.text).toBe('Hello');
    expect(children[1].id).toBe('child-2');
    expect(children[1].config.label).toBe('Click');
  });

  it('filters children from root-level results', () => {
    const components = [
      makeComponent({ id: 'hero-1', type: 'hero', position: 0 }),
      makeComponent({ id: 'child-1', type: 'text', position: 0, parent_id: 'hero-1' }),
      makeComponent({ id: 'text-1', type: 'text', position: 1 })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('hero-1');
    expect(result[1].id).toBe('text-1');
  });

  it('sorts children by position within parent', () => {
    const components = [
      makeComponent({ id: 'container-1', type: 'container', position: 0 }),
      makeComponent({ id: 'c', type: 'text', position: 2, parent_id: 'container-1' }),
      makeComponent({ id: 'a', type: 'text', position: 0, parent_id: 'container-1' }),
      makeComponent({ id: 'b', type: 'text', position: 1, parent_id: 'container-1' })
    ];

    const result = buildComponentTree(components);
    const children = result[0].config.children as PageComponent[];
    expect(children.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles deeply nested children (grandchildren)', () => {
    const components = [
      makeComponent({ id: 'hero-1', type: 'hero', position: 0 }),
      makeComponent({ id: 'container-1', type: 'container', position: 0, parent_id: 'hero-1' }),
      makeComponent({
        id: 'text-1',
        type: 'text',
        position: 0,
        parent_id: 'container-1',
        config: { text: 'Deep child' }
      })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hero-1');

    const heroChildren = result[0].config.children as PageComponent[];
    expect(heroChildren).toHaveLength(1);
    expect(heroChildren[0].id).toBe('container-1');

    const containerChildren = heroChildren[0].config.children as PageComponent[];
    expect(containerChildren).toHaveLength(1);
    expect(containerChildren[0].id).toBe('text-1');
    expect(containerChildren[0].config.text).toBe('Deep child');
  });

  it('preserves existing config properties when adding children', () => {
    const components = [
      makeComponent({
        id: 'hero-1',
        type: 'hero',
        position: 0,
        config: { backgroundImage: '/bg.jpg', overlay: true, overlayOpacity: 50 }
      }),
      makeComponent({ id: 'child-1', type: 'text', position: 0, parent_id: 'hero-1' })
    ];

    const result = buildComponentTree(components);
    const heroConfig = result[0].config;
    expect(heroConfig.backgroundImage).toBe('/bg.jpg');
    expect(heroConfig.overlay).toBe(true);
    expect(heroConfig.overlayOpacity).toBe(50);
    expect(heroConfig.children).toHaveLength(1);
  });

  it('does not mutate original components array', () => {
    const components = [
      makeComponent({ id: 'hero-1', type: 'hero', position: 0 }),
      makeComponent({ id: 'child-1', type: 'text', position: 0, parent_id: 'hero-1' })
    ];

    const originalLength = components.length;
    const originalHeroConfig = { ...components[0].config };

    buildComponentTree(components);

    expect(components).toHaveLength(originalLength);
    expect(components[0].config).toEqual(originalHeroConfig);
  });

  it('handles multiple parents with different children', () => {
    const components = [
      makeComponent({ id: 'hero-1', type: 'hero', position: 0 }),
      makeComponent({ id: 'features-1', type: 'features', position: 1 }),
      makeComponent({
        id: 'hero-child',
        type: 'text',
        position: 0,
        parent_id: 'hero-1'
      }),
      makeComponent({
        id: 'features-child',
        type: 'icon',
        position: 0,
        parent_id: 'features-1'
      })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(2);
    expect((result[0].config.children as PageComponent[])[0].id).toBe('hero-child');
    expect((result[1].config.children as PageComponent[])[0].id).toBe('features-child');
  });

  it('handles components with no matching parent gracefully', () => {
    // Orphan children whose parent doesn't exist in the array
    // They should be excluded from root (they have parent_id set)
    const components = [
      makeComponent({ id: 'text-1', type: 'text', position: 0 }),
      makeComponent({ id: 'orphan', type: 'text', position: 1, parent_id: 'nonexistent' })
    ];

    const result = buildComponentTree(components);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('text-1');
  });
});
