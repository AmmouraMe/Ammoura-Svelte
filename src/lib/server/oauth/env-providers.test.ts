/**
 * Tests for Environment Variable OAuth Provider Detection
 */

import { describe, it, expect } from 'vitest';
import { getEnvOAuthCredentials, getEnvOAuthProviders } from './env-providers';

describe('Environment Variable OAuth Providers', () => {
  describe('getEnvOAuthCredentials', () => {
    it('should return credentials when both client ID and secret are present', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'test-client-id',
        GITHUB_OAUTH_CLIENT_SECRET: 'test-client-secret'
      };

      const result = getEnvOAuthCredentials(env, 'github');

      expect(result).toEqual({
        provider: 'github',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        displayName: 'GitHub',
        icon: 'Github'
      });
    });

    it('should return null when client ID is missing', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_SECRET: 'test-client-secret'
      };

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when client secret is missing', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'test-client-id'
      };

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when both are missing', () => {
      const env = {};

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when client ID is empty string', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: '',
        GITHUB_OAUTH_CLIENT_SECRET: 'test-client-secret'
      };

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when client ID is whitespace only', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: '   ',
        GITHUB_OAUTH_CLIENT_SECRET: 'test-client-secret'
      };

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when client secret is empty string', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'test-client-id',
        GITHUB_OAUTH_CLIENT_SECRET: ''
      };

      const result = getEnvOAuthCredentials(env, 'github');
      expect(result).toBeNull();
    });

    it('should return null when values are not strings', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 123,
        GITHUB_OAUTH_CLIENT_SECRET: true
      };

      const result = getEnvOAuthCredentials(env as unknown as Record<string, unknown>, 'github');
      expect(result).toBeNull();
    });

    it('should trim whitespace from values', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: '  trimmed-id  ',
        GITHUB_OAUTH_CLIENT_SECRET: '  trimmed-secret  '
      };

      const result = getEnvOAuthCredentials(env, 'github');

      expect(result).not.toBeNull();
      expect(result!.clientId).toBe('trimmed-id');
      expect(result!.clientSecret).toBe('trimmed-secret');
    });

    it('should detect Google OAuth credentials', () => {
      const env = {
        GOOGLE_OAUTH_CLIENT_ID: 'google-id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret'
      };

      const result = getEnvOAuthCredentials(env, 'google');

      expect(result).toEqual({
        provider: 'google',
        clientId: 'google-id',
        clientSecret: 'google-secret',
        displayName: 'Google',
        icon: 'Chrome'
      });
    });

    it('should detect Microsoft OAuth credentials', () => {
      const env = {
        MICROSOFT_OAUTH_CLIENT_ID: 'ms-id',
        MICROSOFT_OAUTH_CLIENT_SECRET: 'ms-secret'
      };

      const result = getEnvOAuthCredentials(env, 'microsoft');

      expect(result).toEqual({
        provider: 'microsoft',
        clientId: 'ms-id',
        clientSecret: 'ms-secret',
        displayName: 'Microsoft',
        icon: 'Building'
      });
    });

    it('should detect LinkedIn OAuth credentials', () => {
      const env = {
        LINKEDIN_OAUTH_CLIENT_ID: 'li-id',
        LINKEDIN_OAUTH_CLIENT_SECRET: 'li-secret'
      };

      const result = getEnvOAuthCredentials(env, 'linkedin');

      expect(result).toEqual({
        provider: 'linkedin',
        clientId: 'li-id',
        clientSecret: 'li-secret',
        displayName: 'LinkedIn',
        icon: 'Linkedin'
      });
    });

    it('should detect Apple OAuth credentials', () => {
      const env = {
        APPLE_OAUTH_CLIENT_ID: 'apple-id',
        APPLE_OAUTH_CLIENT_SECRET: 'apple-secret'
      };

      const result = getEnvOAuthCredentials(env, 'apple');

      expect(result).toEqual({
        provider: 'apple',
        clientId: 'apple-id',
        clientSecret: 'apple-secret',
        displayName: 'Apple',
        icon: 'Apple'
      });
    });

    it('should detect Facebook OAuth credentials', () => {
      const env = {
        FACEBOOK_OAUTH_CLIENT_ID: 'fb-id',
        FACEBOOK_OAUTH_CLIENT_SECRET: 'fb-secret'
      };

      const result = getEnvOAuthCredentials(env, 'facebook');

      expect(result).toEqual({
        provider: 'facebook',
        clientId: 'fb-id',
        clientSecret: 'fb-secret',
        displayName: 'Facebook',
        icon: 'Facebook'
      });
    });

    it('should detect Twitter OAuth credentials', () => {
      const env = {
        TWITTER_OAUTH_CLIENT_ID: 'tw-id',
        TWITTER_OAUTH_CLIENT_SECRET: 'tw-secret'
      };

      const result = getEnvOAuthCredentials(env, 'twitter');

      expect(result).toEqual({
        provider: 'twitter',
        clientId: 'tw-id',
        clientSecret: 'tw-secret',
        displayName: 'X (Twitter)',
        icon: 'Twitter'
      });
    });
  });

  describe('getEnvOAuthProviders', () => {
    it('should return empty array when no OAuth env vars are set', () => {
      const env = {
        OTHER_VAR: 'value'
      };

      const result = getEnvOAuthProviders(env);
      expect(result).toEqual([]);
    });

    it('should detect a single provider', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'gh-id',
        GITHUB_OAUTH_CLIENT_SECRET: 'gh-secret'
      };

      const result = getEnvOAuthProviders(env);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('github');
    });

    it('should detect multiple providers', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'gh-id',
        GITHUB_OAUTH_CLIENT_SECRET: 'gh-secret',
        GOOGLE_OAUTH_CLIENT_ID: 'google-id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret'
      };

      const result = getEnvOAuthProviders(env);

      expect(result).toHaveLength(2);
      const providers = result.map((r) => r.provider);
      expect(providers).toContain('github');
      expect(providers).toContain('google');
    });

    it('should skip providers with incomplete credentials', () => {
      const env = {
        GITHUB_OAUTH_CLIENT_ID: 'gh-id',
        GITHUB_OAUTH_CLIENT_SECRET: 'gh-secret',
        GOOGLE_OAUTH_CLIENT_ID: 'google-id'
        // Missing GOOGLE_OAUTH_CLIENT_SECRET
      };

      const result = getEnvOAuthProviders(env);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('github');
    });

    it('should detect all seven supported providers', () => {
      const env = {
        GOOGLE_OAUTH_CLIENT_ID: 'id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
        LINKEDIN_OAUTH_CLIENT_ID: 'id',
        LINKEDIN_OAUTH_CLIENT_SECRET: 'secret',
        APPLE_OAUTH_CLIENT_ID: 'id',
        APPLE_OAUTH_CLIENT_SECRET: 'secret',
        FACEBOOK_OAUTH_CLIENT_ID: 'id',
        FACEBOOK_OAUTH_CLIENT_SECRET: 'secret',
        GITHUB_OAUTH_CLIENT_ID: 'id',
        GITHUB_OAUTH_CLIENT_SECRET: 'secret',
        TWITTER_OAUTH_CLIENT_ID: 'id',
        TWITTER_OAUTH_CLIENT_SECRET: 'secret',
        MICROSOFT_OAUTH_CLIENT_ID: 'id',
        MICROSOFT_OAUTH_CLIENT_SECRET: 'secret'
      };

      const result = getEnvOAuthProviders(env);
      expect(result).toHaveLength(7);
    });
  });

  describe('getEnvOAuthCredentials unknown provider', () => {
    it('should return null for unsupported provider', () => {
      const env = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = getEnvOAuthCredentials(env, 'unknown_provider' as any);
      expect(result).toBeNull();
    });
  });
});
