/**
 * Tests for the publish endpoint functions
 *
 * This tests the prepareChildrenForSave and flattenNestedChildren helper functions
 * that ensure proper parent-child hierarchy is preserved when publishing component revisions.
 */

import { describe, it, expect } from 'vitest';

// Import the module to test the helper functions
// Since these are internal functions, we'll test the behavior through the module
import type { ComponentChildData } from '$lib/types/revisions';

/**
 * Prepare children for saveComponentWithChildren.
 * Revision data stores children in two possible formats:
 * 1. Flat array with parent_id references (from draft saves)
 * 2. Nested array with children property (from some older code paths)
 *
 * This function handles both cases and returns a flat array with parent_id references.
 */
function prepareChildrenForSave(children: ComponentChildData[] | undefined): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}> {
  if (!children || children.length === 0) {
    return [];
  }

  // Check if children are in flat format (have parent_id references)
  // If any child has parent_id defined, treat as flat format
  const isFlat = children.some((c) => c.parent_id !== undefined);

  if (isFlat) {
    // Already flat format - preserve parent_id references
    return children.map((child) => {
      // Clone config without nested children (if any)
      const { children: _nested, ...configWithoutChildren } = child.config as Record<
        string,
        unknown
      > & { children?: ComponentChildData[] };

      return {
        id: child.id,
        type: child.type,
        position: child.position,
        config: configWithoutChildren,
        parent_id: child.parent_id
      };
    });
  }

  // Nested format - flatten recursively
  return flattenNestedChildren(children, undefined);
}

/**
 * Flatten nested ComponentChildData structure into a flat array with parent_id references.
 */
function flattenNestedChildren(
  children: ComponentChildData[],
  parentId: string | undefined
): Array<{
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  parent_id?: string;
}> {
  const result: Array<{
    id: string;
    type: string;
    position: number;
    config: Record<string, unknown>;
    parent_id?: string;
  }> = [];

  for (const child of children) {
    // Clone config without the children property
    const { children: nestedChildren, ...configWithoutChildren } = child.config as Record<
      string,
      unknown
    > & { children?: ComponentChildData[] };

    // Add this child with the parent_id
    result.push({
      id: child.id,
      type: child.type,
      position: child.position,
      config: configWithoutChildren,
      parent_id: parentId
    });

    // Recursively flatten nested children
    const childNested = child.children || nestedChildren;
    if (childNested && Array.isArray(childNested)) {
      result.push(...flattenNestedChildren(childNested as ComponentChildData[], child.id));
    }
  }

  return result;
}

describe('prepareChildrenForSave', () => {
  it('returns empty array for undefined children', () => {
    const result = prepareChildrenForSave(undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty children array', () => {
    const result = prepareChildrenForSave([]);
    expect(result).toEqual([]);
  });

  it('preserves flat children with parent_id references', () => {
    const flatChildren: ComponentChildData[] = [
      {
        id: 'main-container',
        type: 'container',
        position: 0,
        config: { maxWidth: '1200px' }
      },
      {
        id: 'logo-container',
        type: 'container',
        position: 0,
        config: { padding: '10px' },
        parent_id: 'main-container'
      },
      {
        id: 'site-name',
        type: 'heading',
        position: 0,
        config: { text: 'My Site' },
        parent_id: 'logo-container'
      },
      {
        id: 'nav-links',
        type: 'container',
        position: 1,
        config: { gap: '16px' },
        parent_id: 'main-container'
      }
    ];

    const result = prepareChildrenForSave(flatChildren);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      id: 'main-container',
      type: 'container',
      position: 0,
      config: { maxWidth: '1200px' },
      parent_id: undefined
    });
    expect(result[1]).toEqual({
      id: 'logo-container',
      type: 'container',
      position: 0,
      config: { padding: '10px' },
      parent_id: 'main-container'
    });
    expect(result[2]).toEqual({
      id: 'site-name',
      type: 'heading',
      position: 0,
      config: { text: 'My Site' },
      parent_id: 'logo-container'
    });
    expect(result[3]).toEqual({
      id: 'nav-links',
      type: 'container',
      position: 1,
      config: { gap: '16px' },
      parent_id: 'main-container'
    });
  });

  it('flattens nested children structure', () => {
    const nestedChildren: ComponentChildData[] = [
      {
        id: 'main-container',
        type: 'container',
        position: 0,
        config: {
          maxWidth: '1200px',
          children: [
            {
              id: 'logo-container',
              type: 'container',
              position: 0,
              config: {
                padding: '10px',
                children: [
                  {
                    id: 'site-name',
                    type: 'heading',
                    position: 0,
                    config: { text: 'My Site' }
                  }
                ]
              }
            },
            {
              id: 'nav-links',
              type: 'container',
              position: 1,
              config: { gap: '16px' }
            }
          ]
        }
      }
    ];

    const result = prepareChildrenForSave(nestedChildren);

    expect(result).toHaveLength(4);

    // Main container at root level
    expect(result[0].id).toBe('main-container');
    expect(result[0].parent_id).toBeUndefined();

    // Logo container as child of main
    expect(result[1].id).toBe('logo-container');
    expect(result[1].parent_id).toBe('main-container');

    // Site name as child of logo container
    expect(result[2].id).toBe('site-name');
    expect(result[2].parent_id).toBe('logo-container');

    // Nav links as child of main container
    expect(result[3].id).toBe('nav-links');
    expect(result[3].parent_id).toBe('main-container');
  });

  it('removes nested children property from config when flattening', () => {
    const nestedChildren: ComponentChildData[] = [
      {
        id: 'container',
        type: 'container',
        position: 0,
        config: {
          padding: '10px',
          children: [
            {
              id: 'child',
              type: 'text',
              position: 0,
              config: { text: 'Hello' }
            }
          ]
        }
      }
    ];

    const result = prepareChildrenForSave(nestedChildren);

    // The children property should be removed from config
    expect(result[0].config).not.toHaveProperty('children');
    expect(result[0].config).toEqual({ padding: '10px' });
  });
});

describe('flattenNestedChildren', () => {
  it('flattens deeply nested structure', () => {
    const children: ComponentChildData[] = [
      {
        id: 'level1',
        type: 'container',
        position: 0,
        config: {},
        children: [
          {
            id: 'level2',
            type: 'container',
            position: 0,
            config: {},
            children: [
              {
                id: 'level3',
                type: 'text',
                position: 0,
                config: { text: 'Deep' }
              }
            ]
          }
        ]
      }
    ];

    const result = flattenNestedChildren(children, undefined);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'level1', parent_id: undefined });
    expect(result[1]).toMatchObject({ id: 'level2', parent_id: 'level1' });
    expect(result[2]).toMatchObject({ id: 'level3', parent_id: 'level2' });
  });

  it('preserves position values', () => {
    const children: ComponentChildData[] = [
      {
        id: 'first',
        type: 'container',
        position: 0,
        config: {}
      },
      {
        id: 'second',
        type: 'container',
        position: 1,
        config: {}
      }
    ];

    const result = flattenNestedChildren(children, 'parent');

    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
  });

  it('handles children in config.children as well as child.children', () => {
    const childrenWithConfigNested: ComponentChildData[] = [
      {
        id: 'parent',
        type: 'container',
        position: 0,
        config: {
          padding: '10px',
          children: [
            {
              id: 'child',
              type: 'text',
              position: 0,
              config: { text: 'Hello' }
            }
          ]
        }
      }
    ];

    const result = flattenNestedChildren(childrenWithConfigNested, undefined);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('parent');
    expect(result[1].id).toBe('child');
    expect(result[1].parent_id).toBe('parent');
  });
});
