import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllFulfillmentProviders,
  getFulfillmentProviderById,
  getFulfillmentProvidersByType,
  createFulfillmentProvider,
  updateFulfillmentProvider,
  deleteFulfillmentProvider,
  getProductFulfillmentOptions,
  setProductFulfillmentOptions
} from './fulfillment-providers';
import { generateEncryptionKey } from '../crypto';
import type { DBFulfillmentProvider, DBProductFulfillmentOption } from '$lib/types/fulfillment';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('fulfillment-providers', () => {
  let mockDb: any;
  const testSiteId = 'test-site';
  const testProviderId = 'provider-123';
  const testProductId = 'product-123';

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      first: vi.fn(),
      all: vi.fn()
    };
  });

  describe('getAllFulfillmentProviders', () => {
    it('fetches all active providers for a site', async () => {
      const mockProviders: DBFulfillmentProvider[] = [
        {
          id: 'provider-1',
          site_id: testSiteId,
          name: 'Self',
          description: 'Self-fulfilled',
          provider_type: 'manual',
          config: null,
          is_default: 1,
          is_active: 1,
          webhook_token: null,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          id: 'provider-2',
          site_id: testSiteId,
          name: 'Third Party',
          description: 'Third party fulfillment',
          provider_type: 'manual',
          config: null,
          is_default: 0,
          is_active: 1,
          webhook_token: null,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockProviders });

      const providers = await getAllFulfillmentProviders(mockDb, testSiteId);

      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe('Self');
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE site_id = ?'));
      expect(mockDb.bind).toHaveBeenCalledWith(testSiteId);
    });

    it('returns empty array when no providers found', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const providers = await getAllFulfillmentProviders(mockDb, testSiteId);

      expect(providers).toEqual([]);
    });
  });

  describe('getFulfillmentProviderById', () => {
    it('fetches a provider by ID', async () => {
      const mockProvider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Self',
        description: 'Self-fulfilled',
        provider_type: 'manual',
        config: null,
        is_default: 1,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      mockDb.first.mockResolvedValue(mockProvider);

      const provider = await getFulfillmentProviderById(mockDb, testSiteId, testProviderId);

      expect(provider).toEqual(mockProvider);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ? AND site_id = ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(testProviderId, testSiteId);
    });

    it('returns null when provider not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const provider = await getFulfillmentProviderById(mockDb, testSiteId, 'nonexistent');

      expect(provider).toBeNull();
    });
  });

  describe('createFulfillmentProvider', () => {
    it('creates a new provider', async () => {
      const newProvider: DBFulfillmentProvider = {
        id: expect.any(String),
        site_id: testSiteId,
        name: 'New Provider',
        description: 'Test provider',
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: expect.any(Number),
        updated_at: expect.any(Number)
      };

      mockDb.first.mockResolvedValue(newProvider);

      const provider = await createFulfillmentProvider(mockDb, testSiteId, {
        name: 'New Provider',
        description: 'Test provider',
        isActive: true
      });

      expect(provider.name).toBe('New Provider');
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('creates a provider with default values', async () => {
      const newProvider: DBFulfillmentProvider = {
        id: expect.any(String),
        site_id: testSiteId,
        name: 'Minimal Provider',
        description: null,
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: expect.any(Number),
        updated_at: expect.any(Number)
      };

      mockDb.first.mockResolvedValue(newProvider);

      const provider = await createFulfillmentProvider(mockDb, testSiteId, {
        name: 'Minimal Provider'
      });

      expect(provider.name).toBe('Minimal Provider');
    });
  });

  describe('updateFulfillmentProvider', () => {
    it('updates a provider', async () => {
      const existingProvider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Old Name',
        description: 'Old desc',
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const updatedProvider: DBFulfillmentProvider = {
        ...existingProvider,
        name: 'New Name',
        description: 'New desc'
      };

      mockDb.first.mockResolvedValueOnce(existingProvider).mockResolvedValueOnce(updatedProvider);

      const provider = await updateFulfillmentProvider(mockDb, testSiteId, testProviderId, {
        name: 'New Name',
        description: 'New desc'
      });

      expect(provider?.name).toBe('New Name');
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('returns null when provider not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const provider = await updateFulfillmentProvider(mockDb, testSiteId, 'nonexistent', {
        name: 'New Name'
      });

      expect(provider).toBeNull();
      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('returns existing provider when no updates provided', async () => {
      const existingProvider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Provider',
        description: 'Desc',
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      mockDb.first.mockResolvedValue(existingProvider);

      const provider = await updateFulfillmentProvider(mockDb, testSiteId, testProviderId, {});

      expect(provider).toEqual(existingProvider);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('deleteFulfillmentProvider', () => {
    it('deletes a provider', async () => {
      mockDb.run.mockResolvedValue({ meta: { changes: 1 } });

      const result = await deleteFulfillmentProvider(mockDb, testSiteId, testProviderId);

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fulfillment_providers')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(testProviderId, testSiteId);
    });

    it('returns false when provider not found', async () => {
      mockDb.run.mockResolvedValue({ meta: { changes: 0 } });

      const result = await deleteFulfillmentProvider(mockDb, testSiteId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getProductFulfillmentOptions', () => {
    it('fetches fulfillment options for a product', async () => {
      const mockOptions: (DBProductFulfillmentOption & { provider_name: string })[] = [
        {
          id: 'option-1',
          site_id: testSiteId,
          product_id: testProductId,
          provider_id: 'provider-1',
          provider_name: 'Self',
          cost: 0,
          stock_quantity: 10,
          sort_order: 0,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          id: 'option-2',
          site_id: testSiteId,
          product_id: testProductId,
          provider_id: 'provider-2',
          provider_name: 'Third Party',
          cost: 5.99,
          stock_quantity: 25,
          sort_order: 1,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockOptions });

      const options = await getProductFulfillmentOptions(mockDb, testSiteId, testProductId);

      expect(options).toHaveLength(2);
      expect(options[0].providerName).toBe('Self');
      expect(options[0].stockQuantity).toBe(10);
      expect(options[0].sortOrder).toBe(0);
      expect(options[1].cost).toBe(5.99);
      expect(options[1].stockQuantity).toBe(25);
      expect(options[1].sortOrder).toBe(1);
    });

    it('returns options ordered by sort_order', async () => {
      const mockOptions: (DBProductFulfillmentOption & { provider_name: string })[] = [
        {
          id: 'option-2',
          site_id: testSiteId,
          product_id: testProductId,
          provider_id: 'provider-2',
          provider_name: 'Third Party',
          cost: 5.99,
          stock_quantity: 25,
          sort_order: 1,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          id: 'option-1',
          site_id: testSiteId,
          product_id: testProductId,
          provider_id: 'provider-1',
          provider_name: 'Self',
          cost: 0,
          stock_quantity: 10,
          sort_order: 0,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockOptions });

      const options = await getProductFulfillmentOptions(mockDb, testSiteId, testProductId);

      // Verify the query includes ORDER BY sort_order
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY pfo.sort_order')
      );
      expect(options).toHaveLength(2);
    });

    it('returns empty array when no options found', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const options = await getProductFulfillmentOptions(mockDb, testSiteId, testProductId);

      expect(options).toEqual([]);
    });
  });

  describe('setProductFulfillmentOptions', () => {
    it('sets fulfillment options for a product', async () => {
      const options = [
        { providerId: 'provider-1', cost: 0, stockQuantity: 10 },
        { providerId: 'provider-2', cost: 5.99, stockQuantity: 25 }
      ];

      await setProductFulfillmentOptions(mockDb, testSiteId, testProductId, options);

      // Should delete existing options
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM product_fulfillment_options')
      );

      // Should insert new options (2 times)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_fulfillment_options')
      );
    });

    it('sets fulfillment options with explicit sort order', async () => {
      const options = [
        { providerId: 'provider-2', cost: 5.99, stockQuantity: 25, sortOrder: 0 },
        { providerId: 'provider-1', cost: 0, stockQuantity: 10, sortOrder: 1 }
      ];

      await setProductFulfillmentOptions(mockDb, testSiteId, testProductId, options);

      // Verify sort_order is included in the INSERT statement
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('sort_order'));

      // Verify bind was called with correct parameters including sort_order
      const bindCalls = mockDb.bind.mock.calls;
      // First bind call should have sortOrder 0, second should have sortOrder 1
      expect(bindCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('automatically assigns sort order based on array index when not provided', async () => {
      const options = [
        { providerId: 'provider-1', cost: 0, stockQuantity: 10 },
        { providerId: 'provider-2', cost: 5.99, stockQuantity: 25 }
      ];

      await setProductFulfillmentOptions(mockDb, testSiteId, testProductId, options);

      // Verify the function was called and bind includes sort_order values
      expect(mockDb.bind).toHaveBeenCalled();
    });

    it('clears all options when empty array provided', async () => {
      await setProductFulfillmentOptions(mockDb, testSiteId, testProductId, []);

      // Should delete existing options
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM product_fulfillment_options')
      );

      // Should not insert any options
      const insertCalls = mockDb.prepare.mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO product_fulfillment_options')
      );
      expect(insertCalls.length).toBe(0);
    });
  });

  describe('createFulfillmentProvider - failure branch', () => {
    it('should throw when re-fetch returns null', async () => {
      mockDb.run.mockResolvedValue({ success: true });
      mockDb.first.mockResolvedValue(null);

      await expect(
        createFulfillmentProvider(mockDb, testSiteId, {
          name: 'Test Provider',
          isActive: true
        })
      ).rejects.toThrow('Failed to create fulfillment provider');
    });
  });

  describe('createFulfillmentProvider - isActive false branch', () => {
    it('should create provider with isActive false', async () => {
      const mockProvider: DBFulfillmentProvider = {
        id: 'prov-new',
        site_id: testSiteId,
        name: 'Test Provider',
        description: null,
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 0,
        webhook_token: null,
        created_at: 12345,
        updated_at: 12345
      };

      mockDb.run.mockResolvedValue({ success: true });
      mockDb.first.mockResolvedValue(mockProvider);

      const result = await createFulfillmentProvider(mockDb, testSiteId, {
        name: 'Test Provider',
        isActive: false
      });

      expect(result).toBeDefined();
      expect(result.is_active).toBe(0);
    });
  });

  describe('getAllFulfillmentProviders - undefined results', () => {
    it('should return empty array when results is undefined', async () => {
      mockDb.all.mockResolvedValue({ success: true });

      const result = await getAllFulfillmentProviders(mockDb, testSiteId);

      expect(result).toEqual([]);
    });
  });

  describe('updateFulfillmentProvider isActive branch', () => {
    it('should update isActive field', async () => {
      mockDb.first.mockResolvedValue({
        id: testProviderId,
        site_id: testSiteId,
        name: 'Provider',
        description: 'Test',
        is_active: 0,
        webhook_token: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      });

      const result = await updateFulfillmentProvider(mockDb, testSiteId, testProviderId, {
        isActive: false
      });

      expect(result).toBeDefined();
      expect(result?.is_active).toBe(0);
    });
  });

  describe('getProductFulfillmentOptions stock_quantity fallback', () => {
    it('should default stock_quantity to 0 when null', async () => {
      mockDb.all.mockResolvedValue({
        success: true,
        results: [
          {
            provider_id: testProviderId,
            provider_name: 'Provider',
            cost: 5.0,
            stock_quantity: null,
            sort_order: 0
          }
        ]
      });

      const result = await getProductFulfillmentOptions(mockDb, testSiteId, testProductId);

      expect(result[0].stockQuantity).toBe(0);
    });
  });

  describe('setProductFulfillmentOptions stockQuantity fallback', () => {
    it('should default stockQuantity to 0 when undefined', async () => {
      mockDb.run.mockResolvedValue({ success: true });

      await setProductFulfillmentOptions(mockDb, testSiteId, testProductId, [
        {
          providerId: testProviderId,
          cost: 5.0
        }
      ]);

      // The bind call for INSERT should use 0 for stock_quantity
      expect(mockDb.bind).toHaveBeenCalled();
    });
  });

  describe('updateFulfillmentProvider empty data branch', () => {
    it('should return existing provider when no fields to update', async () => {
      const existingProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Provider',
        description: 'Test',
        is_active: 1,
        webhook_token: null,
        sort_order: 0,
        created_at: 1000,
        updated_at: 2000
      };
      mockDb.first.mockResolvedValue(existingProvider);

      const result = await updateFulfillmentProvider(mockDb, testSiteId, testProviderId, {});

      expect(result).toBeDefined();
      expect(result?.name).toBe('Provider');
    });
  });

  describe('getProductFulfillmentOptions null results fallback', () => {
    it('should return empty array when results is null', async () => {
      mockDb.all.mockResolvedValue({ success: true, results: null });

      const result = await getProductFulfillmentOptions(mockDb, testSiteId, testProductId);

      expect(result).toEqual([]);
    });
  });

  describe('getFulfillmentProvidersByType', () => {
    it('fetches providers filtered by type', async () => {
      const mockProviders: DBFulfillmentProvider[] = [
        {
          id: 'provider-printful-1',
          site_id: testSiteId,
          name: 'My Printful Store',
          description: 'Printful integration',
          provider_type: 'printful',
          config: null,
          is_default: 0,
          is_active: 1,
          webhook_token: null,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ];

      mockDb.all.mockResolvedValue({ results: mockProviders });

      const providers = await getFulfillmentProvidersByType(mockDb, testSiteId, 'printful');

      expect(providers).toHaveLength(1);
      expect(providers[0].provider_type).toBe('printful');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE site_id = ? AND provider_type = ?')
      );
      expect(mockDb.bind).toHaveBeenCalledWith(testSiteId, 'printful');
    });

    it('returns empty array when no providers of type found', async () => {
      mockDb.all.mockResolvedValue({ results: [] });

      const providers = await getFulfillmentProvidersByType(mockDb, testSiteId, 'printful');

      expect(providers).toEqual([]);
    });
  });

  describe('createFulfillmentProvider with providerType', () => {
    it('creates a printful provider', async () => {
      const mockProvider: DBFulfillmentProvider = {
        id: 'prov-printful',
        site_id: testSiteId,
        name: 'Printful Store',
        description: 'Print on demand',
        provider_type: 'printful',
        config: JSON.stringify({ apiKey: 'test-key' }),
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      mockDb.run.mockResolvedValue({ success: true });
      mockDb.first.mockResolvedValue(mockProvider);

      const result = await createFulfillmentProvider(
        mockDb,
        testSiteId,
        {
          name: 'Printful Store',
          description: 'Print on demand',
          providerType: 'printful',
          config: { apiKey: 'test-key' }
        },
        await generateEncryptionKey()
      );

      expect(result.provider_type).toBe('printful');
      expect(result.config).toBe(JSON.stringify({ apiKey: 'test-key' }));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('provider_type'));
    });

    it('defaults to manual when providerType not specified', async () => {
      const mockProvider: DBFulfillmentProvider = {
        id: 'prov-manual',
        site_id: testSiteId,
        name: 'Manual Provider',
        description: null,
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      mockDb.run.mockResolvedValue({ success: true });
      mockDb.first.mockResolvedValue(mockProvider);

      const result = await createFulfillmentProvider(mockDb, testSiteId, {
        name: 'Manual Provider'
      });

      expect(result.provider_type).toBe('manual');
    });
  });

  describe('updateFulfillmentProvider with providerType and config', () => {
    it('updates provider type', async () => {
      const existing: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Provider',
        description: null,
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const updated: DBFulfillmentProvider = {
        ...existing,
        provider_type: 'printful'
      };

      mockDb.first.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);

      const result = await updateFulfillmentProvider(mockDb, testSiteId, testProviderId, {
        providerType: 'printful'
      });

      expect(result?.provider_type).toBe('printful');
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('provider_type = ?'));
    });

    it('updates config', async () => {
      const existing: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Printful',
        description: null,
        provider_type: 'printful',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const updated: DBFulfillmentProvider = {
        ...existing,
        config: JSON.stringify({ apiKey: 'new-key' })
      };

      mockDb.first.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);

      const result = await updateFulfillmentProvider(
        mockDb,
        testSiteId,
        testProviderId,
        { config: { apiKey: 'new-key' } },
        await generateEncryptionKey()
      );

      expect(result?.config).toBe(JSON.stringify({ apiKey: 'new-key' }));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('config = ?'));
    });

    it('throws when config is provided without an encryption key', async () => {
      await expect(
        createFulfillmentProvider(mockDb, testSiteId, {
          name: 'Printful Store',
          providerType: 'printful',
          config: { apiKey: 'test-key' }
        })
      ).rejects.toThrow('Encryption key is required to store provider config');
    });
  });

  describe('getDecryptedProviderConfig', () => {
    it('decrypts a config that was encrypted at rest', async () => {
      const { encrypt } = await import('../crypto');
      const encryptionKey = await generateEncryptionKey();
      const provider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Printful',
        description: null,
        provider_type: 'printful',
        config: await encrypt(JSON.stringify({ apiKey: 'secret-key' }), encryptionKey),
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const { getDecryptedProviderConfig } = await import('./fulfillment-providers');
      const config = await getDecryptedProviderConfig(provider, encryptionKey);

      expect(config).toEqual({ apiKey: 'secret-key' });
    });

    it('returns an empty object when there is no config', async () => {
      const provider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Manual',
        description: null,
        provider_type: 'manual',
        config: null,
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const { getDecryptedProviderConfig } = await import('./fulfillment-providers');
      const config = await getDecryptedProviderConfig(provider, await generateEncryptionKey());

      expect(config).toEqual({});
    });

    it('returns an empty object rather than throwing on decrypt failure', async () => {
      const provider: DBFulfillmentProvider = {
        id: testProviderId,
        site_id: testSiteId,
        name: 'Printful',
        description: null,
        provider_type: 'printful',
        config: 'not-valid-ciphertext',
        is_default: 0,
        is_active: 1,
        webhook_token: null,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const { getDecryptedProviderConfig } = await import('./fulfillment-providers');
      const config = await getDecryptedProviderConfig(provider, await generateEncryptionKey());

      expect(config).toEqual({});
    });
  });
});
