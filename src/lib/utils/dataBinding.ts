/**
 * Data binding utilities for CMS content
 * Resolves {{ field.xxx }} patterns in widget configs with actual field values
 */

import type { ContentFieldValues } from '$lib/types/contentTypes.js';

/**
 * Pattern to match data binding expressions: {{ field.slug_name }}
 * Supports optional whitespace inside braces
 */
const BINDING_PATTERN = /\{\{\s*field\.(\w+)\s*\}\}/g;

/**
 * Check if a string contains data binding expressions
 */
export function hasBindings(value: string): boolean {
  // Reset lastIndex since the regex has the 'g' flag
  BINDING_PATTERN.lastIndex = 0;
  return BINDING_PATTERN.test(value);
}

/**
 * Resolve all {{ field.xxx }} bindings in a string with actual field values
 *
 * @param template - String containing {{ field.xxx }} expressions
 * @param fieldValues - Map of field slug to field value
 * @param fallback - Value to use when a field is not found (default: empty string)
 * @returns String with all bindings resolved
 */
export function resolveStringBindings(
  template: string,
  fieldValues: ContentFieldValues,
  fallback: string = ''
): string {
  BINDING_PATTERN.lastIndex = 0;
  return template.replace(BINDING_PATTERN, (_match, fieldSlug: string) => {
    const value = fieldValues[fieldSlug];
    if (value === undefined || value === null) {
      return fallback;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // Objects and arrays get JSON-serialized
    return JSON.stringify(value);
  });
}

/**
 * Recursively resolve all data bindings in an object (widget config, etc.)
 * Walks through all string values and resolves {{ field.xxx }} patterns
 *
 * @param obj - Object to resolve bindings in (not mutated — returns a new object)
 * @param fieldValues - Map of field slug to field value
 * @param fallback - Value to use when a field is not found
 * @returns New object with all bindings resolved
 */
export function resolveBindings<T>(
  obj: T,
  fieldValues: ContentFieldValues,
  fallback: string = ''
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveStringBindings(obj, fieldValues, fallback) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveBindings(item, fieldValues, fallback)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      resolved[key] = resolveBindings(value, fieldValues, fallback);
    }
    return resolved as T;
  }

  // Primitives (number, boolean) pass through unchanged
  return obj;
}

/**
 * Resolve bindings for an array of widget configs
 *
 * @param widgets - Array of widget configuration objects
 * @param fieldValues - Content entry field values
 * @returns New array with all bindings resolved
 */
export function resolveWidgetBindings<T>(widgets: T[], fieldValues: ContentFieldValues): T[] {
  return widgets.map((widget) => resolveBindings(widget, fieldValues));
}

/**
 * Extract all field slugs referenced in binding expressions within an object
 * Useful for determining which fields a template depends on
 *
 * @param obj - Object to scan for binding expressions
 * @returns Set of field slugs that are referenced
 */
export function extractReferencedFields(obj: unknown): Set<string> {
  const fields = new Set<string>();

  if (typeof obj === 'string') {
    BINDING_PATTERN.lastIndex = 0;
    let match;
    while ((match = BINDING_PATTERN.exec(obj)) !== null) {
      fields.add(match[1]);
    }
    return fields;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const itemFields = extractReferencedFields(item);
      for (const f of itemFields) {
        fields.add(f);
      }
    }
    return fields;
  }

  if (obj !== null && typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const valueFields = extractReferencedFields(value);
      for (const f of valueFields) {
        fields.add(f);
      }
    }
    return fields;
  }

  return fields;
}
