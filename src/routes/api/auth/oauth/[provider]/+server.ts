/**
 * OAuth initiation endpoint
 * Starts the OAuth flow for a given provider
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db';
import { createOAuthProvider } from '$lib/server/oauth/providers/index.js';
import { createOAuthSession, createAuthAuditLog } from '$lib/server/db/oauth.js';
import { getSSOProvider } from '$lib/server/db/sso-providers.js';
import { getEnvOAuthCredentials } from '$lib/server/oauth/env-providers.js';
import type { OAuthProvider } from '$lib/types/oauth.js';

const VALID_PROVIDERS: OAuthProvider[] = [
  'google',
  'linkedin',
  'apple',
  'facebook',
  'github',
  'twitter',
  'microsoft'
];

/**
 * GET /api/auth/oauth/[provider]
 * Initiates OAuth flow and redirects to provider
 */
export const GET: RequestHandler = async ({ params, url, platform, locals, request }) => {
  const provider = params.provider as OAuthProvider;

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid OAuth provider: ${provider}`);
  }

  const db = getDB(platform);
  const siteId = locals.siteId;
  const encryptionKey = platform?.env.ENCRYPTION_KEY;

  let clientId: string;
  let clientSecret: string;
  let tenant: string | undefined;

  // Try database first (site-specific config)
  if (encryptionKey) {
    const ssoProvider = await getSSOProvider(db, siteId, provider, encryptionKey);
    if (ssoProvider && ssoProvider.enabled) {
      clientId = ssoProvider.client_id;
      clientSecret = ssoProvider.client_secret;
      tenant = ssoProvider.tenant || undefined;
    } else {
      // Fall back to environment variables
      const envCreds = getEnvOAuthCredentials(
        platform?.env as unknown as Record<string, unknown>,
        provider
      );
      if (!envCreds) {
        throw new Error(`OAuth provider ${provider} not configured for this site`);
      }
      clientId = envCreds.clientId;
      clientSecret = envCreds.clientSecret;
    }
  } else {
    // No encryption key - try env vars directly
    const envCreds = getEnvOAuthCredentials(
      platform?.env as unknown as Record<string, unknown>,
      provider
    );
    if (!envCreds) {
      throw new Error(`OAuth provider ${provider} not configured (no encryption key or env vars)`);
    }
    clientId = envCreds.clientId;
    clientSecret = envCreds.clientSecret;
  }

  try {
    // Create provider instance
    const oauthProvider = createOAuthProvider(provider, { clientId, clientSecret, tenant });

    // Generate authorization URL with PKCE
    const baseUrl = url.origin;
    const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`;
    const authParams = await oauthProvider.getAuthorizationUrl(redirectUri);

    // Store OAuth session in database
    await createOAuthSession(db, siteId, provider, {
      state: authParams.state,
      code_verifier: authParams.codeVerifier,
      code_challenge: authParams.codeChallenge,
      nonce: authParams.nonce,
      redirect_uri: redirectUri
    });

    // Log SSO initiation
    await createAuthAuditLog(db, siteId, {
      event_type: 'sso_initiated',
      provider,
      ip_address:
        request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      details: { redirect_uri: redirectUri }
    });

    // Redirect to OAuth provider (this throws to perform the redirect)
    throw redirect(302, authParams.authUrl);
  } catch (error) {
    // Re-throw redirects (SvelteKit uses throw for control flow)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      throw error;
    }

    console.error(`OAuth initiation error for ${provider}:`, error);

    // Log failure
    await createAuthAuditLog(db, siteId, {
      event_type: 'sso_failed',
      provider,
      ip_address:
        request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      details: { error: String(error) }
    });

    // Redirect to login with error
    throw redirect(302, `/auth/login?error=oauth_init_failed&provider=${provider}`);
  }
};
