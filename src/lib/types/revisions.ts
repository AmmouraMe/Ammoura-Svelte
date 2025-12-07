/**
 * Generic revision types for tracking changes across multiple entity types
 */

export type EntityType = 'page' | 'product' | 'category' | 'theme' | 'site' | 'component';

/**
 * Component revision data structure - stores the full component state
 */
export interface ComponentRevisionData {
  name: string;
  description?: string;
  type: string;
  config: Record<string, unknown>;
  children?: ComponentChildData[];
}

/**
 * Child widget data for component revisions
 */
export interface ComponentChildData {
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  children?: ComponentChildData[];
}

/**
 * Generic revision record from database
 */
export interface Revision {
  id: string;
  site_id: string;
  entity_type: EntityType;
  entity_id: string;
  revision_hash: string;
  parent_revision_id?: string;
  data: string; // JSON snapshot
  user_id?: string;
  created_at: number;
  is_current: boolean;
  message?: string;
}

/**
 * Parsed revision with typed data
 */
export interface ParsedRevision<T = unknown> extends Omit<Revision, 'data'> {
  data: T;
}

/**
 * Revision node for building history tree
 */
export interface RevisionNode<T = unknown> extends ParsedRevision<T> {
  children: RevisionNode<T>[];
  depth: number;
  branch: number;
}

/**
 * Data for creating a new revision
 */
export interface CreateRevisionInput<T = unknown> {
  entity_type: EntityType;
  entity_id: string;
  data: T;
  user_id?: string;
  message?: string;
  parent_revision_id?: string;
}

/**
 * Options for querying revisions
 */
export interface GetRevisionsOptions {
  limit?: number;
  offset?: number;
  include_current_only?: boolean;
}

/**
 * Revision metadata for list views
 */
export interface RevisionMetadata {
  id: string;
  revision_hash: string;
  created_at: number;
  user_id?: string;
  message?: string;
  is_current: boolean;
  parent_revision_id?: string;
}
