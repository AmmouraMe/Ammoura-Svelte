/**
 * Content Management System type definitions
 * Defines content types, field schemas, entries, and templates
 */

// ============================================================================
// Field Type System
// ============================================================================

/**
 * All supported field types for content type schemas
 */
export type ContentFieldType =
  | 'text'
  | 'textarea'
  | 'rich_text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'tel'
  | 'media'
  | 'selection'
  | 'multi_selection'
  | 'reference'
  | 'json';

/**
 * Configuration options specific to each field type
 */
export interface TextFieldConfig {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces?: number;
}

export interface SelectionFieldConfig {
  options: Array<{ label: string; value: string }>;
  allowCustom?: boolean;
}

export interface MediaFieldConfig {
  allowedTypes?: Array<'image' | 'video' | 'audio' | 'document'>;
  maxFileSize?: number;
  multiple?: boolean;
}

export interface ReferenceFieldConfig {
  targetType: 'content_entry' | 'product' | 'page';
  targetContentTypeId?: string;
  multiple?: boolean;
}

export interface JsonFieldConfig {
  schema?: Record<string, unknown>;
}

export interface DateFieldConfig {
  minDate?: string;
  maxDate?: string;
}

/**
 * Union type for all field-type-specific configuration
 */
export type ContentFieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | SelectionFieldConfig
  | MediaFieldConfig
  | ReferenceFieldConfig
  | JsonFieldConfig
  | DateFieldConfig;

/**
 * Definition of a single field within a content type's schema
 */
export interface ContentFieldDefinition {
  slug: string;
  name: string;
  type: ContentFieldType;
  required: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
  position: number;
  config?: ContentFieldConfig;
}

// ============================================================================
// Content Type
// ============================================================================

/**
 * Status of a content type
 */
export type ContentTypeStatus = 'active' | 'archived';

/**
 * Database row representation of a content type
 */
export interface DBContentType {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  description: string | null;
  base_path: string;
  icon: string | null;
  fields_schema: string; // JSON string of ContentFieldDefinition[]
  listing_page_id: string | null;
  entry_template_page_id: string | null;
  status: ContentTypeStatus;
  created_at: number;
  updated_at: number;
}

/**
 * Parsed content type with typed fields_schema
 */
export interface ContentType {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  description: string | null;
  basePath: string;
  icon: string | null;
  fieldsSchema: ContentFieldDefinition[];
  listingPageId: string | null;
  entryTemplatePageId: string | null;
  status: ContentTypeStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Data required to create a new content type
 */
export interface CreateContentTypeData {
  name: string;
  slug: string;
  description?: string;
  basePath: string;
  icon?: string;
  fieldsSchema: ContentFieldDefinition[];
}

/**
 * Data for updating an existing content type
 */
export interface UpdateContentTypeData {
  name?: string;
  slug?: string;
  description?: string | null;
  basePath?: string;
  icon?: string | null;
  fieldsSchema?: ContentFieldDefinition[];
  status?: ContentTypeStatus;
  listingPageId?: string | null;
  entryTemplatePageId?: string | null;
}

// ============================================================================
// Content Entry
// ============================================================================

/**
 * Status of a content entry
 */
export type ContentEntryStatus = 'draft' | 'published' | 'archived';

/**
 * Field values map: keyed by field slug, values are typed according to field type
 */
export type ContentFieldValues = Record<string, unknown>;

/**
 * Database row representation of a content entry
 */
export interface DBContentEntry {
  id: string;
  site_id: string;
  content_type_id: string;
  title: string;
  slug: string;
  field_values: string; // JSON string of ContentFieldValues
  page_id: string | null;
  status: ContentEntryStatus;
  published_at: number | null;
  author_id: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

/**
 * Parsed content entry with typed field values
 */
export interface ContentEntry {
  id: string;
  siteId: string;
  contentTypeId: string;
  title: string;
  slug: string;
  fieldValues: ContentFieldValues;
  pageId: string | null;
  status: ContentEntryStatus;
  publishedAt: number | null;
  authorId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Data required to create a new content entry
 */
export interface CreateContentEntryData {
  contentTypeId: string;
  title: string;
  slug: string;
  fieldValues: ContentFieldValues;
  pageId?: string;
  status?: ContentEntryStatus;
  authorId?: string;
  sortOrder?: number;
}

/**
 * Data for updating an existing content entry
 */
export interface UpdateContentEntryData {
  title?: string;
  slug?: string;
  fieldValues?: ContentFieldValues;
  pageId?: string | null;
  status?: ContentEntryStatus;
  authorId?: string | null;
  sortOrder?: number;
}

// ============================================================================
// Content Entry Tags
// ============================================================================

/**
 * Database row representation of a content entry tag
 */
export interface DBContentEntryTag {
  id: string;
  site_id: string;
  content_type_id: string;
  entry_id: string;
  tag_name: string;
  tag_category: string;
  created_at: number;
}

/**
 * Parsed content entry tag
 */
export interface ContentEntryTag {
  id: string;
  siteId: string;
  contentTypeId: string;
  entryId: string;
  tagName: string;
  tagCategory: string;
  createdAt: number;
}

/**
 * Data for setting tags on an entry
 */
export interface ContentTagData {
  tagName: string;
  tagCategory?: string;
}

// ============================================================================
// Query Options
// ============================================================================

/**
 * Options for querying content entries
 */
export interface ContentEntryQueryOptions {
  status?: ContentEntryStatus;
  tagName?: string;
  tagCategory?: string;
  authorId?: string;
  sortBy?: 'created_at' | 'updated_at' | 'published_at' | 'sort_order' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  search?: string;
}

// ============================================================================
// Content Type Templates
// ============================================================================

/**
 * Pre-built template for quickly creating common content types
 */
export interface ContentTypeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  basePath: string;
  fieldsSchema: ContentFieldDefinition[];
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of validating field values against a schema
 */
export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationError[];
}

/**
 * Individual validation error for a specific field
 */
export interface ContentValidationError {
  fieldSlug: string;
  fieldName: string;
  message: string;
  code: ContentValidationErrorCode;
}

/**
 * Validation error codes
 */
export type ContentValidationErrorCode =
  | 'required'
  | 'invalid_type'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'invalid_format'
  | 'invalid_option'
  | 'invalid_reference'
  | 'invalid_media_type'
  | 'unknown_field';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a DBContentType row to a ContentType
 */
export function parseContentType(row: DBContentType): ContentType {
  return {
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePath: row.base_path,
    icon: row.icon,
    fieldsSchema: JSON.parse(row.fields_schema) as ContentFieldDefinition[],
    listingPageId: row.listing_page_id,
    entryTemplatePageId: row.entry_template_page_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert a DBContentEntry row to a ContentEntry
 */
export function parseContentEntry(row: DBContentEntry): ContentEntry {
  return {
    id: row.id,
    siteId: row.site_id,
    contentTypeId: row.content_type_id,
    title: row.title,
    slug: row.slug,
    fieldValues: JSON.parse(row.field_values) as ContentFieldValues,
    pageId: row.page_id,
    status: row.status,
    publishedAt: row.published_at,
    authorId: row.author_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert a DBContentEntryTag row to a ContentEntryTag
 */
export function parseContentEntryTag(row: DBContentEntryTag): ContentEntryTag {
  return {
    id: row.id,
    siteId: row.site_id,
    contentTypeId: row.content_type_id,
    entryId: row.entry_id,
    tagName: row.tag_name,
    tagCategory: row.tag_category,
    createdAt: row.created_at
  };
}
