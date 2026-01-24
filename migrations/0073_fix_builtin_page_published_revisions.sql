-- Migration: 0073_fix_builtin_page_published_revisions
-- Description: Set the published_revision_id for Privacy Policy and Terms of Service pages
-- Rollback: UPDATE pages SET published_revision_id = NULL WHERE id IN ('builtin-privacy-policy-page', 'builtin-terms-of-service-page');

-- Update Privacy Policy page to link to its published revision
UPDATE pages
SET published_revision_id = 'builtin-privacy-rev-1'
WHERE id = 'builtin-privacy-policy-page' AND published_revision_id IS NULL;

-- Update Terms of Service page to link to its published revision
UPDATE pages
SET published_revision_id = 'builtin-terms-rev-1'
WHERE id = 'builtin-terms-of-service-page' AND published_revision_id IS NULL;
