/**
 * Content field validation module
 * Validates content entry field values against content type schemas
 */

import type {
  ContentFieldDefinition,
  ContentFieldType,
  ContentFieldValues,
  ContentValidationResult,
  ContentValidationError,
  ContentValidationErrorCode,
  SelectionFieldConfig,
  NumberFieldConfig,
  TextFieldConfig,
  MediaFieldConfig,
  DateFieldConfig
} from '../../types/contentTypes.js';

/**
 * Validate all field values against a content type's field schema
 */
export function validateFieldValues(
  fieldsSchema: ContentFieldDefinition[],
  fieldValues: ContentFieldValues
): ContentValidationResult {
  const errors: ContentValidationError[] = [];

  // Validate each field in the schema
  for (const field of fieldsSchema) {
    const value = fieldValues[field.slug];
    const fieldErrors = validateSingleField(field, value);
    errors.push(...fieldErrors);
  }

  // Check for unknown fields
  const knownSlugs = new Set(fieldsSchema.map((f) => f.slug));
  for (const key of Object.keys(fieldValues)) {
    if (!knownSlugs.has(key)) {
      errors.push({
        fieldSlug: key,
        fieldName: key,
        message: `Unknown field "${key}" is not defined in the content type schema`,
        code: 'unknown_field'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single field value against its definition
 */
export function validateSingleField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  // Check required
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push(createError(field, 'required', `"${field.name}" is required`));
    return errors; // Skip further validation if required and missing
  }

  // Skip validation if value is not provided and not required
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // Type-specific validation
  const typeErrors = validateFieldType(field, value);
  errors.push(...typeErrors);

  return errors;
}

/**
 * Validate a field value based on its type
 */
export function validateFieldType(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const validators: Record<
    ContentFieldType,
    (field: ContentFieldDefinition, value: unknown) => ContentValidationError[]
  > = {
    text: validateTextField,
    textarea: validateTextField,
    rich_text: validateRichTextField,
    number: validateNumberField,
    boolean: validateBooleanField,
    date: validateDateField,
    datetime: validateDateField,
    email: validateEmailField,
    url: validateUrlField,
    tel: validateTelField,
    media: validateMediaField,
    selection: validateSelectionField,
    multi_selection: validateMultiSelectionField,
    reference: validateReferenceField,
    json: validateJsonField
  };

  const validator = validators[field.type];
  if (validator) {
    return validator(field, value);
  }

  return [];
}

/**
 * Validate text and textarea fields
 */
export function validateTextField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (typeof value !== 'string') {
    errors.push(createError(field, 'invalid_type', `"${field.name}" must be a string`));
    return errors;
  }

  const config = field.config as TextFieldConfig | undefined;
  if (config) {
    if (config.minLength !== undefined && value.length < config.minLength) {
      errors.push(
        createError(
          field,
          'min_length',
          `"${field.name}" must be at least ${config.minLength} characters`
        )
      );
    }
    if (config.maxLength !== undefined && value.length > config.maxLength) {
      errors.push(
        createError(
          field,
          'max_length',
          `"${field.name}" must be at most ${config.maxLength} characters`
        )
      );
    }
    if (config.pattern) {
      try {
        const regex = new RegExp(config.pattern);
        if (!regex.test(value)) {
          errors.push(
            createError(
              field,
              'invalid_format',
              `"${field.name}" does not match the required pattern`
            )
          );
        }
      } catch {
        // Invalid regex pattern in config — skip pattern validation
      }
    }
  }

  return errors;
}

/**
 * Validate rich text fields (HTML/Markdown content)
 */
export function validateRichTextField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'string') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a string`)];
  }
  return [];
}

/**
 * Validate number fields
 */
export function validateNumberField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(createError(field, 'invalid_type', `"${field.name}" must be a number`));
    return errors;
  }

  const config = field.config as NumberFieldConfig | undefined;
  if (config) {
    if (config.min !== undefined && value < config.min) {
      errors.push(
        createError(field, 'min_value', `"${field.name}" must be at least ${config.min}`)
      );
    }
    if (config.max !== undefined && value > config.max) {
      errors.push(createError(field, 'max_value', `"${field.name}" must be at most ${config.max}`));
    }
  }

  return errors;
}

/**
 * Validate boolean fields
 */
export function validateBooleanField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'boolean') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a boolean`)];
  }
  return [];
}

/**
 * Validate date and datetime fields
 */
export function validateDateField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (typeof value !== 'string' && typeof value !== 'number') {
    errors.push(
      createError(field, 'invalid_type', `"${field.name}" must be a valid date string or timestamp`)
    );
    return errors;
  }

  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    errors.push(createError(field, 'invalid_format', `"${field.name}" is not a valid date`));
    return errors;
  }

  const config = field.config as DateFieldConfig | undefined;
  if (config) {
    if (config.minDate) {
      const minDate = new Date(config.minDate);
      if (!isNaN(minDate.getTime()) && dateValue < minDate) {
        errors.push(
          createError(field, 'min_value', `"${field.name}" must be on or after ${config.minDate}`)
        );
      }
    }
    if (config.maxDate) {
      const maxDate = new Date(config.maxDate);
      if (!isNaN(maxDate.getTime()) && dateValue > maxDate) {
        errors.push(
          createError(field, 'max_value', `"${field.name}" must be on or before ${config.maxDate}`)
        );
      }
    }
  }

  return errors;
}

