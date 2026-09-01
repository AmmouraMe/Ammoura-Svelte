-- Allow 'discord' as an OAuth provider.
--
-- Three tables pin the provider list in a CHECK constraint, and SQLite cannot
-- alter one in place, so each is rebuilt: create alongside, copy, drop, rename,
-- recreate indexes. Dropping a table drops its indexes with it.
--
-- Column lists are explicit rather than SELECT *, so a future column added to
-- one of these tables makes this migration fail loudly instead of silently
-- shifting data into the wrong column.

-- 1. provider_accounts -------------------------------------------------------
CREATE TABLE provider_accounts_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'linkedin', 'apple', 'facebook', 'github', 'twitter', 'microsoft', 'discord')),
  provider_account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER,
  scope TEXT,
  id_token TEXT,
  profile_data TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, provider, provider_account_id)
);

INSERT INTO provider_accounts_new (
  id, user_id, site_id, provider, provider_account_id, email, access_token,
  refresh_token, token_expires_at, scope, id_token, profile_data, created_at,
  updated_at, last_used_at
)
SELECT
  id, user_id, site_id, provider, provider_account_id, email, access_token,
  refresh_token, token_expires_at, scope, id_token, profile_data, created_at,
  updated_at, last_used_at
FROM provider_accounts;

DROP TABLE provider_accounts;
ALTER TABLE provider_accounts_new RENAME TO provider_accounts;

CREATE INDEX IF NOT EXISTS idx_provider_accounts_user ON provider_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_site_provider ON provider_accounts(site_id, provider);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_email ON provider_accounts(site_id, email);

-- 2. oauth_sessions ----------------------------------------------------------
CREATE TABLE oauth_sessions_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  state TEXT UNIQUE NOT NULL,
  code_verifier TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  nonce TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'linkedin', 'apple', 'facebook', 'github', 'twitter', 'microsoft', 'discord')),
  redirect_uri TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

INSERT INTO oauth_sessions_new (
  id, site_id, state, code_verifier, code_challenge, nonce, provider,
  redirect_uri, created_at, expires_at
)
SELECT
  id, site_id, state, code_verifier, code_challenge, nonce, provider,
  redirect_uri, created_at, expires_at
FROM oauth_sessions;

DROP TABLE oauth_sessions;
ALTER TABLE oauth_sessions_new RENAME TO oauth_sessions;

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at);

-- 3. sso_providers -----------------------------------------------------------
CREATE TABLE sso_providers_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'linkedin', 'apple', 'facebook', 'github', 'twitter', 'microsoft', 'discord')),
  enabled INTEGER NOT NULL DEFAULT 0,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  tenant TEXT,
  display_name TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, provider)
);

INSERT INTO sso_providers_new (
  id, site_id, provider, enabled, client_id, client_secret, tenant,
  display_name, icon, sort_order, created_at, updated_at
)
SELECT
  id, site_id, provider, enabled, client_id, client_secret, tenant,
  display_name, icon, sort_order, created_at, updated_at
FROM sso_providers;

DROP TABLE sso_providers;
ALTER TABLE sso_providers_new RENAME TO sso_providers;

CREATE INDEX IF NOT EXISTS idx_sso_providers_site ON sso_providers(site_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_enabled ON sso_providers(site_id, enabled);
