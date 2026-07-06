-- Platform-level accounts for tenancy (plan: Ammoura planning repo, plans/tenancy.md §2)
-- Accounts are global identities that can own/manage multiple sites.
-- Storefront customers remain in the site-scoped `users` table.

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT, -- NULL when the account is OAuth-only
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Server-side sessions. `id` stores the SHA-256 hash of the bearer token;
-- the raw token only ever lives in the httpOnly cookie.
CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_sessions_account ON account_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_sessions_expires ON account_sessions(expires_at);

-- Which accounts can manage which sites, and at what level
CREATE TABLE IF NOT EXISTS site_members (
  site_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (site_id, account_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_members_account ON site_members(account_id);
