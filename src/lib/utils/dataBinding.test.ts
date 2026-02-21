/**
 * Tests for data binding utilities
 */

import { describe, it, expect } from 'vitest';
import {
  hasBindings,
  resolveStringBindings,
  resolveBindings,
  resolveWidgetBindings,
  extractReferencedFields
} from './dataBinding';
import type { ContentFieldValues } from '$lib/types/contentTypes';

// ============================================================================
// hasBindings
// ============================================================================

describe('hasBindings', () => {
  it('should detect binding expressions', () => {
    expect(hasBindings('{{ field.title }}')).toBe(true);
  });

  it('should detect without spaces', () => {
    expect(hasBindings('{{field.title}}')).toBe(true);
  });

  it('should not detect regular text', () => {
    expect(hasBindings('just a string')).toBe(false);
  });

  it('should not detect incomplete expressions', () => {
    expect(hasBindings('{{ field }}')).toBe(false);
  });

  it('should detect multiple in one string', () => {
    expect(hasBindings('{{ field.title }} and {{ field.body }}')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(hasBindings('')).toBe(false);
  });
});

// ============================================================================
// resolveStringBindings
// ============================================================================

describe('resolveStringBindings', () => {
  const fieldValues: ContentFieldValues = {
    title: 'Hello World',
    count: 42,
    active: true,
    tags: ['js', 'ts'],
    body: '<p>Content</p>'
  };

  it('should resolve simple field bindings', () => {
    expect(resolveStringBindings('{{ field.title }}', fieldValues)).toBe('Hello World');
  });

  it('should resolve without spaces', () => {
    expect(resolveStringBindings('{{field.title}}', fieldValues)).toBe('Hello World');
  });

  it('should resolve multiple bindings in one string', () => {
    expect(resolveStringBindings('{{ field.title }} - {{ field.count }}', fieldValues)).toBe(
      'Hello World - 42'
    );
  });

  it('should convert numbers to strings', () => {
    expect(resolveStringBindings('{{ field.count }}', fieldValues)).toBe('42');
  });

  it('should convert booleans to strings', () => {
    expect(resolveStringBindings('{{ field.active }}', fieldValues)).toBe('true');
  });

  it('should JSON-serialize arrays and objects', () => {
    expect(resolveStringBindings('{{ field.tags }}', fieldValues)).toBe('["js","ts"]');
  });

  it('should use fallback for missing fields', () => {
    expect(resolveStringBindings('{{ field.missing }}', fieldValues, 'N/A')).toBe('N/A');
  });

  it('should use empty string as default fallback', () => {
    expect(resolveStringBindings('{{ field.missing }}', fieldValues)).toBe('');
  });

  it('should handle null values with fallback', () => {
    const values: ContentFieldValues = { nullable: null };
    expect(resolveStringBindings('{{ field.nullable }}', values, 'fallback')).toBe('fallback');
  });

  it('should handle undefined values with fallback', () => {
    expect(resolveStringBindings('{{ field.undefined_field }}', {}, 'default')).toBe('default');
  });

  it('should preserve surrounding text', () => {
    expect(resolveStringBindings('Hello {{ field.title }}!', fieldValues)).toBe(
      'Hello Hello World!'
    );
  });

  it('should return string unchanged if no bindings', () => {
    expect(resolveStringBindings('no bindings here', fieldValues)).toBe('no bindings here');
  });
});

// ============================================================================
// resolveBindings
// ============================================================================

describe('resolveBindings', () => {
  const fieldValues: ContentFieldValues = {
    title: 'My Post',
    image: '/images/hero.jpg',
    count: 5
  };

  it('should resolve strings', () => {
    expect(resolveBindings('{{ field.title }}', fieldValues)).toBe('My Post');
  });

  it('should resolve nested objects', () => {
    const config = {
      text: '{{ field.title }}',
      src: '{{ field.image }}'
    };
    expect(resolveBindings(config, fieldValues)).toEqual({
      text: 'My Post',
      src: '/images/hero.jpg'
    });
  });

  it('should resolve deeply nested objects', () => {
    const config = {
      level1: {
        level2: {
          text: '{{ field.title }}'
        }
      }
    };
    expect(resolveBindings(config, fieldValues)).toEqual({
      level1: {
        level2: {
          text: 'My Post'
        }
      }
    });
  });

  it('should resolve arrays', () => {
    const config = ['{{ field.title }}', '{{ field.image }}'];
    expect(resolveBindings(config, fieldValues)).toEqual(['My Post', '/images/hero.jpg']);
  });

  it('should resolve arrays within objects', () => {
    const config = {
      items: ['{{ field.title }}', 'static']
    };
    expect(resolveBindings(config, fieldValues)).toEqual({
      items: ['My Post', 'static']
    });
  });

  it('should handle null values', () => {
    expect(resolveBindings(null, fieldValues)).toBeNull();
  });

  it('should handle undefined values', () => {
    expect(resolveBindings(undefined, fieldValues)).toBeUndefined();
  });

  it('should pass through numbers unchanged', () => {
    expect(resolveBindings(42, fieldValues)).toBe(42);
  });

  it('should pass through booleans unchanged', () => {
    expect(resolveBindings(true, fieldValues)).toBe(true);
  });

  it('should not mutate the original object', () => {
    const original = { text: '{{ field.title }}' };
    const resolved = resolveBindings(original, fieldValues);
    expect(original.text).toBe('{{ field.title }}');
    expect(resolved.text).toBe('My Post');
  });
});

// ============================================================================
// resolveWidgetBindings
// ============================================================================

describe('resolveWidgetBindings', () => {
  it('should resolve bindings in an array of widgets', () => {
    const fieldValues: ContentFieldValues = { title: 'Test', image: '/pic.jpg' };
    const widgets = [
      { type: 'heading', config: { text: '{{ field.title }}' } },
      { type: 'image', config: { src: '{{ field.image }}' } }
    ];

    const result = resolveWidgetBindings(widgets, fieldValues);

    expect(result).toEqual([
      { type: 'heading', config: { text: 'Test' } },
      { type: 'image', config: { src: '/pic.jpg' } }
    ]);
  });

  it('should handle empty arrays', () => {
    expect(resolveWidgetBindings([], {})).toEqual([]);
  });
});

// ============================================================================
// extractReferencedFields
// ============================================================================

describe('extractReferencedFields', () => {
  it('should extract field slugs from strings', () => {
    const fields = extractReferencedFields('{{ field.title }} and {{ field.body }}');
    expect(fields).toEqual(new Set(['title', 'body']));
  });

  it('should extract from nested objects', () => {
    const config = {
      heading: '{{ field.title }}',
      content: {
        text: '{{ field.body }}',
        image: '{{ field.featured_image }}'
      }
    };
    const fields = extractReferencedFields(config);
    expect(fields).toEqual(new Set(['title', 'body', 'featured_image']));
  });

  it('should extract from arrays', () => {
    const config = ['{{ field.title }}', '{{ field.body }}'];
    const fields = extractReferencedFields(config);
    expect(fields).toEqual(new Set(['title', 'body']));
  });

  it('should deduplicate repeated fields', () => {
    const config = {
      a: '{{ field.title }}',
      b: '{{ field.title }}'
    };
    const fields = extractReferencedFields(config);
    expect(fields).toEqual(new Set(['title']));
    expect(fields.size).toBe(1);
  });

  it('should return empty set for no bindings', () => {
    expect(extractReferencedFields('no bindings')).toEqual(new Set());
  });

  it('should return empty set for non-string primitives', () => {
    expect(extractReferencedFields(42)).toEqual(new Set());
    expect(extractReferencedFields(true)).toEqual(new Set());
    expect(extractReferencedFields(null)).toEqual(new Set());
  });
});
