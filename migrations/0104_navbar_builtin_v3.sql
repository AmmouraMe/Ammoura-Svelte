-- Bring the seeded Navigation Bar up to builtin v3 (childless).
--
-- componentDefaults.ts calls its v3 navbar config "the SINGLE SOURCE OF TRUTH",
-- and CURRENT_BUILTIN_VERSION has been 3 since July, but nothing ever wrote it
-- to a database. The pre-v3 seed (migrations 0032-0080) is still what every new
-- site gets, and v3 only ever arrives if an admin calls
-- POST /api/admin/seed-builtins by hand -- which nothing does automatically.
--
-- The pre-v3 navbar is a tree of containers. A navbar WITH children falls into
-- the generic container path in FrontendComponentRenderer instead of rendering
-- the NavBar builtin, and that path had no hamburger, so on mobile the seeded
-- navbar stacks logo + Products + Pricing + Login + Cart + theme toggle into a
-- full-height vertical wall that pushes the page content off screen.
--
-- Childless config restores the NavBar builtin, which owns the hamburger, the
-- mobile menu, cart/auth/account and the theme toggle natively.
--
-- Scope: only rows still carrying the pre-v3 seed, identified by the
-- 'nav-links-container' child id that only the seed produces. A navbar built
-- from scratch in the builder uses generated ids and is left alone.

UPDATE components
SET
  config = '{"logo":{"text":"${site.name}","url":"/","image":"","imageHeight":40},"logoPosition":"left","links":[{"text":"Products","url":"/#products"},{"text":"Pricing","url":"/#pricing"}],"linksPosition":"center","actionsPosition":"right","showSearch":false,"showCart":true,"showAuth":true,"showAccountMenu":true,"showThemeToggle":true,"showLanguageSwitcher":false,"sticky":false,"visibilityRule":"always"}',
  updated_at = CURRENT_TIMESTAMP
WHERE type = 'navbar'
  AND config LIKE '%nav-links-container%';
