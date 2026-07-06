import { describe, it, expect, vi } from 'vitest';
import {
  createAccountSession,
  getAccountBySessionToken,
  deleteAccountSession,
  deleteExpiredAccountSessions,
  ACCOUNT_SESSION_TTL_SECONDS
} from './account-sessions';
import type { Account } from './accounts';

describe('Account Sessions Repository', () => {
  const mockAccount: Account = {
    id: 'account-1',
    email: 'owner@example.com',
    name: 'Owner',
    password_hash: null,
    email_verified_at: null,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('createAccountSession', () => {
    it('should return a raw token and persist only its hash', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const { token, session } = await createAccountSession(db, 'account-1');

      expect(token.length).toBeGreaterThanOrEqual(40);
      // Stored id is a sha-256 hex digest, not the token itself
      expect(session.id).toMatch(/^[0-9a-f]{64}$/);
      expect(session.id).not.toEqual(token);
      expect(mockBind).toHaveBeenCalledWith(
        session.id,
        'account-1',
        session.expires_at,
        session.created_at
      );
      expect(session.expires_at - session.created_at).toBe(ACCOUNT_SESSION_TTL_SECONDS);
    });
  });

  describe('getAccountBySessionToken', () => {
    it('should return null for an unknown token', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getAccountBySessionToken(db, 'bogus-token')).toBeNull();
    });

    it('should resolve a valid session to its account', async () => {
      const now = Math.floor(Date.now() / 1000);
      const session = {
        id: 'hash',
        account_id: 'account-1',
        expires_at: now + 1000,
        created_at: now
      };
      const mockFirst = vi.fn().mockResolvedValueOnce(session).mockResolvedValueOnce(mockAccount);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAccountBySessionToken(db, 'valid-token');
      expect(result?.account).toEqual(mockAccount);
    });

    it('should delete and reject an expired session', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expired = {
        id: 'hash',
        account_id: 'account-1',
        expires_at: now - 10,
        created_at: now - 1000
      };
      const mockFirst = vi.fn().mockResolvedValue(expired);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getAccountBySessionToken(db, 'stale-token')).toBeNull();
      const deleteCall = mockPrepare.mock.calls.find(([sql]) =>
        (sql as string).startsWith('DELETE FROM account_sessions')
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe('deleteAccountSession', () => {
    it('should delete by hashed token', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      await deleteAccountSession(db, 'some-token');
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM account_sessions WHERE id = ?');
      // Bound value is the hash, never the raw token
      expect(mockBind.mock.calls[0][0]).not.toEqual('some-token');
      expect(mockBind.mock.calls[0][0]).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('deleteExpiredAccountSessions', () => {
    it('should report the number of purged rows', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 3 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await deleteExpiredAccountSessions(db)).toBe(3);
    });
  });
});
