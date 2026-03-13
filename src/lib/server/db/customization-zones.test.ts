import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCustomizationZones,
  getCustomizationZoneById,
  createCustomizationZone,
  updateCustomizationZone,
  deleteCustomizationZone
} from './customization-zones';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('customization-zones', () => {
  let mockDb: any;
  const testSiteId = 'test-site';
  const testProductId = 'product-123';
  const testZoneId = 'zone-123';

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn()
    };
  });

  describe('getCustomizationZones', () => {
    it('fetches all zones for a product', async () => {
      const mockZones = [
        {
          id: 'zone-1',
          site_id: testSiteId,
          product_id: testProductId,
          media_id: null,
          name: 'Front Logo',
          x_percent: 30,
          y_percent: 20,
          width_percent: 40,
          height_percent: 30,
          max_file_size: 10485760,
          allowed_types: '["image/png","image/jpeg"]',
          sort_order: 0,
          created_at: 1000,
          updated_at: 1000
        },
        {
          id: 'zone-2',
          site_id: testSiteId,
          product_id: testProductId,
          media_id: 'media-1',
          name: 'Back Print',
          x_percent: 20,
          y_percent: 10,
          width_percent: 60,
          height_percent: 50,
          max_file_size: 10485760,
          allowed_types: '["image/png","image/jpeg","image/webp"]',
          sort_order: 1,
          created_at: 1000,
          updated_at: 1000
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockZones });

      const zones = await getCustomizationZones(mockDb, testSiteId, testProductId);

      expect(zones).toHaveLength(2);
      expect(zones[0].name).toBe('Front Logo');
      expect(zones[0].allowedTypes).toEqual(['image/png', 'image/jpeg']);
      expect(zones[1].name).toBe('Back Print');
      expect(zones[1].mediaId).toBe('media-1');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND product_id = ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(testSiteId, testProductId);
    });

    it('returns empty array when no zones exist', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const zones = await getCustomizationZones(mockDb, testSiteId, testProductId);

      expect(zones).toEqual([]);
    });

    it('handles null results gracefully', async () => {
      mockDb.all.mockResolvedValue({ results: null });

      const zones = await getCustomizationZones(mockDb, testSiteId, testProductId);

      expect(zones).toEqual([]);
    });
  });

  describe('getCustomizationZoneById', () => {
    it('fetches a zone by ID', async () => {
      const mockZone = {
        id: testZoneId,
        site_id: testSiteId,
        product_id: testProductId,
        media_id: null,
        name: 'Front Logo',
        x_percent: 30,
        y_percent: 20,
        width_percent: 40,
        height_percent: 30,
        max_file_size: 10485760,
        allowed_types: '["image/png","image/jpeg"]',
        sort_order: 0,
        created_at: 1000,
        updated_at: 1000
      };

      mockDb.first.mockResolvedValue(mockZone);

      const zone = await getCustomizationZoneById(mockDb, testSiteId, testZoneId);

      expect(zone).not.toBeNull();
      expect(zone!.id).toBe(testZoneId);
      expect(zone!.name).toBe('Front Logo');
      expect(zone!.xPercent).toBe(30);
      expect(zone!.allowedTypes).toEqual(['image/png', 'image/jpeg']);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ? AND site_id = ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(testZoneId, testSiteId);
    });

    it('returns null when zone not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const zone = await getCustomizationZoneById(mockDb, testSiteId, 'nonexistent');

      expect(zone).toBeNull();
    });
  });

  describe('createCustomizationZone', () => {
    it('creates a new zone with required fields', async () => {
      const mockCreated = {
        id: 'new-zone-id',
        site_id: testSiteId,
        product_id: testProductId,
        media_id: null,
        name: 'Chest Logo',
        x_percent: 25,
        y_percent: 15,
        width_percent: 50,
        height_percent: 40,
        max_file_size: 10485760,
        allowed_types: '["image/png","image/jpeg","image/webp","image/svg+xml"]',
        sort_order: 0,
        created_at: 1000,
        updated_at: 1000
      };

      mockDb.first.mockResolvedValue(mockCreated);

      const zone = await createCustomizationZone(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Chest Logo',
        xPercent: 25,
        yPercent: 15,
        widthPercent: 50,
        heightPercent: 40
      });

      expect(zone).not.toBeNull();
      expect(zone!.name).toBe('Chest Logo');
      expect(zone!.xPercent).toBe(25);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
    });

    it('creates a zone with custom file size and types', async () => {
      const mockCreated = {
        id: 'new-zone-id',
        site_id: testSiteId,
        product_id: testProductId,
        media_id: 'media-1',
        name: 'Custom Zone',
        x_percent: 10,
        y_percent: 10,
        width_percent: 80,
        height_percent: 80,
        max_file_size: 5242880,
        allowed_types: '["image/png"]',
        sort_order: 2,
        created_at: 1000,
        updated_at: 1000
      };

      mockDb.first.mockResolvedValue(mockCreated);

      const zone = await createCustomizationZone(mockDb, testSiteId, {
        productId: testProductId,
        mediaId: 'media-1',
        name: 'Custom Zone',
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80,
        maxFileSize: 5242880,
        allowedTypes: ['image/png'],
        sortOrder: 2
      });

      expect(zone).not.toBeNull();
      expect(zone!.mediaId).toBe('media-1');
      expect(zone!.maxFileSize).toBe(5242880);
      expect(zone!.allowedTypes).toEqual(['image/png']);
      expect(zone!.sortOrder).toBe(2);
    });

    it('throws if zone creation fails', async () => {
      mockDb.first.mockResolvedValue(null);

      await expect(
        createCustomizationZone(mockDb, testSiteId, {
          productId: testProductId,
          name: 'Failing Zone',
          xPercent: 10,
          yPercent: 10,
          widthPercent: 30,
          heightPercent: 30
        })
      ).rejects.toThrow('Failed to create customization zone');
    });
  });

  describe('updateCustomizationZone', () => {
    it('updates zone name', async () => {
      const mockUpdated = {
        id: testZoneId,
        site_id: testSiteId,
        product_id: testProductId,
        media_id: null,
        name: 'Updated Name',
        x_percent: 30,
        y_percent: 20,
        width_percent: 40,
        height_percent: 30,
        max_file_size: 10485760,
        allowed_types: '["image/png","image/jpeg"]',
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      };

      mockDb.first.mockResolvedValue(mockUpdated);

      const zone = await updateCustomizationZone(mockDb, testSiteId, testZoneId, {
        name: 'Updated Name'
      });

      expect(zone).not.toBeNull();
      expect(zone!.name).toBe('Updated Name');
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE'));
    });

    it('updates zone position and size', async () => {
      const mockUpdated = {
        id: testZoneId,
        site_id: testSiteId,
        product_id: testProductId,
        media_id: null,
        name: 'Front Logo',
        x_percent: 10,
        y_percent: 5,
        width_percent: 80,
        height_percent: 90,
        max_file_size: 10485760,
        allowed_types: '["image/png","image/jpeg"]',
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      };

      mockDb.first.mockResolvedValue(mockUpdated);

      const zone = await updateCustomizationZone(mockDb, testSiteId, testZoneId, {
        xPercent: 10,
        yPercent: 5,
        widthPercent: 80,
        heightPercent: 90
      });

      expect(zone).not.toBeNull();
      expect(zone!.xPercent).toBe(10);
      expect(zone!.yPercent).toBe(5);
      expect(zone!.widthPercent).toBe(80);
      expect(zone!.heightPercent).toBe(90);
    });

    it('returns null when zone not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const zone = await updateCustomizationZone(mockDb, testSiteId, 'nonexistent', {
        name: 'Updated'
      });

      expect(zone).toBeNull();
    });
  });

  describe('deleteCustomizationZone', () => {
    it('deletes a zone and returns true', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

      const result = await deleteCustomizationZone(mockDb, testSiteId, testZoneId);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'));
      expect(mockDb.bind).toHaveBeenCalledWith(testZoneId, testSiteId);
    });

    it('returns false when zone not found', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

      const result = await deleteCustomizationZone(mockDb, testSiteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
