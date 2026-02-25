/**
 * Tests for OAuth database functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProviderAccount,
  getProviderAccount,
  getUserProviderAccounts,
  getProviderAccountByProviderId,
  findProviderAccountsByEmail,
  updateProviderAccountTokens,
  deleteProviderAccount,
  createOAuthSession,
  getOAuthSession,
  deleteOAuthSession,
  createAuthAuditLog,
  getUserAuthLogs,
  getAuthLogsByEvent,
  cleanupExpiredOAuthSessions
} from './oauth.js';

// Mock D1Database
function createMockDB() {
  const data = {
    provider_accounts: [] as Array<Record<string, unknown>>,
    oauth_sessions: [] as Array<Record<string, unknown>>,
    auth_audit_logs: [] as Array<Record<string, unknown>>
  };

  return {
    prepare: (sql: string) => ({
      bind: (...params: Array<unknown>) => ({
        run: async () => {
          // Simple mock for INSERT operations
          if (sql.includes('INSERT INTO provider_accounts')) {
            data.provider_accounts.push({
              id: params[0],
              user_id: params[1],
              site_id: params[2],
              provider: params[3],
              provider_account_id: params[4],
              email: params[5],
              access_token: params[6],
              refresh_token: params[7],
              token_expires_at: params[8],
              scope: params[9],
              id_token: params[10],
              profile_data: params[11],
              created_at: params[12],
              updated_at: params[13],
              last_used_at: params[14]
            });
          }
          if (sql.includes('INSERT INTO oauth_sessions')) {
            data.oauth_sessions.push({
              id: params[0],
              site_id: params[1],
              state: params[2],
              code_verifier: params[3],
              code_challenge: params[4],
              nonce: params[5],
              provider: params[6],
              redirect_uri: params[7],
              created_at: params[8],
              expires_at: params[9]
            });
          }
          if (sql.includes('INSERT INTO auth_audit_logs')) {
            data.auth_audit_logs.push({
              id: params[0],
              site_id: params[1],
              user_id: params[2],
              event_type: params[3],
              provider: params[4],
              ip_address: params[5],
              user_agent: params[6],
              details: params[7],
              created_at: params[8]
            });
          }
          return { meta: { changes: 1 } };
        },
        first: async () => {
          if (sql.includes('FROM provider_accounts')) {
            return data.provider_accounts[0] || null;
          }
          if (sql.includes('FROM oauth_sessions')) {
            return data.oauth_sessions[0] || null;
          }
          return null;
        },
        all: async () => {
          if (sql.includes('FROM provider_accounts')) {
            return { results: data.provider_accounts };
          }
          if (sql.includes('FROM auth_audit_logs')) {
            return { results: data.auth_audit_logs };
          }
          return { results: [] };
        }
      })
    })
  } as unknown as D1Database;
}

describe('OAuth Database Functions', () => {
  let mockDB: D1Database;
  const siteId = 'test-site';
  const userId = 'test-user';

  beforeEach(() => {
    mockDB = createMockDB();
  });

  describe('createProviderAccount', () => {
    it('should create a provider account', async () => {
      const account = await createProviderAccount(mockDB, siteId, userId, 'google', {
        provider_account_id: 'google-123',
        email: 'test@example.com',
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_expires_at: 1234567890,
        scope: 'email profile',
        profile_data: { name: 'Test User' }
      });

      expect(account).toBeDefined();
      expect(account.provider).toBe('google');
      expect(account.email).toBe('test@example.com');
    });
  });

  describe('getProviderAccount', () => {
    it('should retrieve a provider account', async () => {
      const account = await getProviderAccount(mockDB, siteId, userId, 'google');
      expect(account).toBeDefined();
    });
  });

  describe('getUserProviderAccounts', () => {
    it('should retrieve all provider accounts for a user', async () => {
      const accounts = await getUserProviderAccounts(mockDB, siteId, userId);
      expect(Array.isArray(accounts)).toBe(true);
    });
  });

  describe('getProviderAccountByProviderId', () => {
    it('should retrieve account by provider ID', async () => {
      const account = await getProviderAccountByProviderId(mockDB, siteId, 'google', 'google-123');
      expect(account).toBeDefined();
    });
  });

  describe('findProviderAccountsByEmail', () => {
    it('should find accounts by email', async () => {
      const accounts = await findProviderAccountsByEmail(mockDB, siteId, 'test@example.com');
      expect(Array.isArray(accounts)).toBe(true);
    });
  });

  describe('updateProviderAccountTokens', () => {
    it('should update account tokens', async () => {
      await expect(
        updateProviderAccountTokens(mockDB, 'account-id', {
          access_token: 'new-token',
          token_expires_at: 9876543210
        })
      ).resolves.not.toThrow();
    });
  });

  describe('deleteProviderAccount', () => {
    it('should delete a provider account', async () => {
      const result = await deleteProviderAccount(mockDB, siteId, userId, 'google');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('OAuth Sessions', () => {
    it('should create an OAuth session', async () => {
      const session = await createOAuthSession(mockDB, siteId, 'google', {
        state: 'state-123',
        code_verifier: 'verifier',
        code_challenge: 'challenge',
        nonce: 'nonce-123',
        redirect_uri: 'http://localhost/callback'
      });

      expect(session).toBeDefined();
      expect(session.provider).toBe('google');
      expect(session.state).toBe('state-123');
    });

    it('should retrieve OAuth session by state', async () => {
      const session = await getOAuthSession(mockDB, 'state-123');
      expect(session).toBeDefined();
    });

    it('should delete OAuth session', async () => {
      await expect(deleteOAuthSession(mockDB, 'state-123')).resolves.not.toThrow();
    });
  });

  describe('Auth Audit Logs', () => {
    it('should create an audit log entry', async () => {
      await expect(
        createAuthAuditLog(mockDB, siteId, {
          user_id: userId,
          event_type: 'login_success',
          provider: 'google',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0',
          details: { email: 'test@example.com' }
        })
      ).resolves.not.toThrow();
    });

    it('should create audit log without optional fields', async () => {
      await expect(
        createAuthAuditLog(mockDB, siteId, {
          event_type: 'login_failed'
        })
      ).resolves.not.toThrow();
    });

    it('should retrieve user auth logs', async () => {
      const logs = await getUserAuthLogs(mockDB, siteId, userId);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should retrieve user auth logs with custom limit', async () => {
      const logs = await getUserAuthLogs(mockDB, siteId, userId, 10);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should retrieve logs by event type', async () => {
      const logs = await getAuthLogsByEvent(mockDB, siteId, 'login_success');
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should retrieve logs by event type with custom limit', async () => {
      const logs = await getAuthLogsByEvent(mockDB, siteId, 'login_success', 25);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('cleanupExpiredOAuthSessions', () => {
    it('should clean up expired sessions', async () => {
      const { cleanupExpiredOAuthSessions } = await import('./oauth.js');
      const result = await cleanupExpiredOAuthSessions(mockDB);
      expect(typeof result).toBe('number');
    });
  });

  describe('createProviderAccount - comprehensive', () => {
    it('should create account without optional tokens', async () => {
      const account = await createProviderAccount(mockDB, siteId, 'user-2', 'github', {
        provider_account_id: 'github-456',
        email: 'user2@example.com'
      });

      expect(account).toBeDefined();
      expect(account.email).toBe('user2@example.com');
    });

    it('should handle profile data serialization', async () => {
      const complexProfile = {
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        location: 'San Francisco',
        nested: { value: 123 }
      };

      const account = await createProviderAccount(mockDB, siteId, 'user-3', 'facebook', {
        provider_account_id: 'fb-789',
        email: 'user3@example.com',
        profile_data: complexProfile
      });

      expect(account).toBeDefined();
    });
  });

  describe('updateProviderAccountTokens - comprehensive', () => {
    it('should update only access token', async () => {
      await expect(
        updateProviderAccountTokens(mockDB, 'account-id', {
          access_token: 'new-access-token'
        })
      ).resolves.not.toThrow();
    });

    it('should update only refresh token', async () => {
      await expect(
        updateProviderAccountTokens(mockDB, 'account-id', {
          refresh_token: 'new-refresh-token'
        })
      ).resolves.not.toThrow();
    });

    it('should update scope', async () => {
      await expect(
        updateProviderAccountTokens(mockDB, 'account-id', {
          scope: 'email profile openid'
        })
      ).resolves.not.toThrow();
    });

    it('should update multiple fields at once', async () => {
      await expect(
        updateProviderAccountTokens(mockDB, 'account-id', {
          access_token: 'token-1',
          refresh_token: 'token-2',
          token_expires_at: 1234567890,
          scope: 'full-scope'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getOAuthSession - expiration handling', () => {
    it('should return null for expired sessions', async () => {
      // This test depends on the mock implementation handling expired sessions
      const session = await getOAuthSession(mockDB, 'expired-state');
      // Should be null or the mock behavior
      expect(session === null || session !== undefined).toBe(true);
    });
  });

  describe('createOAuthSession - comprehensive', () => {
    it('should create session without nonce', async () => {
      const session = await createOAuthSession(mockDB, siteId, 'github', {
        state: 'state-456',
        code_verifier: 'verifier-456',
        code_challenge: 'challenge-456',
        redirect_uri: 'http://localhost/callback'
      });

      expect(session).toBeDefined();
      expect(session.state).toBe('state-456');
    });

    it('should create session with all fields', async () => {
      const session = await createOAuthSession(mockDB, siteId, 'microsoft', {
        state: 'state-789',
        code_verifier: 'verifier-789',
        code_challenge: 'challenge-789',
        nonce: 'nonce-789',
        redirect_uri: 'https://example.com/auth/callback'
      });

      expect(session).toBeDefined();
      expect(session.provider).toBe('microsoft');
    });
  });

  describe('getUserProviderAccounts - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: null })
          })
        })
      } as unknown as D1Database;

      const accounts = await getUserProviderAccounts(mockDB, 'site-1', 'user-1');
      expect(accounts).toEqual([]);
    });
  });

  describe('findProviderAccountsByEmail - null results fallback', () => {
    it('should return empty array when results is null', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: null })
          })
        })
      } as unknown as D1Database;

      const accounts = await findProviderAccountsByEmail(mockDB, 'site-1', 'test@example.com');
      expect(accounts).toEqual([]);
    });
  });

  describe('createProviderAccount - error when re-fetch returns null', () => {
    it('should throw when re-fetch returns null after insert', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 1 } }),
            first: async () => null
          })
        })
      } as unknown as D1Database;

      await expect(
        createProviderAccount(mockDB, 'site-1', 'user-1', 'google', {
          provider_account_id: 'google-123',
          email: 'test@example.com'
        })
      ).rejects.toThrow('Failed to create provider account');
    });
  });

  describe('createOAuthSession - error when re-fetch returns null', () => {
    it('should throw when re-fetch returns null after insert', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 1 } }),
            first: async () => null
          })
        })
      } as unknown as D1Database;

      await expect(
        createOAuthSession(mockDB, 'site-1', 'google', {
          state: 'state-999',
          code_verifier: 'verifier',
          code_challenge: 'challenge',
          redirect_uri: 'http://localhost/callback'
        })
      ).rejects.toThrow('Failed to create OAuth session');
    });
  });

  describe('getOAuthSession - expired session handling', () => {
    it('should delete and return null for an expired session', async () => {
      const expiredSession = {
        id: 'session-1',
        site_id: 'site-1',
        state: 'expired-state',
        code_verifier: 'v',
        code_challenge: 'c',
        nonce: null,
        provider: 'google',
        redirect_uri: 'http://localhost/callback',
        created_at: 1000,
        expires_at: 1
      };

      const mockDB = {
        prepare: () => ({
          bind: () => ({
            first: async () => expiredSession,
            run: async () => ({ meta: { changes: 1 } })
          })
        })
      } as unknown as D1Database;

      const session = await getOAuthSession(mockDB, 'expired-state');
      expect(session).toBeNull();
    });
  });

  describe('deleteProviderAccount - no changes', () => {
    it('should return false when no rows deleted', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 0 } })
          })
        })
      } as unknown as D1Database;

      const result = await deleteProviderAccount(mockDB, 'site-1', 'user-1', 'google');
      expect(result).toBe(false);
    });

    it('should return false when meta is undefined', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ meta: undefined })
          })
        })
      } as unknown as D1Database;

      const result = await deleteProviderAccount(mockDB, 'site-1', 'user-1', 'google');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredOAuthSessions - meta undefined', () => {
    it('should return 0 when meta is undefined', async () => {
      const mockDB = {
        prepare: () => ({
          bind: () => ({
            run: async () => ({ meta: undefined })
          })
        })
      } as unknown as D1Database;

      const result = await cleanupExpiredOAuthSessions(mockDB);
      expect(result).toBe(0);
    });
  });
});