/**
 * Validate email fields
 */
export function validateEmailField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'string') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a string`)];
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return [createError(field, 'invalid_format', `"${field.name}" must be a valid email address`)];
  }

  return [];
}

/**
 * Validate URL fields
 */
export function validateUrlField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'string') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a string`)];
  }

  try {
    new URL(value);
  } catch {
    return [createError(field, 'invalid_format', `"${field.name}" must be a valid URL`)];
  }

  return [];
}

/**
 * Validate telephone fields
 */
export function validateTelField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'string') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a string`)];
  }

  // Basic tel validation: digits, spaces, dashes, parentheses, plus sign
  const telRegex = /^[+]?[\d\s\-()]+$/;
  if (!telRegex.test(value)) {
    return [createError(field, 'invalid_format', `"${field.name}" must be a valid phone number`)];
  }

  return [];
}

/**
 * Validate media fields (file references)
 */
export function validateMediaField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  const config = field.config as MediaFieldConfig | undefined;

  if (config?.multiple) {
    if (!Array.isArray(value)) {
      errors.push(
        createError(field, 'invalid_type', `"${field.name}" must be an array of media references`)
      );
      return errors;
    }
    for (const item of value) {
      if (typeof item !== 'string') {
        errors.push(
          createError(
            field,
            'invalid_type',
            `Each item in "${field.name}" must be a string (media URL or ID)`
          )
        );
        break;
      }
    }
  } else {
    if (typeof value !== 'string') {
      errors.push(
        createError(field, 'invalid_type', `"${field.name}" must be a string (media URL or ID)`)
      );
    }
  }

  return errors;
}

/**
 * Validate single-selection fields
 */
export function validateSelectionField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  if (typeof value !== 'string') {
    return [createError(field, 'invalid_type', `"${field.name}" must be a string`)];
  }

  const config = field.config as SelectionFieldConfig | undefined;
  if (config && !config.allowCustom) {
    const validValues = config.options.map((o) => o.value);
    if (!validValues.includes(value)) {
      return [
        createError(
          field,
          'invalid_option',
          `"${field.name}" must be one of: ${validValues.join(', ')}`
        )
      ];
    }
  }

  return [];
}

/**
 * Validate multi-selection fields
 */
export function validateMultiSelectionField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (!Array.isArray(value)) {
    errors.push(
      createError(field, 'invalid_type', `"${field.name}" must be an array of selected values`)
    );
    return errors;
  }

  const config = field.config as SelectionFieldConfig | undefined;
  if (config && !config.allowCustom) {
    const validValues = new Set(config.options.map((o) => o.value));
    for (const item of value) {
      if (typeof item !== 'string') {
        errors.push(
          createError(field, 'invalid_type', `Each item in "${field.name}" must be a string`)
        );
        break;
      }
      if (!validValues.has(item)) {
        errors.push(
          createError(
            field,
            'invalid_option',
            `"${item}" is not a valid option for "${field.name}"`
          )
        );
      }
    }
  }

  return errors;
}

/**
 * Validate reference fields (links to other entities)
 */
export function validateReferenceField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  const config = field.config as { multiple?: boolean } | undefined;

  if (config?.multiple) {
    if (!Array.isArray(value)) {
      errors.push(
        createError(field, 'invalid_type', `"${field.name}" must be an array of references`)
      );
      return errors;
    }
    for (const item of value) {
      if (typeof item !== 'string') {
        errors.push(
          createError(
            field,
            'invalid_type',
            `Each reference in "${field.name}" must be a string ID`
          )
        );
        break;
      }
    }
  } else {
    if (typeof value !== 'string') {
      errors.push(
        createError(field, 'invalid_type', `"${field.name}" must be a string reference ID`)
      );
    }
  }

  return errors;
}

/**
 * Validate JSON fields
 */
export function validateJsonField(
  field: ContentFieldDefinition,
  value: unknown
): ContentValidationError[] {
  // JSON fields accept any valid JSON value (object, array, primitive)
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
    } catch {
      return [createError(field, 'invalid_format', `"${field.name}" must contain valid JSON`)];
    }
  }

  // Objects, arrays, numbers, booleans are all valid JSON
  return [];
}

/**
 * Sanitize field values by stripping unknown fields and applying defaults
 */
export function sanitizeFieldValues(
  fieldsSchema: ContentFieldDefinition[],
  fieldValues: ContentFieldValues
): ContentFieldValues {
  const sanitized: ContentFieldValues = {};
  const knownSlugs = new Set(fieldsSchema.map((f) => f.slug));

  // Only keep known fields
  for (const [key, value] of Object.entries(fieldValues)) {
    if (knownSlugs.has(key)) {
      sanitized[key] = value;
    }
  }

  // Apply defaults for missing fields
  for (const field of fieldsSchema) {
    if (
      sanitized[field.slug] === undefined &&
      field.defaultValue !== undefined &&
      field.defaultValue !== null
    ) {
      sanitized[field.slug] = field.defaultValue;
    }
  }

  return sanitized;
}

/**
 * Create a validation error object
 */
function createError(
  field: ContentFieldDefinition,
  code: ContentValidationErrorCode,
  message: string
): ContentValidationError {
  return {
    fieldSlug: field.slug,
    fieldName: field.name,
    message,
    code
  };
}
