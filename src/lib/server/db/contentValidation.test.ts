/**
 * Tests for content field validation module
 */

import { describe, it, expect } from 'vitest';
import {
  validateFieldValues,
  validateSingleField,
  validateTextField,
  validateNumberField,
  validateBooleanField,
  validateDateField,
  validateEmailField,
  validateUrlField,
  validateTelField,
  validateMediaField,
  validateSelectionField,
  validateMultiSelectionField,
  validateReferenceField,
  validateJsonField,
  validateRichTextField,
  sanitizeFieldValues
} from './contentValidation';
import type { ContentFieldDefinition, ContentFieldValues } from '../../types/contentTypes';

// ============================================================================
// Test Helpers
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
// validateFieldValues
// ============================================================================

describe('validateFieldValues', () => {
  it('should return valid when all required fields are present', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'title', name: 'Title', required: true }),
      makeField({ slug: 'body', name: 'Body', type: 'rich_text', required: true })
    ];
    const values: ContentFieldValues = {
      title: 'Hello World',
      body: '<p>Content</p>'
    };

    const result = validateFieldValues(schema, values);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for missing required fields', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'title', name: 'Title', required: true }),
      makeField({ slug: 'body', name: 'Body', type: 'rich_text', required: true })
    ];
    const values: ContentFieldValues = {};

    const result = validateFieldValues(schema, values);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].code).toBe('required');
    expect(result.errors[1].code).toBe('required');
  });

  it('should detect unknown fields', () => {
    const schema: ContentFieldDefinition[] = [makeField({ slug: 'title', name: 'Title' })];
    const values: ContentFieldValues = {
      title: 'Hello',
      unknown_field: 'value'
    };

    const result = validateFieldValues(schema, values);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('unknown_field');
    expect(result.errors[0].fieldSlug).toBe('unknown_field');
  });

  it('should validate optional fields only when provided', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'email', name: 'Email', type: 'email', required: false })
    ];

    // Empty value — ok
    const result1 = validateFieldValues(schema, {});
    expect(result1.valid).toBe(true);

    // Invalid value — error
    const result2 = validateFieldValues(schema, { email: 'not-an-email' });
    expect(result2.valid).toBe(false);
    expect(result2.errors[0].code).toBe('invalid_format');
  });

  it('should skip further validation when required field is missing', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({
        slug: 'title',
        name: 'Title',
        required: true,
        config: { minLength: 5 }
      })
    ];
    const values: ContentFieldValues = {};

    const result = validateFieldValues(schema, values);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('required');
  });
});

// ============================================================================
// validateSingleField
// ============================================================================

