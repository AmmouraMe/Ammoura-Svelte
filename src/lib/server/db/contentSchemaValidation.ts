/**
 * Content type field schema validation module
 * Validates ContentFieldDefinition[] structures before saving to the database.
 * This validates the SCHEMA itself, not field VALUES (see contentValidation.ts for that).
 */

import type {
  ContentFieldDefinition,
  ContentFieldType,
  ContentFieldConfig,
  TextFieldConfig,
  NumberFieldConfig,
  SelectionFieldConfig,
  MediaFieldConfig,
  ReferenceFieldConfig,
  DateFieldConfig
} from '../../types/contentTypes.js';

/**
 * Result of schema validation
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

/**
 * A single schema validation error
 */
export interface SchemaValidationError {
  fieldIndex: number;
  fieldSlug: string;
  message: string;
}

const VALID_FIELD_TYPES: ContentFieldType[] = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'boolean',
  'date',
  'datetime',
  'email',
  'url',
  'tel',
  'media',
  'selection',
  'multi_selection',
  'reference',
  'json'
];

const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Validate an entire field schema array
 */
export function validateFieldSchema(fields: ContentFieldDefinition[]): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];

  if (!Array.isArray(fields)) {
    return {
      valid: false,
      errors: [{ fieldIndex: -1, fieldSlug: '', message: 'Schema must be an array' }]
    };
  }

  const slugs = new Set<string>();

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const fieldErrors = validateFieldDefinition(field, i, slugs);
    errors.push(...fieldErrors);

    if (field.slug) {
      slugs.add(field.slug);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single field definition
 */
export function validateFieldDefinition(
  field: ContentFieldDefinition,
  index: number,
  existingSlugs: Set<string>
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  const slug = field.slug || '';

  // Required properties
  if (!field.name || typeof field.name !== 'string' || !field.name.trim()) {
    errors.push({ fieldIndex: index, fieldSlug: slug, message: 'Field name is required' });
  }

  if (!slug) {
    errors.push({ fieldIndex: index, fieldSlug: slug, message: 'Field slug is required' });
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.push({
      fieldIndex: index,
      fieldSlug: slug,
      message:
        'Slug must start with a letter and contain only lowercase letters, numbers, and underscores'
    });
  } else if (existingSlugs.has(slug)) {
    errors.push({
      fieldIndex: index,
      fieldSlug: slug,
      message: `Duplicate slug "${slug}"`
    });
  }

  if (!field.type) {
    errors.push({ fieldIndex: index, fieldSlug: slug, message: 'Field type is required' });
  } else if (!VALID_FIELD_TYPES.includes(field.type)) {
    errors.push({
      fieldIndex: index,
      fieldSlug: slug,
      message: `Invalid field type "${field.type}"`
    });
  }

  // Validate config if present
  if (field.config && field.type) {
    const configErrors = validateFieldConfig(field.type, field.config, index, slug);
    errors.push(...configErrors);
  }

  // Selection types MUST have config with options
  if ((field.type === 'selection' || field.type === 'multi_selection') && !field.config) {
    errors.push({
      fieldIndex: index,
      fieldSlug: slug,
      message: `${field.type} fields must have config with options`
    });
  }

  return errors;
}

/**
 * Validate type-specific config
 */
export function validateFieldConfig(
  type: ContentFieldType,
  config: ContentFieldConfig,
  index: number,
  slug: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  switch (type) {
    case 'text':
    case 'textarea':
    case 'rich_text': {
      const c = config as TextFieldConfig;
      if (c.minLength !== undefined && (typeof c.minLength !== 'number' || c.minLength < 0)) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'minLength must be a non-negative number'
        });
      }
      if (c.maxLength !== undefined && (typeof c.maxLength !== 'number' || c.maxLength < 1)) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'maxLength must be a positive number'
        });
      }
      if (
        c.minLength !== undefined &&
        c.maxLength !== undefined &&
        typeof c.minLength === 'number' &&
        typeof c.maxLength === 'number' &&
        c.minLength > c.maxLength
      ) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'minLength cannot exceed maxLength'
        });
      }
      if (c.pattern !== undefined) {
        try {
          new RegExp(c.pattern);
        } catch {
          errors.push({ fieldIndex: index, fieldSlug: slug, message: 'Invalid regex pattern' });
        }
      }
      break;
    }

    case 'number': {
      const c = config as NumberFieldConfig;
      if (c.min !== undefined && typeof c.min !== 'number') {
        errors.push({ fieldIndex: index, fieldSlug: slug, message: 'min must be a number' });
      }
      if (c.max !== undefined && typeof c.max !== 'number') {
        errors.push({ fieldIndex: index, fieldSlug: slug, message: 'max must be a number' });
      }
      if (
        c.min !== undefined &&
        c.max !== undefined &&
        typeof c.min === 'number' &&
        typeof c.max === 'number' &&
        c.min > c.max
      ) {
        errors.push({ fieldIndex: index, fieldSlug: slug, message: 'min cannot exceed max' });
      }
      if (c.step !== undefined && (typeof c.step !== 'number' || c.step <= 0)) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'step must be a positive number'
        });
      }
      if (
        c.decimalPlaces !== undefined &&
        (typeof c.decimalPlaces !== 'number' ||
          c.decimalPlaces < 0 ||
          !Number.isInteger(c.decimalPlaces))
      ) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'decimalPlaces must be a non-negative integer'
        });
      }
      break;
    }

    case 'selection':
    case 'multi_selection': {
      const c = config as SelectionFieldConfig;
      if (!c.options || !Array.isArray(c.options)) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'Selection fields must have an options array'
        });
      } else if (c.options.length === 0) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'Selection fields must have at least one option'
        });
      } else {
        const values = new Set<string>();
        for (let i = 0; i < c.options.length; i++) {
          const opt = c.options[i];
          if (!opt.label || !opt.value) {
            errors.push({
              fieldIndex: index,
              fieldSlug: slug,
              message: `Option at index ${i} must have both label and value`
            });
          }
          if (values.has(opt.value)) {
            errors.push({
              fieldIndex: index,
              fieldSlug: slug,
              message: `Duplicate option value "${opt.value}"`
            });
          }
          values.add(opt.value);
        }
      }
      break;
    }

    case 'media': {
      const c = config as MediaFieldConfig;
      const validMediaTypes = ['image', 'video', 'audio', 'document'];
      if (c.allowedTypes) {
        if (!Array.isArray(c.allowedTypes)) {
          errors.push({
            fieldIndex: index,
            fieldSlug: slug,
            message: 'allowedTypes must be an array'
          });
        } else {
          for (const t of c.allowedTypes) {
            if (!validMediaTypes.includes(t)) {
              errors.push({
                fieldIndex: index,
                fieldSlug: slug,
                message: `Invalid media type "${t}"`
              });
            }
          }
        }
      }
      if (
        c.maxFileSize !== undefined &&
        (typeof c.maxFileSize !== 'number' || c.maxFileSize <= 0)
      ) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'maxFileSize must be a positive number'
        });
      }
      break;
    }

    case 'reference': {
      const c = config as ReferenceFieldConfig;
      const validTargets = ['content_entry', 'product', 'page'];
      if (!c.targetType) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: 'Reference fields must have a targetType'
        });
      } else if (!validTargets.includes(c.targetType)) {
        errors.push({
          fieldIndex: index,
          fieldSlug: slug,
          message: `Invalid targetType "${c.targetType}"`
        });
      }
      break;
    }

    case 'date':
    case 'datetime': {
      const c = config as DateFieldConfig;
      if (c.minDate !== undefined && typeof c.minDate !== 'string') {
        errors.push({ fieldIndex: index, fieldSlug: slug, message: 'minDate must be a string' });
      }
      if (c.maxDate !== undefined && typeof c.maxDate !== 'string') {
        errors.push({ fieldIndex: index, fieldSlug: slug, message: 'maxDate must be a string' });
      }
      if (
        c.minDate &&
        c.maxDate &&
        typeof c.minDate === 'string' &&
        typeof c.maxDate === 'string'
      ) {
        const min = new Date(c.minDate);
        const max = new Date(c.maxDate);
        if (!isNaN(min.getTime()) && !isNaN(max.getTime()) && min > max) {
          errors.push({
            fieldIndex: index,
            fieldSlug: slug,
            message: 'minDate cannot be after maxDate'
          });
        }
      }
      break;
    }
  }

  return errors;
}
