/**
 * Tests for content type field schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateFieldSchema,
  validateFieldDefinition,
  validateFieldConfig
} from './contentSchemaValidation';
import type { ContentFieldDefinition } from '../../types/contentTypes';

// ============================================================================
// Helpers
// ============================================================================

function makeField(overrides: Partial<ContentFieldDefinition> = {}): ContentFieldDefinition {
  return {
    slug: 'test_field',
    name: 'Test Field',
    type: 'text',
    required: false,
    position: 1,
    ...overrides
  };
}

// ============================================================================
// validateFieldSchema
// ============================================================================

describe('validateFieldSchema', () => {
  it('should accept a valid schema', () => {
    const result = validateFieldSchema([
      makeField({ slug: 'title', name: 'Title', type: 'text', position: 1 }),
      makeField({ slug: 'body', name: 'Body', type: 'rich_text', position: 2 })
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept an empty schema', () => {
    const result = validateFieldSchema([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-array input', () => {
    const result = validateFieldSchema('not an array' as unknown as ContentFieldDefinition[]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('Schema must be an array');
  });

  it('should detect duplicate slugs', () => {
    const result = validateFieldSchema([
      makeField({ slug: 'title', name: 'Title', position: 1 }),
      makeField({ slug: 'title', name: 'Title Again', position: 2 })
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate slug'))).toBe(true);
  });

  it('should validate all fields and collect all errors', () => {
    const result = validateFieldSchema([
      makeField({ slug: '', name: '', type: 'text', position: 1 }),
      makeField({ slug: '', name: '', type: 'text', position: 2 })
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================================
// validateFieldDefinition
// ============================================================================

describe('validateFieldDefinition', () => {
  it('should accept a valid field', () => {
    const errors = validateFieldDefinition(
      makeField({ slug: 'title', name: 'Title', type: 'text' }),
      0,
      new Set()
    );
    expect(errors).toHaveLength(0);
  });

  it('should require a field name', () => {
    const errors = validateFieldDefinition(makeField({ name: '' }), 0, new Set());
    expect(errors.some((e) => e.message.includes('name is required'))).toBe(true);
  });

  it('should require a slug', () => {
    const errors = validateFieldDefinition(makeField({ slug: '' }), 0, new Set());
    expect(errors.some((e) => e.message.includes('slug is required'))).toBe(true);
  });

  it('should validate slug format', () => {
    const errors = validateFieldDefinition(makeField({ slug: 'Invalid-Slug!' }), 0, new Set());
    expect(errors.some((e) => e.message.includes('Slug must start'))).toBe(true);
  });

  it('should reject slugs starting with a number', () => {
    const errors = validateFieldDefinition(makeField({ slug: '1field' }), 0, new Set());
    expect(errors.some((e) => e.message.includes('Slug must start'))).toBe(true);
  });

  it('should detect duplicate slugs', () => {
    const existing = new Set(['title']);
    const errors = validateFieldDefinition(makeField({ slug: 'title' }), 1, existing);
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
  });

  it('should require a type', () => {
    const errors = validateFieldDefinition(
      makeField({ type: '' as unknown as ContentFieldDefinition['type'] }),
      0,
      new Set()
    );
    expect(errors.some((e) => e.message.includes('type is required'))).toBe(true);
  });

  it('should reject invalid types', () => {
    const errors = validateFieldDefinition(
      makeField({ type: 'invalid_type' as ContentFieldDefinition['type'] }),
      0,
      new Set()
    );
    expect(errors.some((e) => e.message.includes('Invalid field type'))).toBe(true);
  });

  it('should require config for selection types', () => {
    const errors = validateFieldDefinition(
      makeField({ type: 'selection', config: undefined }),
      0,
      new Set()
    );
    expect(errors.some((e) => e.message.includes('must have config'))).toBe(true);
  });

  it('should require config for multi_selection types', () => {
    const errors = validateFieldDefinition(
      makeField({ type: 'multi_selection', config: undefined }),
      0,
      new Set()
    );
    expect(errors.some((e) => e.message.includes('must have config'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — text
// ============================================================================

describe('validateFieldConfig — text', () => {
  it('should accept valid text config', () => {
    const errors = validateFieldConfig(
      'text',
      { minLength: 1, maxLength: 100, pattern: '^[a-z]+$' },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject negative minLength', () => {
    const errors = validateFieldConfig('text', { minLength: -1 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('minLength'))).toBe(true);
  });

  it('should reject zero maxLength', () => {
    const errors = validateFieldConfig('text', { maxLength: 0 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('maxLength'))).toBe(true);
  });

  it('should reject minLength > maxLength', () => {
    const errors = validateFieldConfig('text', { minLength: 50, maxLength: 10 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('cannot exceed'))).toBe(true);
  });

  it('should reject invalid regex pattern', () => {
    const errors = validateFieldConfig('text', { pattern: '[invalid(' }, 0, 'f');
    expect(errors.some((e) => e.message.includes('Invalid regex'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — number
// ============================================================================

describe('validateFieldConfig — number', () => {
  it('should accept valid number config', () => {
    const errors = validateFieldConfig(
      'number',
      { min: 0, max: 100, step: 0.5, decimalPlaces: 2 },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject min > max', () => {
    const errors = validateFieldConfig('number', { min: 100, max: 10 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('cannot exceed'))).toBe(true);
  });

  it('should reject non-positive step', () => {
    const errors = validateFieldConfig('number', { step: 0 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('step'))).toBe(true);
  });

  it('should reject negative decimalPlaces', () => {
    const errors = validateFieldConfig('number', { decimalPlaces: -1 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('decimalPlaces'))).toBe(true);
  });

  it('should reject non-integer decimalPlaces', () => {
    const errors = validateFieldConfig('number', { decimalPlaces: 1.5 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('decimalPlaces'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — selection
// ============================================================================

describe('validateFieldConfig — selection', () => {
  it('should accept valid selection config', () => {
    const errors = validateFieldConfig(
      'selection',
      {
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' }
        ]
      },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject missing options', () => {
    const errors = validateFieldConfig('selection', {} as never, 0, 'f');
    expect(errors.some((e) => e.message.includes('options array'))).toBe(true);
  });

  it('should reject empty options array', () => {
    const errors = validateFieldConfig('selection', { options: [] }, 0, 'f');
    expect(errors.some((e) => e.message.includes('at least one'))).toBe(true);
  });

  it('should reject options without label or value', () => {
    const errors = validateFieldConfig(
      'selection',
      { options: [{ label: '', value: '' }] },
      0,
      'f'
    );
    expect(errors.some((e) => e.message.includes('must have both'))).toBe(true);
  });

  it('should reject duplicate option values', () => {
    const errors = validateFieldConfig(
      'selection',
      {
        options: [
          { label: 'A', value: 'a' },
          { label: 'Also A', value: 'a' }
        ]
      },
      0,
      'f'
    );
    expect(errors.some((e) => e.message.includes('Duplicate option'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — media
// ============================================================================

describe('validateFieldConfig — media', () => {
  it('should accept valid media config', () => {
    const errors = validateFieldConfig(
      'media',
      { allowedTypes: ['image', 'video'], maxFileSize: 1024, multiple: true },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid media types', () => {
    const errors = validateFieldConfig('media', { allowedTypes: ['invalid' as never] }, 0, 'f');
    expect(errors.some((e) => e.message.includes('Invalid media type'))).toBe(true);
  });

  it('should reject non-positive maxFileSize', () => {
    const errors = validateFieldConfig('media', { maxFileSize: 0 }, 0, 'f');
    expect(errors.some((e) => e.message.includes('maxFileSize'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — reference
// ============================================================================

describe('validateFieldConfig — reference', () => {
  it('should accept valid reference config', () => {
    const errors = validateFieldConfig(
      'reference',
      { targetType: 'content_entry', multiple: false },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should require targetType', () => {
    const errors = validateFieldConfig('reference', {} as never, 0, 'f');
    expect(errors.some((e) => e.message.includes('targetType'))).toBe(true);
  });

  it('should reject invalid targetType', () => {
    const errors = validateFieldConfig('reference', { targetType: 'invalid' as never }, 0, 'f');
    expect(errors.some((e) => e.message.includes('Invalid targetType'))).toBe(true);
  });
});

// ============================================================================
// validateFieldConfig — date
// ============================================================================

describe('validateFieldConfig — date', () => {
  it('should accept valid date config', () => {
    const errors = validateFieldConfig(
      'date',
      { minDate: '2024-01-01', maxDate: '2024-12-31' },
      0,
      'f'
    );
    expect(errors).toHaveLength(0);
  });

  it('should reject minDate after maxDate', () => {
    const errors = validateFieldConfig(
      'date',
      { minDate: '2024-12-31', maxDate: '2024-01-01' },
      0,
      'f'
    );
    expect(errors.some((e) => e.message.includes('cannot be after'))).toBe(true);
  });

  it('should reject non-string minDate', () => {
    const errors = validateFieldConfig('date', { minDate: 123 as never }, 0, 'f');
    expect(errors.some((e) => e.message.includes('minDate must be a string'))).toBe(true);
  });
});
