import type { UserRole } from '$lib/stores/auth';

/**
 * Roles that ship a translated label. Anything outside this map falls back to
 * humanizing the stored value, so a new role never renders as a raw enum.
 */
const ROLE_KEYS: Record<UserRole, string> = {
  admin: 'role.admin',
  user: 'role.user',
  customer: 'role.customer',
  platform_engineer: 'role.platformEngineer'
};

/**
 * `platform_engineer` → `Platform Engineer`.
 *
 * CSS `text-transform: capitalize` cannot do this: it only uppercases word
 * starts, and an underscore is not a word break — so a raw role rendered with
 * `capitalize` reads "Platform_engineer".
 */
export function humanizeRole(role: string): string {
  return role
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Display label for a stored role. Pass the active translator to localize the
 * known roles; without one (or for an unknown role) it humanizes the value.
 */
export function formatRole(
  role: string | null | undefined,
  translate?: (key: string) => string
): string {
  if (!role) return '';

  const key = ROLE_KEYS[role as UserRole];
  if (key && translate) {
    const label = translate(key);
    // createTranslator returns the key itself when a message is missing.
    if (label !== key) return label;
  }

  return humanizeRole(role);
}
