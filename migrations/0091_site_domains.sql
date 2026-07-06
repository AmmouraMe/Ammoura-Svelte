-- Multi-domain support per site (tenancy plan T2, Ammoura planning repo plans/tenancy.md §2.2)
-- Replaces reliance on the single sites.domain column. sites.domain is kept
-- (still NOT NULL/UNIQUE) and mirrors the primary hostname for now; it will be
-- dropped once all reads go through site_domains.

ALTER TABLE sites ADD COLUMN slug TEXT;

-- Backfill slugs from ids (ids are unique; slugs can be renamed later)
UPDATE sites SET slug = lower(id) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_domains (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('platform', 'custom')),
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_dns'
    CHECK (status IN ('pending_dns', 'pending_validation', 'active', 'error', 'removed')),
  cf_custom_hostname_id TEXT, -- Cloudflare for SaaS custom hostname id (kind='custom')
  verification TEXT,          -- JSON: expected DNS records, validation tokens, last error
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_domains_site ON site_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_site_domains_status ON site_domains(status);

-- Backfill: every existing site domain becomes an active custom hostname
INSERT OR IGNORE INTO site_domains (id, site_id, hostname, kind, is_primary, status, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, lower(domain), 'custom', 1, 'active',
       strftime('%s', 'now'), strftime('%s', 'now')
FROM sites
WHERE domain IS NOT NULL AND domain != '';
