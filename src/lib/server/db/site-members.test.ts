import { describe, it, expect, vi } from 'vitest';
import {
  addSiteMember,
  getSiteMember,
  getSitesForAccount,
  getMembersForSite,
  updateSiteMemberRole,
  removeSiteMember,
  type SiteMember
} from './site-members';

describe('Site Members Repository', () => {
  const mockMember: SiteMember = {
    site_id: 'site-1',
    account_id: 'account-1',
    role: 'owner',
    created_at: 1234567890
  };

  describe('addSiteMember', () => {
    it('should insert and return the membership', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await addSiteMember(db, 'site-1', 'account-1', 'owner');
      expect(result.site_id).toBe('site-1');
      expect(result.account_id).toBe('account-1');
      expect(result.role).toBe('owner');
      expect(mockBind).toHaveBeenCalledWith('site-1', 'account-1', 'owner', result.created_at);
    });
  });

  describe('getSiteMember', () => {
    it('should return the membership row', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockMember);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getSiteMember(db, 'site-1', 'account-1')).toEqual(mockMember);
      expect(mockBind).toHaveBeenCalledWith('site-1', 'account-1');
    });

    it('should return null for a non-member', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getSiteMember(db, 'site-1', 'stranger')).toBeNull();
    });
  });

  describe('getSitesForAccount', () => {
    it('should join sites with the member role', async () => {
      const row = { id: 'site-1', name: 'Site', member_role: 'owner' };
      const mockAll = vi.fn().mockResolvedValue({ results: [row], success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getSitesForAccount(db, 'account-1');
      expect(result).toEqual([row]);
      const sql = mockPrepare.mock.calls[0][0] as string;
      expect(sql).toContain('JOIN sites');
      expect(mockBind).toHaveBeenCalledWith('account-1');
    });
  });

  describe('getMembersForSite', () => {
    it('should list members of a site', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockMember], success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getMembersForSite(db, 'site-1')).toEqual([mockMember]);
    });
  });

  describe('updateSiteMemberRole', () => {
    it('should return true when a row was updated', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await updateSiteMemberRole(db, 'site-1', 'account-1', 'admin')).toBe(true);
      expect(mockBind).toHaveBeenCalledWith('admin', 'site-1', 'account-1');
    });
  });

  describe('removeSiteMember', () => {
    it('should return false when nothing was deleted', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await removeSiteMember(db, 'site-1', 'account-1')).toBe(false);
    });
  });
});
