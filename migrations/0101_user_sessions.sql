-- Migration 0101: server-side sessions for the site-scoped `users` table.
--
-- Until now the admin/staff login stored the whole user record — including
-- `role` — as plain JSON in the `user_session` cookie, and every reader simply
-- JSON.parsed it and believed what it said. `httpOnly` stops a script reading
-- the cookie; it does nothing to stop a client SENDING one, so anybody could
-- hand-craft `user_session={"id":"…","role":"platform_engineer"}` and take
-- over the admin panel and the whole `/api/admin/*` surface on any tenant.
-- The sibling `admin_session=authenticated` cookie was a fixed, guessable
-- string with the same effect.
--
-- This mirrors what `account_sessions` (migration 0090) already does for
-- platform accounts: the cookie carries an opaque random bearer token, the
-- database stores only its SHA-256 hash, and identity/role are read from the
-- `users` row on every request. A leaked database dump therefore cannot be
-- replayed as live sessions, and demoting or deactivating a user takes effect
-- immediately instead of waiting out a 7-day cookie.
--
-- Existing `user_session` cookies do not verify against this table, so every
-- currently signed-in admin is logged out once and must sign in again. That is
-- the intended consequence of retiring a forgeable credential.
--
-- Rollback:
--   DROP TABLE user_sessions;

CREATE TABLE IF NOT EXISTS user_sessions (
  -- SHA-256 hex of the bearer token held by the browser; never the token itself
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
