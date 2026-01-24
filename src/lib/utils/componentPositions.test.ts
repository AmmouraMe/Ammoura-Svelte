import { describe, it, expect } from 'vitest';
import {
  normalizeComponentPositions,
  needsPositionNormalization,
  stableSortComponents
} from './componentPositions';
import type { PageComponent } from '$lib/types/pages';

describe('componentPositions utilities', () => {
  const createMockComponent = (id: string, position: number, createdAt: number): PageComponent => ({
    id,
    page_id: 'test-page',
    type: 'text',
    position,
    config: {},
    created_at: createdAt,
    updated_at: createdAt
  });

  describe('normalizeComponentPositions', () => {
    it('normalizes duplicate positions to sequential values', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 0, 2000), // Duplicate position
        createMockComponent('w3', 1, 3000)
      ];

      const normalized = normalizeComponentPositions(components);

      expect(normalized[0].position).toBe(0);
      expect(normalized[1].position).toBe(1);
      expect(normalized[2].position).toBe(2);
    });

    it('preserves order using created_at as tiebreaker for duplicate positions', () => {
      const components = [
        createMockComponent('newer', 0, 2000),
        createMockComponent('older', 0, 1000),
        createMockComponent('third', 1, 3000)
      ];

      const normalized = normalizeComponentPositions(components);

      // Older component should come first when positions are equal
      expect(normalized[0].id).toBe('older');
      expect(normalized[1].id).toBe('newer');
      expect(normalized[2].id).toBe('third');
    });

    it('fills gaps in position sequence', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 5, 2000), // Gap from 0 to 5
        createMockComponent('w3', 10, 3000) // Gap from 5 to 10
      ];

      const normalized = normalizeComponentPositions(components);

      expect(normalized[0].position).toBe(0);
      expect(normalized[1].position).toBe(1);
      expect(normalized[2].position).toBe(2);
    });

    it('handles negative positions', () => {
      const components = [
        createMockComponent('w1', -1, 1000),
        createMockComponent('w2', 0, 2000),
        createMockComponent('w3', 1, 3000)
      ];

      const normalized = normalizeComponentPositions(components);

      expect(normalized[0].position).toBe(0);
      expect(normalized[1].position).toBe(1);
      expect(normalized[2].position).toBe(2);
    });

    it('handles empty array', () => {
      const normalized = normalizeComponentPositions([]);
      expect(normalized).toEqual([]);
    });

    it('handles single component', () => {
      const components = [createMockComponent('w1', 5, 1000)];
      const normalized = normalizeComponentPositions(components);

      expect(normalized[0].position).toBe(0);
    });

    it('does not mutate original array', () => {
      const components = [createMockComponent('w1', 0, 1000), createMockComponent('w2', 0, 2000)];
      const originalPositions = components.map((w) => w.position);

      normalizeComponentPositions(components);

      // Original should be unchanged
      expect(components.map((w) => w.position)).toEqual(originalPositions);
    });
  });

  describe('needsPositionNormalization', () => {
    it('returns true for duplicate positions', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 0, 2000), // Duplicate
        createMockComponent('w3', 1, 3000)
      ];

      expect(needsPositionNormalization(components)).toBe(true);
    });

    it('returns true for gaps in sequence', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 5, 2000), // Gap
        createMockComponent('w3', 6, 3000)
      ];

      expect(needsPositionNormalization(components)).toBe(true);
    });

    it('returns true if positions do not start at 0', () => {
      const components = [
        createMockComponent('w1', 1, 1000),
        createMockComponent('w2', 2, 2000),
        createMockComponent('w3', 3, 3000)
      ];

      expect(needsPositionNormalization(components)).toBe(true);
    });

    it('returns false for properly sequential positions', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 1, 2000),
        createMockComponent('w3', 2, 3000)
      ];

      expect(needsPositionNormalization(components)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(needsPositionNormalization([])).toBe(false);
    });

    it('returns false for single component at position 0', () => {
      const components = [createMockComponent('w1', 0, 1000)];
      expect(needsPositionNormalization(components)).toBe(false);
    });

    it('returns true for single component not at position 0', () => {
      const components = [createMockComponent('w1', 5, 1000)];
      expect(needsPositionNormalization(components)).toBe(true);
    });
  });

  describe('stableSortComponents', () => {
    it('sorts by position first', () => {
      const components = [
        createMockComponent('w3', 2, 3000),
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 1, 2000)
      ];

      const sorted = stableSortComponents(components);

      expect(sorted[0].id).toBe('w1');
      expect(sorted[1].id).toBe('w2');
      expect(sorted[2].id).toBe('w3');
    });

    it('uses created_at as tiebreaker for equal positions', () => {
      const components = [
        createMockComponent('newest', 0, 3000),
        createMockComponent('oldest', 0, 1000),
        createMockComponent('middle', 0, 2000)
      ];

      const sorted = stableSortComponents(components);

      expect(sorted[0].id).toBe('oldest');
      expect(sorted[1].id).toBe('middle');
      expect(sorted[2].id).toBe('newest');
    });

    it('produces consistent results across multiple calls', () => {
      const components = [
        createMockComponent('w1', 0, 1000),
        createMockComponent('w2', 0, 2000),
        createMockComponent('w3', 1, 3000)
      ];

      const sorted1 = stableSortComponents(components);
      const sorted2 = stableSortComponents(components);

      expect(sorted1.map((w) => w.id)).toEqual(sorted2.map((w) => w.id));
    });

    it('does not mutate original array', () => {
      const components = [createMockComponent('w3', 2, 3000), createMockComponent('w1', 0, 1000)];
      const originalOrder = components.map((w) => w.id);

      stableSortComponents(components);

      expect(components.map((w) => w.id)).toEqual(originalOrder);
    });

    it('handles mixed timestamp formats', () => {
      const components = [
        createMockComponent('w2', 0, Date.parse('2023-01-02T00:00:00Z')),
        createMockComponent('w1', 0, Date.parse('2023-01-01T00:00:00Z'))
      ];

      const sorted = stableSortComponents(components);

      expect(sorted[0].id).toBe('w1');
      expect(sorted[1].id).toBe('w2');
    });
  });
});
