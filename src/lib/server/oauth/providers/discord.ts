/**
 * Discord OAuth 2.0 Provider
 */

import { BaseOAuthProvider } from '../provider.js';
import type { OAuthProviderConfig, OAuthUserProfile } from '$lib/types/oauth.js';

const CDN_BASE = 'https://cdn.discordapp.com';

export class DiscordOAuthProvider extends BaseOAuthProvider {
  constructor(clientId: string, clientSecret: string) {
    const config: OAuthProviderConfig = {
      name: 'discord',
      displayName: 'Discord',
      icon: '💬',
      clientId,
      clientSecret,
      authorizationUrl: 'https://discord.com/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      userInfoUrl: 'https://discord.com/api/users/@me',
      // `identify` gets the account, `email` adds the address we link on.
      scopes: ['identify', 'email'],
      pkceRequired: true,
      supportsRefresh: true
    };
    super(config);
  }

  protected normalizeUserProfile(data: Record<string, unknown>): OAuthUserProfile {
    const id = String(data.id || '');

    return {
      id,
      email: String(data.email || ''),
      // global_name is the current display name; username is the legacy handle
      // and is still what older accounts carry.
      name: String(data.global_name || data.username || ''),
      picture: buildAvatarUrl(id, data.avatar),
      // Discord's `verified` is about the email address, which is what account
      // linking cares about — not about paid verification.
      email_verified: Boolean(data.verified)
    };
  }
}

/**
 * Discord returns an avatar *hash*, not a URL, and animated avatars are only
 * served as .gif — a .png request for one returns 404.
 */
function buildAvatarUrl(id: string, avatar: unknown): string {
  if (!id || typeof avatar !== 'string' || avatar === '') {
    return '';
  }
  const extension = avatar.startsWith('a_') ? 'gif' : 'png';
  return `${CDN_BASE}/avatars/${id}/${avatar}.${extension}`;
}
