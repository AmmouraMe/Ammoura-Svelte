# Authentication Setup Guide

How people sign in, how the server decides who they are, and how the first
platform engineer is created.

> This file used to list three seeded demo accounts and their passwords in
> plain text. Those accounts no longer exist — `scripts/seed-data.sql` stopped
> creating them in favour of the dev login panel — so the passwords documented
> nothing and were only a liability.

## Two kinds of identity

The platform carries two separate session systems, and one person can hold both
at once (the navbar accounts for that):

|               | Platform account                          | Site user                                                        |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Table         | `accounts`                                | `users` (site-scoped)                                            |
| Session table | `account_sessions`                        | `user_sessions`                                                  |
| Cookie        | `account_session`                         | `user_session`                                                   |
| Purpose       | Owns sites, manages domains, `/account/*` | Runs one site's admin, `/admin/*`                                |
| Roles         | via `site_members` (owner/admin/editor)   | `role` column (`admin`, `user`, `customer`, `platform_engineer`) |

Both work the same way: the cookie holds a random bearer token, the database
stores only its SHA-256 hash, and identity is read from the row on every
request. Nothing about who you are travels inside the cookie.

`hooks.server.ts` resolves both and puts the results on `event.locals`:

- `locals.account` — the platform account, if signed in
- `locals.currentUser` — the site user row, if signed in and `status = 'active'`
- `locals.isAdmin` — true when `currentUser.role` is `admin` or `platform_engineer`

**Read authorization from `locals`, never from a cookie.** Page loads and
endpoints that re-read and parse the cookie themselves are how the platform
previously ended up trusting a forgeable one (see migration 0101).

Because the role is re-read per request, suspending or demoting a user takes
effect on their very next request rather than whenever their cookie expires.

## Passwords

`$lib/server/password.ts` is the only place that hashes or verifies a password:
PBKDF2-SHA256, 100k iterations, 16-byte random salt, constant-time comparison.
Stored as `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`.

`verifyPassword` still accepts the older unsalted SHA-256 hex hashes present in
the `users` table, and a successful sign-in through one rewrites the row in the
new format. Nothing needs migrating by hand; users upgrade as they log in.

Do not add another hashing helper. Two route files each grew their own copy of
unsalted SHA-256 and both drifted out of sync with this module.

## Signing in

**Site users** — `POST /api/auth/login` with `{ email, password }`, or OAuth via
`/api/auth/oauth/[provider]` (Google, Facebook, GitHub, Apple, LinkedIn,
Twitter, Microsoft — see [OAUTH_SSO_SETUP.md](OAUTH_SSO_SETUP.md)). Both create
a `user_sessions` row and set the `user_session` cookie.

**Platform accounts** — `POST /api/account/login` and `/api/account/signup`,
with email verification via `/api/account/verify-email/request`.

**Logout** — `/api/auth/logout` (GET or POST) revokes both sessions server-side
and clears the cookies.

## Becoming a platform engineer

There is no seeded superuser. Set `PLATFORM_ENGINEER_EMAIL` as a secret:

```bash
wrangler secret put PLATFORM_ENGINEER_EMAIL
```

The next time a user with that email signs in — by password or OAuth — their
role is elevated to `platform_engineer` and the change is written to the
activity log. Sign up normally first, then sign in again to pick up the role.

## Local development

Start the dev server and use the **DEV** panel at the bottom-left of any page.
It posts to `/api/dev/login-as`, which offers three one-click logins:

- **new** — a fresh platform account every click, for testing onboarding
- **existing** — the stable `dev@dev.local` account, which owns one site
- **superadmin** — a `platform_engineer` site user plus a platform account

That endpoint is hard-gated on SvelteKit's `dev` flag: in any production build
it 404s regardless of environment variables or headers.

## Notes for production

- Session cookies are `httpOnly`, `sameSite=lax`, and `Secure` outside dev.
- `ENCRYPTION_KEY` must be set — it encrypts stored provider credentials (see
  [SSO_ENCRYPTION_SETUP.md](SSO_ENCRYPTION_SETUP.md)). Generate one with
  `node scripts/generate-encryption-key.js`.
- Never commit `.dev.vars`; it is gitignored. `.dev.vars.example` documents the
  keys it should contain.
