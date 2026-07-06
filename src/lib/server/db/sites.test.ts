import { describe, it, expect, vi } from 'vitest';
import {
  getSiteById,
  getSiteByDomain,
  getAllSites,
  createSite,
  updateSite,
  deleteSite,
  type Site,
  type CreateSiteData,
  type UpdateSiteData
} from './sites';

describe('Sites Repository', () => {
  const mockSite: Site = {
    id: 'site-1',
    name: 'Test Site',
    domain: 'test.example.com',
    slug: null,
    description: 'Test site description',
    settings: '{"theme": "dark"}',
    status: 'active',
    created_at: 1234567890,
    updated_at: 1234567890
  };

  describe('getSiteById', () => {
    it('should get site by ID', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getSiteById(mockDB, 'site-1');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM sites WHERE id = ?');
      expect(mockBind).toHaveBeenCalledWith('site-1');
      expect(result).toEqual(mockSite);
    });

    it('should return null when site not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getSiteById(mockDB, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSiteByDomain', () => {
    it('should get site by domain', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getSiteByDomain(mockDB, 'test.example.com');

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM sites WHERE domain = ?');
      expect(mockBind).toHaveBeenCalledWith('test.example.com');
      expect(result).toEqual(mockSite);
    });

    it('should return null when domain not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getSiteByDomain(mockDB, 'nonexistent.com');

      expect(result).toBeNull();
    });
  });

  describe('getAllSites', () => {
    it('should get all sites', async () => {
      const mockResults = { results: [mockSite], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllSites(mockDB);

      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM sites ORDER BY created_at DESC');
      expect(result).toEqual([mockSite]);
    });

    it('should return empty array when no sites found', async () => {
      const mockResults = { results: [], success: true };
      const mockAll = vi.fn().mockResolvedValue(mockResults);
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await getAllSites(mockDB);

      expect(result).toEqual([]);
    });
  });

  describe('createSite', () => {
    it('should create a new site with all fields', async () => {
      const siteData: CreateSiteData = {
        name: 'New Site',
        domain: 'new.example.com',
        description: 'New site description',
        settings: { theme: 'light' },
        status: 'active'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createSite(mockDB, siteData);

      expect(result).toEqual(mockSite);
    });

    it('should create site with default status', async () => {
      const siteData: CreateSiteData = {
        name: 'New Site',
        domain: 'new.example.com'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await createSite(mockDB, siteData);

      expect(result).toEqual(mockSite);
    });

    it('should throw error when site creation fails', async () => {
      const siteData: CreateSiteData = {
        name: 'New Site',
        domain: 'new.example.com'
      };

      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBind })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      await expect(createSite(mockDB, siteData)).rejects.toThrow('Failed to create site');
    });
  });

  describe('updateSite', () => {
    it('should update site with all fields', async () => {
      const updateData: UpdateSiteData = {
        name: 'Updated Site',
        domain: 'updated.example.com',
        description: 'Updated description',
        settings: { theme: 'dark' },
        status: 'inactive'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateSite(mockDB, 'site-1', updateData);

      expect(result).toEqual(mockSite);
    });

    it('should update site with partial fields', async () => {
      const updateData: UpdateSiteData = {
        name: 'Updated Site'
      };

      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBindGet = vi.fn().mockReturnValue({ first: mockFirst });
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      const mockBindUpdate = vi.fn().mockReturnValue({ run: mockRun });

      const mockDB = {
        prepare: vi
          .fn()
          .mockReturnValueOnce({ bind: mockBindGet })
          .mockReturnValueOnce({ bind: mockBindUpdate })
          .mockReturnValueOnce({ bind: mockBindGet })
      } as unknown as D1Database;

      const result = await updateSite(mockDB, 'site-1', updateData);

      expect(result).toEqual(mockSite);
    });

    it('should return null when site not found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateSite(mockDB, 'nonexistent', { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should return site unchanged when no updates provided', async () => {
      const mockFirst = vi.fn().mockResolvedValue(mockSite);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockDB = {
        prepare: vi.fn().mockReturnValue({ bind: mockBind })
      } as unknown as D1Database;

      const result = await updateSite(mockDB, 'site-1', {});

      expect(result).toEqual(mockSite);
    });
  });

  describe('deleteSite', () => {
    it('should delete site', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteSite(mockDB, 'site-1');

      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM sites WHERE id = ?');
      expect(mockBind).toHaveBeenCalledWith('site-1');
      expect(result).toBe(true);
    });

    it('should return false when site not found', async () => {
      const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 }, success: true });
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      const mockDB = { prepare: mockPrepare } as unknown as D1Database;

      const result = await deleteSite(mockDB, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
