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
      expect(fields[1].name).toBe('Font Style');
      expect(fields[1].fieldType).toBe('select');
      expect(fields[1].options).toEqual(['Arial', 'Times New Roman', 'Comic Sans']);
      expect(fields[1].defaultValue).toBe('Arial');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND product_id = ?')
      );
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
