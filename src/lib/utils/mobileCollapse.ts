/**
 * Mobile collapse rules for container components.
 *
 * A container can hide its contents behind a hamburger on mobile. This module
 * is the single source of truth for *when* that happens, so the renderer and
 * its tests cannot drift apart.
 */

/**
 * Component types that lay other components out, rather than being a single
 * item themselves. Composite components also render children.
 */
export const CONTAINER_CHILD_TYPES = new Set(['container', 'row', 'flex', 'composite']);

export function isContainerType(type: string): boolean {
  return CONTAINER_CHILD_TYPES.has(type);
}

export interface MobileCollapseConfig {
  containerMobileCollapse?: boolean;
  containerMobileCollapseLabel?: string;
  containerMobileCollapseIconColor?: string;
  containerMobileCollapseBackground?: string;
}

interface CollapsibleChild {
  type: string;
}

/**
 * A group of navigation items inside a navbar collapses on mobile by default.
 *
 * Without this, a navbar built out of containers stacks every link full-width
 * and pushes the page content off screen — which is exactly what the pre-v3
 * seeded navbar did.
 *
 * Only a group of *leaf* items qualifies. A container whose children are
 * themselves containers is a layout wrapper holding the brand as well as the
 * links, and collapsing it would hide the logo behind the hamburger too.
 */
export function autoCollapsesInNavbar(
  insideNavbar: boolean,
  children: CollapsibleChild[] = []
): boolean {
  return (
    insideNavbar &&
    children.length > 1 &&
    children.every((child) => !CONTAINER_CHILD_TYPES.has(child.type))
  );
}

/**
 * Whether this component should render a mobile collapse toggle.
 *
 * An explicit `containerMobileCollapse` always wins — `false` keeps a navbar
 * row expanded, `true` collapses any container — and only an unset value falls
 * through to the navbar default.
 */
export function shouldShowMobileCollapse(opts: {
  type: string;
  config: MobileCollapseConfig;
  insideNavbar?: boolean;
  children?: CollapsibleChild[];
}): boolean {
  const { type, config, insideNavbar = false, children = [] } = opts;
  if (!isContainerType(type)) {
    return false;
  }
  return config.containerMobileCollapse ?? autoCollapsesInNavbar(insideNavbar, children);
}

export function getMobileCollapseLabel(config: MobileCollapseConfig): string {
  return config.containerMobileCollapseLabel || 'Menu';
}
