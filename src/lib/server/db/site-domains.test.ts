import { describe, it, expect, vi } from 'vitest';
import {
  normalizeHostname,
  addSiteDomain,
  getSiteDomainByHostname,
  getActiveSiteIdForHostname,
  getDomainsForSite,
  updateSiteDomainStatus,
  removeSiteDomain,
  type SiteDomain
} from './site-domains';

describe('Site Domains Repository', () => {
  const mockDomain: SiteDomain = {
    id: 'domain-1',
    site_id: 'site-1',
    hostname: 'shop.example.com',
    kind: 'custom',
    is_primary: 1,
    status: 'active',
    cf_custom_hostname_id: null,
    verification: null,
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('normalizeHostname', () => {
    it('should lowercase, trim, and strip port and trailing dot', () => {
      expect(normalizeHostname(' Shop.Example.COM. ')).toBe('shop.example.com');
      expect(normalizeHostname('localhost:4236')).toBe('localhost');
    });
  });

  describe('addSiteDomain', () => {
    it('should insert a normalized hostname and return the row', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockDomain);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await addSiteDomain(db, {
        site_id: 'site-1',
        hostname: 'Shop.Example.com',
        kind: 'custom',
        is_primary: true,
        status: 'active'
      });

      const insertArgs = mockBind.mock.calls[0];
      expect(insertArgs[2]).toBe('shop.example.com');
      expect(insertArgs[3]).toBe('custom');
      expect(insertArgs[4]).toBe(1);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('getSiteDomainByHostname', () => {
    it('should exclude removed domains', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockDomain);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      await getSiteDomainByHostname(db, 'shop.example.com');
      expect(mockPrepare.mock.calls[0][0]).toContain("status != 'removed'");
    });
  });

  describe('getActiveSiteIdForHostname', () => {
    it('should only match active domains on active sites', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ site_id: 'site-1' });
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getActiveSiteIdForHostname(db, 'shop.example.com');
      expect(result).toBe('site-1');
      const sql = mockPrepare.mock.calls[0][0] as string;
      expect(sql).toContain("site_domains.status = 'active'");
      expect(sql).toContain("sites.status = 'active'");
    });
  });

  describe('getDomainsForSite', () => {
    it('should list non-removed domains, primary first', async () => {
      const mockAll = vi.fn().mockResolvedValue({ results: [mockDomain], success: true });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await getDomainsForSite(db, 'site-1')).toEqual([mockDomain]);
      expect(mockPrepare.mock.calls[0][0]).toContain('is_primary DESC');
    });
  });

  describe('updateSiteDomainStatus', () => {
    it('should update status and verification json', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      const ok = await updateSiteDomainStatus(db, 'domain-1', 'active', { checked: true });
      expect(ok).toBe(true);
      expect(mockPrepare.mock.calls[0][0]).toContain('verification = ?');
      expect(mockBind.mock.calls[0][1]).toBe('{"checked":true}');
    });
  });

  describe('removeSiteDomain', () => {
    it('should soft-delete by setting status to removed', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const db = { prepare: mockPrepare } as unknown as D1Database;

      expect(await removeSiteDomain(db, 'domain-1')).toBe(true);
      expect(mockPrepare.mock.calls[0][0]).toContain("SET status = 'removed'");
    });
  });
});
