/**
 * Environment Variable OAuth Provider Detection
 *
 * Detects OAuth providers configured via environment variables.
 * Env vars follow the pattern: {PROVIDER}_OAUTH_CLIENT_ID and {PROVIDER}_OAUTH_CLIENT_SECRET
 *
 * This allows providers to be configured without database entries,
 * with DB config taking priority for site-specific overrides.
 */

import type { OAuthProvider } from '$lib/types/oauth.js';

/**
 * Map of provider names to their env var prefixes
 */
const PROVIDER_ENV_MAP: Record<OAuthProvider, string> = {
  google: 'GOOGLE',
  linkedin: 'LINKEDIN',
  apple: 'APPLE',
  facebook: 'FACEBOOK',
  github: 'GITHUB',
  twitter: 'TWITTER',
  microsoft: 'MICROSOFT',
  discord: 'DISCORD'
};

/**
 * Display defaults for providers detected from env vars
 */
const PROVIDER_DISPLAY_DEFAULTS: Record<OAuthProvider, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'Chrome' },
  linkedin: { name: 'LinkedIn', icon: 'Linkedin' },
  apple: { name: 'Apple', icon: 'Apple' },
  facebook: { name: 'Facebook', icon: 'Facebook' },
  github: { name: 'GitHub', icon: 'Github' },
  twitter: { name: 'X (Twitter)', icon: 'Twitter' },
  microsoft: { name: 'Microsoft', icon: 'Building' },
  // lucide ships no Discord brand mark; MessageCircle is the closest
  // resolvable icon and the SSO icon picker can override it per site.
  discord: { name: 'Discord', icon: 'MessageCircle' }
};

export interface EnvOAuthCredentials {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  displayName: string;
  icon: string;
}

/**
 * Get OAuth credentials for a specific provider from environment variables
 */
export function getEnvOAuthCredentials(
  env: Record<string, unknown>,
  provider: OAuthProvider
): EnvOAuthCredentials | null {
  const prefix = PROVIDER_ENV_MAP[provider];
  if (!prefix) {
    return null;
  }

  const clientId = env[`${prefix}_OAUTH_CLIENT_ID`];
  const clientSecret = env[`${prefix}_OAUTH_CLIENT_SECRET`];

  if (
    typeof clientId === 'string' &&
    clientId.trim() !== '' &&
    typeof clientSecret === 'string' &&
    clientSecret.trim() !== ''
  ) {
    const defaults = PROVIDER_DISPLAY_DEFAULTS[provider];
    return {
      provider,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      displayName: defaults.name,
      icon: defaults.icon
    };
  }

  return null;
}

/**
 * Detect all OAuth providers configured via environment variables
 */
export function getEnvOAuthProviders(env: Record<string, unknown>): EnvOAuthCredentials[] {
  const providers: EnvOAuthCredentials[] = [];

  for (const provider of Object.keys(PROVIDER_ENV_MAP) as OAuthProvider[]) {
    const creds = getEnvOAuthCredentials(env, provider);
    if (creds) {
      providers.push(creds);
    }
  }

  return providers;
}
