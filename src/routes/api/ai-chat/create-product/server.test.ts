import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestHandler } from './$types';
import * as dbConnection from '$lib/server/db/connection';
import * as productsDb from '$lib/server/db/products';
import * as mediaDb from '$lib/server/db/media';
import * as fulfillmentDb from '$lib/server/db/fulfillment-providers';
import * as activityLogger from '$lib/server/activity-logger';

type ExtractRequestEvent<T> = T extends (event: infer E) => unknown ? E : never;
type MockRequestEvent = ExtractRequestEvent<RequestHandler>;
interface ProductCreationResponse {
  success: boolean;
  product?: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
}

vi.mock('$lib/server/db/connection');
vi.mock('$lib/server/db/products');
vi.mock('$lib/server/db/media');
vi.mock('$lib/server/db/fulfillment-providers');
vi.mock('$lib/server/activity-logger');

describe('POST /api/ai-chat/create-product', () => {
  const mockDb = {} as D1Database;
  const mockPlatform = { env: { DB: mockDb, ENCRYPTION_KEY: 'test-key' } };
  const mockUser = { id: 'user-1', role: 'admin' };
  const mockSiteId = 'site-1';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbConnection.getDB).mockReturnValue(mockDb);
  });

  it('creates product with attachments', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1","tag2"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const mockMedia = {
      id: 'media-1',
      site_id: mockSiteId,
      product_id: 'product-1',
      type: 'image' as const,
      url: '/api/media/test.jpg',
      thumbnail_url: null,
      filename: 'test.jpg',
      size: 1024,
      mime_type: 'image/jpeg',
      width: 800,
      height: 600,
      duration: null,
      display_order: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(mediaDb.createProductMedia).mockResolvedValue(mockMedia);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1', 'tag2']
        },
        attachments: [
          {
            id: 'media-1',
            type: 'image',
            url: '/api/media/test.jpg',
            filename: 'test.jpg',
            mimeType: 'image/jpeg',
            size: 1024
          }
        ]
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(productsDb.createProduct).toHaveBeenCalledWith(mockDb, mockSiteId, {
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical',
      stock: 10,
      tags: ['tag1', 'tag2'],
      image: ''
    });

    expect(mediaDb.createProductMedia).toHaveBeenCalledWith(mockDb, mockSiteId, {
      productId: 'product-1',
      type: 'image',
      url: '/api/media/test.jpg',
      filename: 'test.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      displayOrder: 0
    });

    expect(activityLogger.logActivity).toHaveBeenCalledWith(mockDb, {
      siteId: mockSiteId,
      userId: mockUser.id,
      action: 'Created product via AI chat',
      description: expect.stringContaining('with 1 image(s)'),
      entityType: 'product',
      entityId: 'product-1',
      entityName: 'Test Product'
    });

    expect(data.success).toBe(true);
    expect(data.product?.name).toBe('Test Product');
  });

  it('creates product without attachments', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1","tag2"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1', 'tag2']
        },
        attachments: []
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(productsDb.createProduct).toHaveBeenCalled();
    expect(mediaDb.createProductMedia).not.toHaveBeenCalled();
    expect(activityLogger.logActivity).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        description: expect.not.stringContaining('with')
      })
    );
    expect(data.success).toBe(true);
  });

  it('continues creating other media if one fails', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const mockMedia2 = {
      id: 'media-2',
      site_id: mockSiteId,
      product_id: 'product-1',
      type: 'image' as const,
      url: '/api/media/test2.jpg',
      thumbnail_url: null,
      filename: 'test2.jpg',
      size: 2048,
      mime_type: 'image/jpeg',
      width: 1024,
      height: 768,
      duration: null,
      display_order: 1,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(mediaDb.createProductMedia)
      .mockRejectedValueOnce(new Error('Media creation failed'))
      .mockResolvedValueOnce(mockMedia2);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1']
        },
        attachments: [
          {
            id: 'media-1',
            type: 'image',
            url: '/api/media/test1.jpg',
            filename: 'test1.jpg',
            mimeType: 'image/jpeg',
            size: 1024
          },
          {
            id: 'media-2',
            type: 'image',
            url: '/api/media/test2.jpg',
            filename: 'test2.jpg',
            mimeType: 'image/jpeg',
            size: 2048
          }
        ]
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(mediaDb.createProductMedia).toHaveBeenCalledTimes(2);
    expect(activityLogger.logActivity).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        description: expect.stringContaining('with 1 image(s)')
      })
    );
    expect(data.success).toBe(true);
  });

  it('only processes image attachments', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1']
        },
        attachments: [
          {
            id: 'media-1',
            type: 'video',
            url: '/api/media/test.mp4',
            filename: 'test.mp4',
            mimeType: 'video/mp4',
            size: 10240
          }
        ]
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    await response.json();

    expect(mediaDb.createProductMedia).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({})
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: null,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    await expect(POST(mockEvent)).rejects.toThrow();
  });

  it('requires admin role', async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({})
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: { id: 'user-1', role: 'customer' },
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    await expect(POST(mockEvent)).rejects.toThrow();
  });

  it('creates product with fulfillment options', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1","tag2"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(fulfillmentDb.setProductFulfillmentOptions).mockResolvedValue(undefined);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1', 'tag2'],
          fulfillmentOptions: [
            {
              providerId: 'provider-1',
              providerName: 'In-House',
              cost: 15.0,
              stockQuantity: 50,
              enabled: true
            },
            {
              providerId: 'provider-2',
              providerName: 'Amazon FBA',
              cost: 18.0,
              stockQuantity: 30,
              enabled: true
            }
          ]
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(productsDb.createProduct).toHaveBeenCalledWith(mockDb, mockSiteId, {
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical',
      stock: 10,
      tags: ['tag1', 'tag2'],
      image: ''
    });

    expect(fulfillmentDb.setProductFulfillmentOptions).toHaveBeenCalledWith(
      mockDb,
      mockSiteId,
      'product-1',
      [
        {
          providerId: 'provider-1',
          cost: 15.0,
          stockQuantity: 50,
          sortOrder: 0
        },
        {
          providerId: 'provider-2',
          cost: 18.0,
          stockQuantity: 30,
          sortOrder: 1
        }
      ]
    );

    expect(data.success).toBe(true);
    expect(data.product?.name).toBe('Test Product');
  });

  it('filters out disabled fulfillment options', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(fulfillmentDb.setProductFulfillmentOptions).mockResolvedValue(undefined);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1'],
          fulfillmentOptions: [
            {
              providerId: 'provider-1',
              cost: 15.0,
              stockQuantity: 50,
              enabled: true
            },
            {
              providerId: 'provider-2',
              cost: 18.0,
              stockQuantity: 30,
              enabled: false
            }
          ]
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    await POST(mockEvent);

    expect(fulfillmentDb.setProductFulfillmentOptions).toHaveBeenCalledWith(
      mockDb,
      mockSiteId,
      'product-1',
      [
        {
          providerId: 'provider-1',
          cost: 15.0,
          stockQuantity: 50,
          sortOrder: 0
        }
      ]
    );
  });

  it('does not set fulfillment options when none provided', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1']
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    await POST(mockEvent);

    expect(fulfillmentDb.setProductFulfillmentOptions).not.toHaveBeenCalled();
  });

  it('creates new fulfillment provider when requested', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const mockNewProvider = {
      id: 'provider-new',
      site_id: mockSiteId,
      name: 'Amazon FBA',
      description: 'Amazon Fulfillment Center',
      provider_type: 'manual',
      config: null,
      is_default: 0,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(fulfillmentDb.createFulfillmentProvider).mockResolvedValue(mockNewProvider);
    vi.mocked(fulfillmentDb.setProductFulfillmentOptions).mockResolvedValue(undefined);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1'],
          fulfillmentOptions: [
            {
              providerId: 'CREATE_NEW',
              providerName: 'Amazon FBA',
              cost: 18.0,
              stockQuantity: 50,
              enabled: true,
              createProvider: true,
              description: 'Amazon Fulfillment Center'
            }
          ]
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(fulfillmentDb.createFulfillmentProvider).toHaveBeenCalledWith(mockDb, mockSiteId, {
      name: 'Amazon FBA',
      description: 'Amazon Fulfillment Center',
      isActive: true
    });

    expect(fulfillmentDb.setProductFulfillmentOptions).toHaveBeenCalledWith(
      mockDb,
      mockSiteId,
      'product-1',
      [
        {
          providerId: 'provider-new',
          cost: 18.0,
          stockQuantity: 50,
          sortOrder: 0
        }
      ]
    );

    expect(activityLogger.logActivity).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        action: 'Created fulfillment provider via AI',
        description: expect.stringContaining('Amazon FBA')
      })
    );

    expect(data.success).toBe(true);
  });

  it('creates product with mix of existing and new providers', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const mockNewProvider = {
      id: 'provider-new',
      site_id: mockSiteId,
      name: 'Warehouse 2',
      description: 'Secondary warehouse',
      provider_type: 'manual',
      config: null,
      is_default: 0,
      is_active: 1,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);
    vi.mocked(fulfillmentDb.createFulfillmentProvider).mockResolvedValue(mockNewProvider);
    vi.mocked(fulfillmentDb.setProductFulfillmentOptions).mockResolvedValue(undefined);
    vi.mocked(activityLogger.logActivity).mockResolvedValue(undefined);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1'],
          fulfillmentOptions: [
            {
              providerId: 'provider-existing',
              providerName: 'In-House',
              cost: 15.0,
              stockQuantity: 30,
              enabled: true
            },
            {
              providerId: 'CREATE_NEW',
              providerName: 'Warehouse 2',
              cost: 12.0,
              stockQuantity: 20,
              enabled: true,
              createProvider: true,
              description: 'Secondary warehouse'
            }
          ]
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    const response = await POST(mockEvent);
    const data = (await response.json()) as ProductCreationResponse;

    expect(fulfillmentDb.createFulfillmentProvider).toHaveBeenCalledWith(mockDb, mockSiteId, {
      name: 'Warehouse 2',
      description: 'Secondary warehouse',
      isActive: true
    });

    expect(fulfillmentDb.setProductFulfillmentOptions).toHaveBeenCalledWith(
      mockDb,
      mockSiteId,
      'product-1',
      [
        {
          providerId: 'provider-existing',
          cost: 15.0,
          stockQuantity: 30,
          sortOrder: 0
        },
        {
          providerId: 'provider-new',
          cost: 12.0,
          stockQuantity: 20,
          sortOrder: 1
        }
      ]
    );

    expect(data.success).toBe(true);
  });

  it('throws error when creating provider without name', async () => {
    const mockProduct = {
      id: 'product-1',
      site_id: mockSiteId,
      name: 'Test Product',
      description: 'Test description',
      price: 29.99,
      category: 'electronics',
      type: 'physical' as const,
      stock: 10,
      tags: '["tag1"]',
      image: '',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    vi.mocked(productsDb.createProduct).mockResolvedValue(mockProduct);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        product: {
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          type: 'physical',
          stock: 10,
          tags: ['tag1'],
          fulfillmentOptions: [
            {
              providerId: 'CREATE_NEW',
              cost: 18.0,
              stockQuantity: 50,
              enabled: true,
              createProvider: true
              // Missing providerName
            }
          ]
        }
      })
    } as unknown as Request;

    const mockEvent = {
      request: mockRequest,
      platform: mockPlatform,
      locals: {
        currentUser: mockUser,
        siteId: mockSiteId
      }
    } as unknown as MockRequestEvent;

    try {
      await POST(mockEvent);
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err).toBeDefined();
      expect((err as { status: number }).status).toBe(400);
    }
  });
});