describe('validateSingleField', () => {
  it('should return required error for missing required field', () => {
    const field = makeField({ required: true });
    const errors = validateSingleField(field, undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('required');
  });

  it('should return required error for empty string on required field', () => {
    const field = makeField({ required: true });
    const errors = validateSingleField(field, '');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('required');
  });

  it('should return required error for null on required field', () => {
    const field = makeField({ required: true });
    const errors = validateSingleField(field, null);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('required');
  });

  it('should return no errors for missing optional field', () => {
    const field = makeField({ required: false });
    const errors = validateSingleField(field, undefined);
    expect(errors).toHaveLength(0);
  });

  it('should return no errors for empty optional field', () => {
    const field = makeField({ required: false });
    const errors = validateSingleField(field, '');
    expect(errors).toHaveLength(0);
  });
});

// ============================================================================
// validateTextField
// ============================================================================

describe('validateTextField', () => {
  it('should accept valid strings', () => {
    const field = makeField({ type: 'text' });
    expect(validateTextField(field, 'hello')).toHaveLength(0);
  });

  it('should reject non-string values', () => {
    const field = makeField({ type: 'text' });
    const errors = validateTextField(field, 123);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should enforce minLength', () => {
    const field = makeField({ type: 'text', config: { minLength: 5 } });
    const errors = validateTextField(field, 'hi');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('min_length');
  });

  it('should enforce maxLength', () => {
    const field = makeField({ type: 'text', config: { maxLength: 5 } });
    const errors = validateTextField(field, 'hello world');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('max_length');
  });

  it('should enforce pattern', () => {
    const field = makeField({ type: 'text', config: { pattern: '^[A-Z]+$' } });
    const errors = validateTextField(field, 'lowercase');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });

  it('should pass valid pattern', () => {
    const field = makeField({ type: 'text', config: { pattern: '^[A-Z]+$' } });
    expect(validateTextField(field, 'UPPERCASE')).toHaveLength(0);
  });

  it('should skip invalid regex pattern gracefully', () => {
    const field = makeField({ type: 'text', config: { pattern: '[invalid' } });
    expect(validateTextField(field, 'anything')).toHaveLength(0);
  });

  it('should pass when within length bounds', () => {
    const field = makeField({ type: 'text', config: { minLength: 2, maxLength: 10 } });
    expect(validateTextField(field, 'hello')).toHaveLength(0);
  });
});

// ============================================================================
// validateRichTextField
// ============================================================================

describe('validateRichTextField', () => {
  it('should accept strings', () => {
    const field = makeField({ type: 'rich_text' });
    expect(validateRichTextField(field, '<p>Hello</p>')).toHaveLength(0);
  });

  it('should reject non-strings', () => {
    const field = makeField({ type: 'rich_text' });
    const errors = validateRichTextField(field, 42);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });
});

// ============================================================================
// validateNumberField
// ============================================================================

describe('validateNumberField', () => {
  it('should accept valid numbers', () => {
    const field = makeField({ type: 'number' });
    expect(validateNumberField(field, 42)).toHaveLength(0);
  });

  it('should reject non-number values', () => {
    const field = makeField({ type: 'number' });
    const errors = validateNumberField(field, 'not a number');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject NaN', () => {
    const field = makeField({ type: 'number' });
    const errors = validateNumberField(field, NaN);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should enforce min value', () => {
    const field = makeField({ type: 'number', config: { min: 0 } });
    const errors = validateNumberField(field, -1);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('min_value');
  });

  it('should enforce max value', () => {
    const field = makeField({ type: 'number', config: { max: 100 } });
    const errors = validateNumberField(field, 101);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('max_value');
  });

  it('should accept value within range', () => {
    const field = makeField({ type: 'number', config: { min: 0, max: 100 } });
    expect(validateNumberField(field, 50)).toHaveLength(0);
  });

  it('should accept value at boundaries', () => {
    const field = makeField({ type: 'number', config: { min: 0, max: 100 } });
    expect(validateNumberField(field, 0)).toHaveLength(0);
    expect(validateNumberField(field, 100)).toHaveLength(0);
  });
});

// ============================================================================
// validateBooleanField
// ============================================================================

describe('validateBooleanField', () => {
  it('should accept true', () => {
    const field = makeField({ type: 'boolean' });
    expect(validateBooleanField(field, true)).toHaveLength(0);
  });

  it('should accept false', () => {
    const field = makeField({ type: 'boolean' });
    expect(validateBooleanField(field, false)).toHaveLength(0);
  });

  it('should reject non-boolean values', () => {
    const field = makeField({ type: 'boolean' });
    const errors = validateBooleanField(field, 'true');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });
});

// ============================================================================
// validateDateField
// ============================================================================

describe('validateDateField', () => {
  it('should accept valid date strings', () => {
    const field = makeField({ type: 'date' });
    expect(validateDateField(field, '2024-01-15')).toHaveLength(0);
  });

  it('should accept valid datetime strings', () => {
    const field = makeField({ type: 'datetime' });
    expect(validateDateField(field, '2024-01-15T10:30:00Z')).toHaveLength(0);
  });

  it('should accept timestamps', () => {
    const field = makeField({ type: 'date' });
    expect(validateDateField(field, 1705305600000)).toHaveLength(0);
  });

  it('should reject non-date types', () => {
    const field = makeField({ type: 'date' });
    const errors = validateDateField(field, true);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject invalid date strings', () => {
    const field = makeField({ type: 'date' });
    const errors = validateDateField(field, 'not-a-date');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });

  it('should enforce minDate', () => {
    const field = makeField({
      type: 'date',
      config: { minDate: '2024-06-01' }
    });
    const errors = validateDateField(field, '2024-01-01');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('min_value');
  });

  it('should enforce maxDate', () => {
    const field = makeField({
      type: 'date',
      config: { maxDate: '2024-06-01' }
    });
    const errors = validateDateField(field, '2024-12-31');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('max_value');
  });

  it('should accept date within range', () => {
    const field = makeField({
      type: 'date',
      config: { minDate: '2024-01-01', maxDate: '2024-12-31' }
    });
    expect(validateDateField(field, '2024-06-15')).toHaveLength(0);
  });
});

// ============================================================================
// validateEmailField
// ============================================================================

describe('validateEmailField', () => {
  it('should accept valid emails', () => {
    const field = makeField({ type: 'email' });
    expect(validateEmailField(field, 'user@example.com')).toHaveLength(0);
  });

  it('should reject non-strings', () => {
    const field = makeField({ type: 'email' });
    const errors = validateEmailField(field, 123);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject invalid email format', () => {
    const field = makeField({ type: 'email' });
    const errors = validateEmailField(field, 'not-an-email');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });

  it('should reject email without domain', () => {
    const field = makeField({ type: 'email' });
    const errors = validateEmailField(field, 'user@');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });
});

// ============================================================================
// validateUrlField
// ============================================================================

describe('validateUrlField', () => {
  it('should accept valid URLs', () => {
    const field = makeField({ type: 'url' });
    expect(validateUrlField(field, 'https://example.com')).toHaveLength(0);
  });

  it('should accept URLs with paths', () => {
    const field = makeField({ type: 'url' });
    expect(validateUrlField(field, 'https://example.com/path?q=1')).toHaveLength(0);
  });

  it('should reject non-strings', () => {
    const field = makeField({ type: 'url' });
    const errors = validateUrlField(field, 42);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject invalid URLs', () => {
    const field = makeField({ type: 'url' });
    const errors = validateUrlField(field, 'not a url');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });
});

// ============================================================================
// validateTelField
// ============================================================================

describe('validateTelField', () => {
  it('should accept valid phone numbers', () => {
    const field = makeField({ type: 'tel' });
    expect(validateTelField(field, '+1 (555) 123-4567')).toHaveLength(0);
  });

  it('should accept simple digit strings', () => {
    const field = makeField({ type: 'tel' });
    expect(validateTelField(field, '5551234567')).toHaveLength(0);
  });

  it('should reject non-strings', () => {
    const field = makeField({ type: 'tel' });
    const errors = validateTelField(field, 5551234567);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject invalid phone formats', () => {
    const field = makeField({ type: 'tel' });
    const errors = validateTelField(field, 'call me maybe');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });
});

// ============================================================================
// validateMediaField
// ============================================================================

describe('validateMediaField', () => {
  it('should accept string media references', () => {
    const field = makeField({ type: 'media' });
    expect(validateMediaField(field, 'media-id-123')).toHaveLength(0);
  });

  it('should reject non-string for single media', () => {
    const field = makeField({ type: 'media' });
    const errors = validateMediaField(field, 42);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should accept array for multiple media', () => {
    const field = makeField({
      type: 'media',
      config: { multiple: true }
    });
    expect(validateMediaField(field, ['id1', 'id2'])).toHaveLength(0);
  });

  it('should reject non-array for multiple media', () => {
    const field = makeField({
      type: 'media',
      config: { multiple: true }
    });
    const errors = validateMediaField(field, 'single');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject array with non-string items for multiple media', () => {
    const field = makeField({
      type: 'media',
      config: { multiple: true }
    });
    const errors = validateMediaField(field, [123, 456]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });
});

// ============================================================================
// validateSelectionField
// ============================================================================

describe('validateSelectionField', () => {
  const options = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' }
  ];

  it('should accept valid option values', () => {
    const field = makeField({ type: 'selection', config: { options } });
    expect(validateSelectionField(field, 'a')).toHaveLength(0);
  });

  it('should reject non-string values', () => {
    const field = makeField({ type: 'selection', config: { options } });
    const errors = validateSelectionField(field, 42);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject invalid option values', () => {
    const field = makeField({ type: 'selection', config: { options } });
    const errors = validateSelectionField(field, 'c');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_option');
  });

  it('should allow custom values when allowCustom is true', () => {
    const field = makeField({
      type: 'selection',
      config: { options, allowCustom: true }
    });
    expect(validateSelectionField(field, 'custom_value')).toHaveLength(0);
  });

  it('should accept any string value without config', () => {
    const field = makeField({ type: 'selection' });
    expect(validateSelectionField(field, 'anything')).toHaveLength(0);
  });
});

// ============================================================================
// validateMultiSelectionField
// ============================================================================

describe('validateMultiSelectionField', () => {
  const options = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' }
  ];

  it('should accept valid arrays', () => {
    const field = makeField({ type: 'multi_selection', config: { options } });
    expect(validateMultiSelectionField(field, ['a', 'b'])).toHaveLength(0);
  });

  it('should reject non-array values', () => {
    const field = makeField({ type: 'multi_selection', config: { options } });
    const errors = validateMultiSelectionField(field, 'a');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should reject arrays with invalid options', () => {
    const field = makeField({ type: 'multi_selection', config: { options } });
    const errors = validateMultiSelectionField(field, ['a', 'invalid']);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_option');
  });

  it('should reject arrays with non-string items', () => {
    const field = makeField({ type: 'multi_selection', config: { options } });
    const errors = validateMultiSelectionField(field, [123]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should accept empty arrays', () => {
    const field = makeField({ type: 'multi_selection', config: { options } });
    expect(validateMultiSelectionField(field, [])).toHaveLength(0);
  });

  it('should allow custom values when allowCustom is true', () => {
    const field = makeField({
      type: 'multi_selection',
      config: { options, allowCustom: true }
    });
    expect(validateMultiSelectionField(field, ['a', 'custom'])).toHaveLength(0);
  });
});

// ============================================================================
// validateReferenceField
// ============================================================================

describe('validateReferenceField', () => {
  it('should accept string references', () => {
    const field = makeField({
      type: 'reference',
      config: { targetType: 'content_entry' }
    });
    expect(validateReferenceField(field, 'entry-id-123')).toHaveLength(0);
  });

  it('should reject non-string single references', () => {
    const field = makeField({
      type: 'reference',
      config: { targetType: 'content_entry' }
    });
    const errors = validateReferenceField(field, 123);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });

  it('should accept arrays for multiple references', () => {
    const field = makeField({
      type: 'reference',
      config: { targetType: 'content_entry', multiple: true }
    });
    expect(validateReferenceField(field, ['id1', 'id2'])).toHaveLength(0);
  });

  it('should reject non-arrays for multiple references', () => {
    const field = makeField({
      type: 'reference',
      config: { targetType: 'content_entry', multiple: true }
    });
    const errors = validateReferenceField(field, 'single');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_type');
  });
});

// ============================================================================
// validateJsonField
// ============================================================================

describe('validateJsonField', () => {
  it('should accept objects', () => {
    const field = makeField({ type: 'json' });
    expect(validateJsonField(field, { key: 'value' })).toHaveLength(0);
  });

  it('should accept arrays', () => {
    const field = makeField({ type: 'json' });
    expect(validateJsonField(field, [1, 2, 3])).toHaveLength(0);
  });

  it('should accept numbers', () => {
    const field = makeField({ type: 'json' });
    expect(validateJsonField(field, 42)).toHaveLength(0);
  });

  it('should accept valid JSON strings', () => {
    const field = makeField({ type: 'json' });
    expect(validateJsonField(field, '{"key":"value"}')).toHaveLength(0);
  });

  it('should reject invalid JSON strings', () => {
    const field = makeField({ type: 'json' });
    const errors = validateJsonField(field, '{invalid json}');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('invalid_format');
  });
});

// ============================================================================
// sanitizeFieldValues
// ============================================================================

describe('sanitizeFieldValues', () => {
  it('should strip unknown fields', () => {
    const schema: ContentFieldDefinition[] = [makeField({ slug: 'title', name: 'Title' })];
    const values: ContentFieldValues = {
      title: 'Hello',
      unknown: 'should be removed'
    };

    const result = sanitizeFieldValues(schema, values);
    expect(result).toEqual({ title: 'Hello' });
    expect(result).not.toHaveProperty('unknown');
  });

  it('should apply default values for missing fields', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'title', name: 'Title', defaultValue: 'Untitled' }),
      makeField({ slug: 'featured', name: 'Featured', type: 'boolean', defaultValue: false })
    ];
    const values: ContentFieldValues = {};

    const result = sanitizeFieldValues(schema, values);
    expect(result).toEqual({ title: 'Untitled', featured: false });
  });

  it('should not overwrite provided values with defaults', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'title', name: 'Title', defaultValue: 'Untitled' })
    ];
    const values: ContentFieldValues = { title: 'My Title' };

    const result = sanitizeFieldValues(schema, values);
    expect(result).toEqual({ title: 'My Title' });
  });

  it('should not apply undefined or null defaults', () => {
    const schema: ContentFieldDefinition[] = [
      makeField({ slug: 'optional', name: 'Optional' }),
      makeField({ slug: 'nullable', name: 'Nullable', defaultValue: null })
    ];
    const values: ContentFieldValues = {};

    const result = sanitizeFieldValues(schema, values);
    expect(result).toEqual({});
  });

  it('should handle empty schema and values', () => {
    const result = sanitizeFieldValues([], {});
    expect(result).toEqual({});
  });
});
