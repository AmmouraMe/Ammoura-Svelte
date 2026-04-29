import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCustomizationFields,
  getCustomizationFieldById,
  createCustomizationField,
  updateCustomizationField,
  deleteCustomizationField
} from './customization-fields';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('customization-fields', () => {
  let mockDb: any;
  const testSiteId = 'test-site';
  const testProductId = 'product-123';
  const testFieldId = 'field-123';

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn()
    };
  });

  describe('getCustomizationFields', () => {
    it('fetches all fields for a product', async () => {
      const mockFields = [
        {
          id: 'field-1',
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Custom Text',
          field_type: 'text',
          options: null,
          placeholder: 'Enter your text',
          required: 1,
          max_length: 50,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 5.0,
          sort_order: 0,
          media_requirements: null,
          created_at: 1000,
          updated_at: 1000
        },
        {
          id: 'field-2',
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Font Style',
          field_type: 'select',
          options: '["Arial","Times New Roman","Comic Sans"]',
          placeholder: null,
          required: 0,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: 'Arial',
          price_modifier: 0,
          sort_order: 1,
          media_requirements: null,
          created_at: 1000,
          updated_at: 1000
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockFields });

      const fields = await getCustomizationFields(mockDb, testSiteId, testProductId);

      expect(fields).toHaveLength(2);
      expect(fields[0].name).toBe('Custom Text');
      expect(fields[0].fieldType).toBe('text');
      expect(fields[0].required).toBe(true);
      expect(fields[0].priceModifier).toBe(5.0);
      expect(fields[0].maxLength).toBe(50);
      expect(fields[0].mediaRequirements).toBeNull();
      expect(fields[1].name).toBe('Font Style');
      expect(fields[1].fieldType).toBe('select');
      expect(fields[1].options).toEqual(['Arial', 'Times New Roman', 'Comic Sans']);
      expect(fields[1].defaultValue).toBe('Arial');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND product_id = ?')
      );
    });

    it('fetches media fields with requirements', async () => {
      const mockFields = [
        {
          id: 'field-img',
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Product Photo',
          field_type: 'image',
          options: null,
          placeholder: null,
          required: 1,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: JSON.stringify({
            maxFileSize: 5242880,
            minWidth: 800,
            minHeight: 600,
            allowedMimeTypes: ['image/png', 'image/jpeg']
          }),
          created_at: 1000,
          updated_at: 1000
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockFields });

      const fields = await getCustomizationFields(mockDb, testSiteId, testProductId);

      expect(fields).toHaveLength(1);
      expect(fields[0].fieldType).toBe('image');
      expect(fields[0].mediaRequirements).not.toBeNull();
      expect(fields[0].mediaRequirements!.maxFileSize).toBe(5242880);
      expect(fields[0].mediaRequirements!.minWidth).toBe(800);
      expect(fields[0].mediaRequirements!.minHeight).toBe(600);
      expect(fields[0].mediaRequirements!.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('returns empty array when no fields exist', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const fields = await getCustomizationFields(mockDb, testSiteId, testProductId);

      expect(fields).toEqual([]);
    });

    it('handles null results', async () => {
      mockDb.all.mockResolvedValue({ results: null });

      const fields = await getCustomizationFields(mockDb, testSiteId, testProductId);

      expect(fields).toEqual([]);
    });
  });

  describe('getCustomizationFieldById', () => {
    it('fetches a single field by id', async () => {
      mockDb.first.mockResolvedValue({
        id: testFieldId,
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Engraving Text',
        field_type: 'text',
        options: null,
        placeholder: 'Enter text to engrave',
        required: 1,
        max_length: 30,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 10,
        sort_order: 0,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      });

      const field = await getCustomizationFieldById(mockDb, testSiteId, testFieldId);

      expect(field).not.toBeNull();
      expect(field!.id).toBe(testFieldId);
      expect(field!.name).toBe('Engraving Text');
      expect(field!.required).toBe(true);
      expect(field!.placeholder).toBe('Enter text to engrave');
    });

    it('returns null when field not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const field = await getCustomizationFieldById(mockDb, testSiteId, 'nonexistent');

      expect(field).toBeNull();
    });
  });

  describe('createCustomizationField', () => {
    it('creates a text field with all options', async () => {
      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Custom Name',
        field_type: 'text',
        options: null,
        placeholder: 'Enter your name',
        required: 1,
        max_length: 40,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 3.5,
        sort_order: 0,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Custom Name',
        fieldType: 'text',
        placeholder: 'Enter your name',
        required: true,
        maxLength: 40,
        priceModifier: 3.5
      });

      expect(field.name).toBe('Custom Name');
      expect(field.fieldType).toBe('text');
      expect(field.required).toBe(true);
      expect(field.priceModifier).toBe(3.5);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
    });

    it('creates a select field with options', async () => {
      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Color Choice',
        field_type: 'select',
        options: '["Red","Blue","Green"]',
        placeholder: null,
        required: 0,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: 'Red',
        price_modifier: 0,
        sort_order: 1,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Color Choice',
        fieldType: 'select',
        options: ['Red', 'Blue', 'Green'],
        defaultValue: 'Red',
        sortOrder: 1
      });

      expect(field.name).toBe('Color Choice');
      expect(field.fieldType).toBe('select');
      expect(field.options).toEqual(['Red', 'Blue', 'Green']);
      expect(field.defaultValue).toBe('Red');
    });

    it('creates a number field with min/max', async () => {
      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Quantity',
        field_type: 'number',
        options: null,
        placeholder: 'Enter amount',
        required: 1,
        max_length: null,
        min_value: 1,
        max_value: 100,
        default_value: '1',
        price_modifier: 0.5,
        sort_order: 0,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Quantity',
        fieldType: 'number',
        placeholder: 'Enter amount',
        required: true,
        minValue: 1,
        maxValue: 100,
        defaultValue: '1',
        priceModifier: 0.5
      });

      expect(field.fieldType).toBe('number');
      expect(field.minValue).toBe(1);
      expect(field.maxValue).toBe(100);
      expect(field.required).toBe(true);
    });

    it('creates an image field with media requirements', async () => {
      const mediaReqs = {
        maxFileSize: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg'],
        minWidth: 1920,
        minHeight: 1080
      };

      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Upload Design',
        field_type: 'image',
        options: null,
        placeholder: null,
        required: 1,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 10,
        sort_order: 0,
        media_requirements: JSON.stringify(mediaReqs),
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Upload Design',
        fieldType: 'image',
        required: true,
        priceModifier: 10,
        mediaRequirements: mediaReqs
      });

      expect(field.fieldType).toBe('image');
      expect(field.mediaRequirements).not.toBeNull();
      expect(field.mediaRequirements!.maxFileSize).toBe(10485760);
      expect(field.mediaRequirements!.minWidth).toBe(1920);
      expect(field.mediaRequirements!.minHeight).toBe(1080);
      expect(field.mediaRequirements!.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('media_requirements'));
    });

    it('creates an audio field with duration requirements', async () => {
      const mediaReqs = {
        maxFileSize: 52428800,
        allowedMimeTypes: ['audio/mpeg', 'audio/wav'],
        minDuration: 5,
        maxDuration: 60,
        minBitrate: 128
      };

      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Voice Message',
        field_type: 'audio',
        options: null,
        placeholder: null,
        required: 0,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 15,
        sort_order: 0,
        media_requirements: JSON.stringify(mediaReqs),
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Voice Message',
        fieldType: 'audio',
        priceModifier: 15,
        mediaRequirements: mediaReqs
      });

      expect(field.fieldType).toBe('audio');
      expect(field.mediaRequirements).not.toBeNull();
      expect(field.mediaRequirements!.minDuration).toBe(5);
      expect(field.mediaRequirements!.maxDuration).toBe(60);
      expect(field.mediaRequirements!.minBitrate).toBe(128);
    });

    it('creates a video field with resolution requirements', async () => {
      const mediaReqs = {
        maxFileSize: 104857600,
        minDuration: 3,
        maxDuration: 120,
        minResolution: 720,
        minFrameRate: 24
      };

      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Product Video',
        field_type: 'video',
        options: null,
        placeholder: null,
        required: 1,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 20,
        sort_order: 0,
        media_requirements: JSON.stringify(mediaReqs),
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Product Video',
        fieldType: 'video',
        required: true,
        priceModifier: 20,
        mediaRequirements: mediaReqs
      });

      expect(field.fieldType).toBe('video');
      expect(field.mediaRequirements).not.toBeNull();
      expect(field.mediaRequirements!.minResolution).toBe(720);
      expect(field.mediaRequirements!.minFrameRate).toBe(24);
      expect(field.mediaRequirements!.maxDuration).toBe(120);
    });

    it('creates a media field without requirements', async () => {
      mockDb.first.mockResolvedValue({
        id: 'new-field',
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Any Image',
        field_type: 'image',
        options: null,
        placeholder: null,
        required: 0,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 0,
        sort_order: 0,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      });

      const field = await createCustomizationField(mockDb, testSiteId, {
        productId: testProductId,
        name: 'Any Image',
        fieldType: 'image'
      });

      expect(field.fieldType).toBe('image');
      expect(field.mediaRequirements).toBeNull();
    });
  });

  describe('updateCustomizationField', () => {
    it('updates field properties', async () => {
      // First call: check field exists; second call: return updated
      mockDb.first
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Old Name',
          field_type: 'text',
          options: null,
          placeholder: null,
          required: 0,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: null,
          created_at: 1000,
          updated_at: 1000
        })
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Updated Name',
          field_type: 'text',
          options: null,
          placeholder: 'New placeholder',
          required: 1,
          max_length: 100,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 2.5,
          sort_order: 0,
          media_requirements: null,
          created_at: 1000,
          updated_at: 2000
        });

      const field = await updateCustomizationField(mockDb, testSiteId, testFieldId, {
        name: 'Updated Name',
        placeholder: 'New placeholder',
        required: true,
        maxLength: 100,
        priceModifier: 2.5
      });

      expect(field).not.toBeNull();
      expect(field!.name).toBe('Updated Name');
      expect(field!.placeholder).toBe('New placeholder');
      expect(field!.required).toBe(true);
      expect(field!.priceModifier).toBe(2.5);
    });

    it('updates media requirements on a field', async () => {
      const newReqs = { maxFileSize: 5242880, minWidth: 1024, minHeight: 768 };
      mockDb.first
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Photo Upload',
          field_type: 'image',
          options: null,
          placeholder: null,
          required: 1,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: null,
          created_at: 1000,
          updated_at: 1000
        })
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Photo Upload',
          field_type: 'image',
          options: null,
          placeholder: null,
          required: 1,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: JSON.stringify(newReqs),
          created_at: 1000,
          updated_at: 2000
        });

      const field = await updateCustomizationField(mockDb, testSiteId, testFieldId, {
        mediaRequirements: newReqs
      });

      expect(field).not.toBeNull();
      expect(field!.mediaRequirements).not.toBeNull();
      expect(field!.mediaRequirements!.maxFileSize).toBe(5242880);
      expect(field!.mediaRequirements!.minWidth).toBe(1024);
    });

    it('clears media requirements when set to null', async () => {
      mockDb.first
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Photo Upload',
          field_type: 'image',
          options: null,
          placeholder: null,
          required: 1,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: JSON.stringify({ minWidth: 800 }),
          created_at: 1000,
          updated_at: 1000
        })
        .mockResolvedValueOnce({
          id: testFieldId,
          site_id: testSiteId,
          product_id: testProductId,
          name: 'Photo Upload',
          field_type: 'image',
          options: null,
          placeholder: null,
          required: 1,
          max_length: null,
          min_value: null,
          max_value: null,
          default_value: null,
          price_modifier: 0,
          sort_order: 0,
          media_requirements: null,
          created_at: 1000,
          updated_at: 2000
        });

      const field = await updateCustomizationField(mockDb, testSiteId, testFieldId, {
        mediaRequirements: null
      });

      expect(field).not.toBeNull();
      expect(field!.mediaRequirements).toBeNull();
    });

    it('returns null when field not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const field = await updateCustomizationField(mockDb, testSiteId, 'nonexistent', {
        name: 'Updated'
      });

      expect(field).toBeNull();
    });

    it('returns existing field when no updates provided', async () => {
      const existing = {
        id: testFieldId,
        site_id: testSiteId,
        product_id: testProductId,
        name: 'Unchanged',
        field_type: 'text',
        options: null,
        placeholder: null,
        required: 0,
        max_length: null,
        min_value: null,
        max_value: null,
        default_value: null,
        price_modifier: 0,
        sort_order: 0,
        media_requirements: null,
        created_at: 1000,
        updated_at: 1000
      };

      mockDb.first.mockResolvedValue(existing);

      const field = await updateCustomizationField(mockDb, testSiteId, testFieldId, {});

      expect(field).not.toBeNull();
      expect(field!.name).toBe('Unchanged');
    });
  });

  describe('deleteCustomizationField', () => {
    it('deletes an existing field', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

      const result = await deleteCustomizationField(mockDb, testSiteId, testFieldId);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM'));
    });

    it('returns false when field not found', async () => {
      mockDb.run.mockResolvedValue({ success: true, meta: { changes: 0 } });

      const result = await deleteCustomizationField(mockDb, testSiteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
