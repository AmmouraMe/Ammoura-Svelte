import { describe, it, expect, vi } from 'vitest';
import {
  getAccountById,
  getAccountByEmail,
  createAccount,
  updateAccount,
  type Account
} from './accounts';

describe('Accounts Repository', () => {
  const mockAccount: Account = {
    id: 'account-1',
    email: 'owner@example.com',
    name: 'Owner',
    password_hash: 'pbkdf2$100000$c2FsdA$aGFzaA',
    email_verified_at: null,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  function mockDbReturning(row: Account | null) {
    const mockFirst = vi.fn().mockResolvedValue(row);
    const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    return {
      db: { prepare: mockPrepare } as unknown as D1Database,
      mockPrepare,
      mockBind
    };
  }

  describe('getAccountById', () => {
    it('should get account by id', async () => {
      const { db, mockPrepare, mockBind } = mockDbReturning(mockAccount);
      const result = await getAccountById(db, 'account-1');
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM accounts WHERE id = ?');
      expect(mockBind).toHaveBeenCalledWith('account-1');
      expect(result).toEqual(mockAccount);
    });

    it('should return null when not found', async () => {
      const { db } = mockDbReturning(null);
      expect(await getAccountById(db, 'nope')).toBeNull();
    });
  });

  describe('getAccountByEmail', () => {
    it('should normalize the email before querying', async () => {
      const { db, mockBind } = mockDbReturning(mockAccount);
      await getAccountByEmail(db, '  Owner@Example.COM ');
      expect(mockBind).toHaveBeenCalledWith('owner@example.com');
    });
  });

  describe('createAccount', () => {
    it('should insert with normalized email and return the created account', async () => {
      const { db, mockBind } = mockDbReturning(mockAccount);
      const result = await createAccount(db, {
        email: 'Owner@Example.com',
        name: '  Owner ',
        password_hash: 'pbkdf2$100000$c2FsdA$aGFzaA'
      });
      // First bind call is the INSERT
      const insertArgs = mockBind.mock.calls[0];
      expect(insertArgs[1]).toBe('owner@example.com');
      expect(insertArgs[2]).toBe('Owner');
      expect(result).toEqual(mockAccount);
    });

    it('should allow OAuth-only accounts without a password hash', async () => {
      const { db, mockBind } = mockDbReturning({ ...mockAccount, password_hash: null });
      await createAccount(db, { email: 'a@b.co', name: 'A' });
      expect(mockBind.mock.calls[0][3]).toBeNull();
    });
  });

  describe('updateAccount', () => {
    it('should return null when the account does not exist', async () => {
      const { db } = mockDbReturning(null);
      expect(await updateAccount(db, 'missing', { name: 'X' })).toBeNull();
    });

    it('should return the account unchanged when no fields are provided', async () => {
      const { db, mockPrepare } = mockDbReturning(mockAccount);
      const result = await updateAccount(db, 'account-1', {});
      expect(result).toEqual(mockAccount);
      // Only the initial SELECT, no UPDATE statement
      expect(mockPrepare).toHaveBeenCalledTimes(1);
    });

    it('should build an UPDATE for provided fields', async () => {
      const { db, mockPrepare } = mockDbReturning(mockAccount);
      await updateAccount(db, 'account-1', { name: 'New Name', email_verified_at: 111 });
      const updateSql = mockPrepare.mock.calls[1][0] as string;
      expect(updateSql).toContain('UPDATE accounts SET');
      expect(updateSql).toContain('name = ?');
      expect(updateSql).toContain('email_verified_at = ?');
      expect(updateSql).toContain('updated_at = ?');
    });
  });
});
