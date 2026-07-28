/**
 * Per-locale overlay translations for tenant content (content_translations,
 * migration 0094). The source of truth stays in pages/products/settings; when
 * a visitor's locale differs from the site default, translated field values
 * overlay at render time with per-field fallback to the source text.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { setConfigValueByPath } from '$lib/i18n/translatable';
import type { GeneralSettings } from '../db/site-settings.js';

export type ContentEntityType =
  | 'page'
  | 'page_widget'
  | 'layout_widget'
  | 'product'
  | 'product_variant'
  | 'content_entry'
  | 'site_setting';

/** field → translated value */
export type TranslationMap = Map<string, string>;

export async function getEntityTranslations(
  db: D1Database,
  siteId: string,
  locale: string,
  entityType: ContentEntityType,
  entityId: string
): Promise<TranslationMap> {
  const result = await db
    .prepare(
      `SELECT field, value FROM content_translations
       WHERE site_id = ? AND locale = ? AND entity_type = ? AND entity_id = ?`
    )
    .bind(siteId, locale, entityType, entityId)
    .all<{ field: string; value: string }>();

  return new Map((result.results ?? []).map((r) => [r.field, r.value]));
}

/** Chunked batch lookup (D1 caps bound parameters; stay well under). */
export async function getEntityTranslationsBatch(
  db: D1Database,
  siteId: string,
  locale: string,
  entityType: ContentEntityType,
  entityIds: string[]
): Promise<Map<string, TranslationMap>> {
  const out = new Map<string, TranslationMap>();
  const CHUNK = 50;
  for (let i = 0; i < entityIds.length; i += CHUNK) {
    const chunk = entityIds.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '?').join(',');
    const result = await db
      .prepare(
        `SELECT entity_id, field, value FROM content_translations
         WHERE site_id = ? AND locale = ? AND entity_type = ? AND entity_id IN (${placeholders})`
      )
      .bind(siteId, locale, entityType, ...chunk)
      .all<{ entity_id: string; field: string; value: string }>();

    for (const row of result.results ?? []) {
      let map = out.get(row.entity_id);
      if (!map) {
        map = new Map();
        out.set(row.entity_id, map);
      }
      map.set(row.field, row.value);
    }
  }
  return out;
}

/**
 * Upsert translations for one entity. Empty/null values delete the row so the
 * field falls back to the source language.
 */
export async function upsertEntityTranslations(
  db: D1Database,
  siteId: string,
  locale: string,
  entityType: ContentEntityType,
  entityId: string,
  entries: Record<string, string | null>,
  updatedBy?: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const statements = [];

  for (const [field, value] of Object.entries(entries)) {
    if (value === null || value.trim() === '') {
      statements.push(
        db
          .prepare(
            `DELETE FROM content_translations
             WHERE site_id = ? AND locale = ? AND entity_type = ? AND entity_id = ? AND field = ?`
          )
          .bind(siteId, locale, entityType, entityId, field)
      );
    } else {
      statements.push(
        db
          .prepare(
            `INSERT INTO content_translations
               (site_id, locale, entity_type, entity_id, field, value, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(site_id, locale, entity_type, entity_id, field)
             DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at,
                           updated_by = excluded.updated_by`
          )
          .bind(siteId, locale, entityType, entityId, field, value, now, updatedBy ?? null)
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

/** GC: remove all translations for an entity (call from delete paths). */
export async function deleteTranslationsForEntity(
  db: D1Database,
  siteId: string,
  entityType: ContentEntityType,
  entityId: string
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM content_translations
       WHERE site_id = ? AND entity_type = ? AND entity_id = ?`
    )
    .bind(siteId, entityType, entityId)
    .run();
}

/** Count translated fields per entity for the admin index (one locale). */
export async function countTranslationsForLocale(
  db: D1Database,
  siteId: string,
  locale: string,
  entityType: ContentEntityType
): Promise<Map<string, number>> {
  const result = await db
    .prepare(
      `SELECT entity_id, COUNT(*) as n FROM content_translations
       WHERE site_id = ? AND locale = ? AND entity_type = ?
       GROUP BY entity_id`
    )
    .bind(siteId, locale, entityType)
    .all<{ entity_id: string; n: number }>();
  return new Map((result.results ?? []).map((r) => [r.entity_id, r.n]));
}

interface WidgetLike {
  id?: string;
  config?: Record<string, unknown> & { children?: WidgetLike[] };
}

function applyWidgetTranslations(widgets: WidgetLike[], translations: TranslationMap): void {
  for (const widget of widgets) {
    if (!widget || typeof widget !== 'object') continue;
    const config = widget.config;
    if (widget.id && config && typeof config === 'object') {
      for (const [field, value] of translations) {
        const sep = field.indexOf(':');
        if (sep > 0 && field.slice(0, sep) === widget.id) {
          setConfigValueByPath(config, field.slice(sep + 1), value);
        }
      }
      if (Array.isArray(config.children)) {
        applyWidgetTranslations(config.children, translations);
      }
    }
  }
}

/**
 * Overlay a page's widget tree with translations for `locale`. No-ops (and
 * returns the input untranslated) for the site's default locale.
 */
export async function translateComponents<T>(
  db: D1Database,
  siteId: string,
  locale: string,
  defaultLocale: string,
  pageId: string,
  components: T[]
): Promise<T[]> {
  if (!locale || locale === defaultLocale || components.length === 0) {
    return components;
  }

  const translations = await getEntityTranslations(db, siteId, locale, 'page_widget', pageId);
  if (translations.size === 0) {
    return components;
  }

  const cloned = structuredClone(components) as unknown as WidgetLike[];
  applyWidgetTranslations(cloned, translations);
  return cloned as unknown as T[];
}

/** Overlay product name/description for a list of products. */
export async function translateProducts<T extends { id: string }>(
  db: D1Database,
  siteId: string,
  locale: string,
  defaultLocale: string,
  products: T[]
): Promise<T[]> {
  if (!locale || locale === defaultLocale || products.length === 0) {
    return products;
  }

  const byProduct = await getEntityTranslationsBatch(
    db,
    siteId,
    locale,
    'product',
    products.map((p) => p.id)
  );
  if (byProduct.size === 0) {
    return products;
  }

  return products.map((product) => {
    const translations = byProduct.get(product.id);
    if (!translations) return product;
    const copy = { ...product } as Record<string, unknown>;
    for (const field of ['name', 'description'] as const) {
      const value = translations.get(field);
      if (value && typeof copy[field] === 'string') {
        copy[field] = value;
      }
    }
    return copy as T;
  });
}

/**
 * Overlay translatable general settings (store name, tagline, description) so
 * `${site.name}` template substitution emits localized values.
 */
export async function translateGeneralSettings(
  db: D1Database,
  siteId: string,
  locale: string,
  defaultLocale: string,
  settings: GeneralSettings
): Promise<GeneralSettings> {
  if (!locale || locale === defaultLocale) {
    return settings;
  }

  const translations = await getEntityTranslations(db, siteId, locale, 'site_setting', 'general');
  if (translations.size === 0) {
    return settings;
  }

  const copy = { ...settings };
  const storeName = translations.get('general_store_name');
  if (storeName) copy.storeName = storeName;
  const tagline = translations.get('general_tagline');
  if (tagline) copy.tagline = tagline;
  const description = translations.get('general_description');
  if (description) copy.description = description;
  return copy;
}
