-- Migration: 0095_user_locale
-- Description: Per-admin-user interface language preference (i18n).
--   NULL = follow the normal visitor resolution (site default / browser).
-- Rollback: SQLite cannot drop columns before 3.35; recreate table if needed.

ALTER TABLE users ADD COLUMN locale TEXT;
