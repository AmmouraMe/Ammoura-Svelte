import type { PageComponent } from '$lib/types/pages';

/**
 * Build a component tree from a flat array of page components.
 *
 * Components in revisions are stored as a flat array with `parent_id` references.
 * Container-based components (hero, navbar, footer, features, pricing, etc.) need
 * their children nested into `config.children` for proper rendering.
 *
 * This function:
 * 1. Separates root components (no `parent_id`) from children
 * 2. Recursively nests children into their parent's `config.children`
 * 3. Returns only root components with children injected
 *
 * @param components - Flat array of page components (may include parent_id references)
 * @returns Root components with children nested in config.children, sorted by position
 */
export function buildComponentTree(components: PageComponent[]): PageComponent[] {
  if (!components || components.length === 0) {
    return [];
  }

  // Sort by position for consistent ordering
  const sorted = [...components].sort((a, b) => a.position - b.position);

  // Separate root components from children
  const rootComponents = sorted.filter((c) => !c.parent_id);

  // Build a map of parent_id -> children for efficient lookup
  const childrenMap: Record<string, PageComponent[]> = {};
  for (const comp of sorted) {
    if (comp.parent_id) {
      if (!childrenMap[comp.parent_id]) {
        childrenMap[comp.parent_id] = [];
      }
      childrenMap[comp.parent_id].push(comp);
    }
  }

  // Recursively inject children into a component's config
  function injectChildren(comp: PageComponent): PageComponent {
    const children = childrenMap[comp.id];
    if (!children || children.length === 0) {
      return comp;
    }
    const childrenWithNested = children
      .sort((a, b) => a.position - b.position)
      .map((child) => injectChildren(child));
    return {
      ...comp,
      config: {
        ...comp.config,
        children: childrenWithNested
      }
    };
  }

  return rootComponents.map((comp) => injectChildren(comp));
}
