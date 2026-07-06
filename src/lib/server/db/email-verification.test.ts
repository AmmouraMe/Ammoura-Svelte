import { describe, it, expect, vi } from 'vitest';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  EMAIL_VERIFICATION_TTL_SECONDS
} from './email-verification';

function mockDbForCreate() {
  const mockRun = vi.fn().mockResolvedValue({ success: true });
  const mockBind = vi.fn().mockReturnValue({ run: mockRun });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
  return { db: { prepare: mockPrepare } as unknown as D1Database, mockPrepare, mockBind };
}

describe('Email Verification Repository', () => {
  describe('createEmailVerificationToken', () => {
    it('should replace prior tokens and store only the hash', async () => {
      const { db, mockPrepare, mockBind } = mockDbForCreate();
      const token = await createEmailVerificationToken(db, 'account-1');

      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(mockPrepare.mock.calls[0][0]).toContain(
        'DELETE FROM email_verification_tokens WHERE account_id'
      );
      // INSERT binds: id(hash), account_id, expires_at, created_at
      const insert = mockBind.mock.calls[1];
      expect(insert[0]).toMatch(/^[0-9a-f]{64}$/);
      expect(insert[0]).not.toEqual(token);
      expect(insert[2] - insert[3]).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
    });
  });

  describe('consumeEmailVerificationToken', () => {
    it('should return null for unknown tokens', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await consumeEmailVerificationToken(db, 'nope')).toBeNull();
    });

    it('should delete and reject expired tokens', async () => {
      const now = Math.floor(Date.now() / 1000);
      const row = { id: 'h', account_id: 'account-1', expires_at: now - 5, created_at: now - 100 };
      const mockFirst = vi.fn().mockResolvedValue(row);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await consumeEmailVerificationToken(db, 'stale')).toBeNull();
      const sqls = mockPrepare.mock.calls.map(([s]) => s as string);
      expect(sqls.some((s) => s.startsWith('DELETE FROM email_verification_tokens'))).toBe(true);
      // Account must NOT be marked verified
      expect(sqls.some((s) => s.includes('UPDATE accounts'))).toBe(false);
    });

    it('should mark the account verified for a valid token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const row = { id: 'h', account_id: 'account-1', expires_at: now + 500, created_at: now };
      const account = {
        id: 'account-1',
        email: 'a@b.co',
        name: 'A',
        password_hash: null,
        email_verified_at: now,
        created_at: 1,
        updated_at: now
      };
      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce(row) // token lookup
        .mockResolvedValue(account); // account reads in updateAccount
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await consumeEmailVerificationToken(db, 'good-token');
      expect(result?.email_verified_at).toBe(now);
      const sqls = mockPrepare.mock.calls.map(([s]) => s as string);
      expect(sqls.some((s) => s.includes('UPDATE accounts SET email_verified_at'))).toBe(true);
    });
  });
});
