-- Migration: 0094_content_translations
-- Description: Per-locale overlay translations for tenant content (i18n).
--   One generic table instead of per-locale content forks: the source of truth
--   stays in pages/products/etc., and translated field values overlay at
--   render time with per-field fallback to the source language.
--   Widget fields are page-scoped: entity_type='page_widget', entity_id=pageId,
--   field='<widgetId>:<configPath>' (seeded widget ids repeat across pages).
-- Rollback: DROP TABLE IF EXISTS content_translations;

CREATE TABLE IF NOT EXISTS content_translations (
  site_id     TEXT NOT NULL,
  locale      TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN
    ('page','page_widget','layout_widget','product','product_variant','content_entry','site_setting')),
  entity_id   TEXT NOT NULL,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL,
  updated_by  TEXT,
  PRIMARY KEY (site_id, locale, entity_type, entity_id, field),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) WITHOUT ROWID;

-- GC / per-entity lookups regardless of locale
CREATE INDEX IF NOT EXISTS idx_content_translations_entity
  ON content_translations(site_id, entity_type, entity_id);
