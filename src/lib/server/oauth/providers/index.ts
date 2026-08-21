/**
 * OAuth Provider Factory
 * Creates provider instances based on configuration
 */

import type { OAuthProvider } from '$lib/types/oauth.js';
import { GoogleOAuthProvider } from './google.js';
import { LinkedInOAuthProvider } from './linkedin.js';
import { AppleOAuthProvider } from './apple.js';
import { FacebookOAuthProvider } from './facebook.js';
import { GitHubOAuthProvider } from './github.js';
import { TwitterOAuthProvider } from './twitter.js';
import { MicrosoftOAuthProvider } from './microsoft.js';
import { DiscordOAuthProvider } from './discord.js';
import type { BaseOAuthProvider } from '../provider.js';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  tenant?: string; // For Microsoft
}

/**
 * Create an OAuth provider instance
 */
export function createOAuthProvider(
  provider: OAuthProvider,
  credentials: OAuthCredentials
): BaseOAuthProvider {
  const { clientId, clientSecret, tenant } = credentials;

  switch (provider) {
    case 'google':
      return new GoogleOAuthProvider(clientId, clientSecret);
    case 'linkedin':
      return new LinkedInOAuthProvider(clientId, clientSecret);
    case 'apple':
      return new AppleOAuthProvider(clientId, clientSecret);
    case 'facebook':
      return new FacebookOAuthProvider(clientId, clientSecret);
    case 'github':
      return new GitHubOAuthProvider(clientId, clientSecret);
    case 'twitter':
      return new TwitterOAuthProvider(clientId, clientSecret);
    case 'microsoft':
      return new MicrosoftOAuthProvider(clientId, clientSecret, tenant);
    case 'discord':
      return new DiscordOAuthProvider(clientId, clientSecret);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

export * from './google.js';
export * from './linkedin.js';
export * from './apple.js';
export * from './facebook.js';
export * from './github.js';
export * from './twitter.js';
export * from './microsoft.js';
export * from './discord.js';
