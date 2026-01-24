/**
 * Component position normalization utilities
 *
 * These utilities ensure that component positions are unique and sequential,
 * preventing bugs related to duplicate positions in the builder.
 */

import type { PageComponent } from '$lib/types/pages';

/**
 * Normalize component positions to ensure they are unique and sequential.
 *
 * This function:
 * 1. Sorts components by their current position (using created_at as tiebreaker for stability)
 * 2. Reassigns positions to be sequential (0, 1, 2, ...)
 * 3. Returns a new array with normalized positions
 *
 * @param components - Array of components to normalize
 * @returns New array of components with unique, sequential positions
 *
 * @example
 * // Components with duplicate positions [0, 0, 1]
 * const components = [
 *   { id: '1', position: 0, created_at: 1000, ... },
 *   { id: '2', position: 0, created_at: 2000, ... },
 *   { id: '3', position: 1, created_at: 3000, ... }
 * ];
 *
 * const normalized = normalizeComponentPositions(components);
 * // Result: positions are now [0, 1, 2]
 */
export function normalizeComponentPositions(components: PageComponent[]): PageComponent[] {
  if (components.length === 0) {
    return [];
  }

  // Sort components by position (primary) and created_at (secondary for stability)
  // This ensures consistent ordering when positions are equal
  const sorted = [...components].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    // Use created_at as tiebreaker for stable sort
    // created_at is always a number (timestamp) in PageComponent type
    return a.created_at - b.created_at;
  });

  // Reassign positions sequentially
  return sorted.map((component, index) => ({
    ...component,
    position: index
  }));
}

// Deprecated: Use normalizeComponentPositions instead
export const normalizeWidgetPositions = normalizeComponentPositions;

/**
 * Check if component positions need normalization.
 *
 * Returns true if:
 * - Any positions are duplicated
 * - Positions are not sequential (have gaps)
 * - Positions don't start at 0
 *
 * @param components - Array of components to check
 * @returns True if normalization is needed
 */
export function needsPositionNormalization(components: PageComponent[]): boolean {
  if (components.length === 0) {
    return false;
  }

  const positions = components.map((c) => c.position).sort((a, b) => a - b);

  // Check for duplicates
  const uniquePositions = new Set(positions);
  if (uniquePositions.size !== positions.length) {
    return true;
  }

  // Check if positions are sequential starting from 0
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i) {
      return true;
    }
  }

  return false;
}

/**
 * Stable sort function for components.
 *
 * Sorts by position first, then by created_at timestamp for stability.
 * This ensures consistent ordering when positions are equal.
 *
 * @param components - Array of components to sort
 * @returns New sorted array
 */
export function stableSortComponents(components: PageComponent[]): PageComponent[] {
  return [...components].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    // created_at is always a number (timestamp) in PageComponent type
    return a.created_at - b.created_at;
  });
}

// Deprecated: Use stableSortComponents instead
export const stableSortWidgets = stableSortComponents;
