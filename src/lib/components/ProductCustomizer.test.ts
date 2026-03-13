import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ProductCustomizer from './ProductCustomizer.svelte';
import type { ProductCustomizationZone } from '$lib/types/customization';
import type { ProductMedia } from '$lib/types/media';

// Mock toast store
vi.mock('$lib/stores/toast', () => ({
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}));

describe('ProductCustomizer', () => {
  const mockZones: ProductCustomizationZone[] = [
    {
      id: 'zone-front',
      productId: 'prod-1',
      mediaId: null,
      name: 'Front Logo',
      xPercent: 30,
      yPercent: 20,
      widthPercent: 40,
      heightPercent: 30,
      maxFileSize: 10485760,
      allowedTypes: ['image/png', 'image/jpeg'],
      sortOrder: 0
    },
    {
      id: 'zone-back',
      productId: 'prod-1',
      mediaId: 'media-1',
      name: 'Back Print',
      xPercent: 20,
      yPercent: 10,
      widthPercent: 60,
      heightPercent: 50,
      maxFileSize: 5242880,
      allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
      sortOrder: 1
    }
  ];

  const mockMedia: ProductMedia[] = [
    {
      id: 'media-1',
      productId: 'prod-1',
      type: 'image',
      url: '/images/front.jpg',
      filename: 'front.jpg',
      size: 50000,
      mimeType: 'image/jpeg',
      displayOrder: 0
    },
    {
      id: 'media-2',
      productId: 'prod-1',
      type: 'image',
      url: '/images/back.jpg',
      filename: 'back.jpg',
      size: 60000,
      mimeType: 'image/jpeg',
      displayOrder: 1
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the customizer header', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    expect(screen.getByText('Customize Your Product')).toBeInTheDocument();
    expect(screen.getByText('Click a zone to upload your design')).toBeInTheDocument();
  });

  it('renders the product image', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    const img = screen.getByAltText('Test Shirt');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/front.jpg');
  });

  it('renders visible zones for the current media', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    // zone-front has mediaId: null (visible on all), zone-back has mediaId: 'media-1' (visible on first image)
    expect(screen.getByLabelText('Customization zone: Front Logo')).toBeInTheDocument();
    expect(screen.getByLabelText('Customization zone: Back Print')).toBeInTheDocument();
  });

  it('renders zone names in controls section', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    // Zone names appear in both the overlay placeholder and the controls
    expect(screen.getAllByText('Front Logo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Back Print').length).toBeGreaterThanOrEqual(1);
  });

  it('renders upload buttons for empty zones', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    const uploadButtons = screen.getAllByText('Upload Design');
    expect(uploadButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders media thumbnails when multiple images exist', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    expect(screen.getByLabelText('View image 1')).toBeInTheDocument();
    expect(screen.getByLabelText('View image 2')).toBeInTheDocument();
  });

  it('does not render media thumbnails with single image', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: [mockMedia[0]],
        zones: mockZones
      }
    });

    expect(screen.queryByLabelText('View image 1')).not.toBeInTheDocument();
  });

  it('uses fallback image when no media provided', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: [],
        zones: []
      }
    });

    const img = screen.getByAltText('Test Shirt');
    expect(img).toHaveAttribute('src', '/fallback.jpg');
  });

  it('switches media on thumbnail click', async () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    const secondThumb = screen.getByLabelText('View image 2');
    await fireEvent.click(secondThumb);

    const img = screen.getByAltText('Test Shirt');
    expect(img).toHaveAttribute('src', '/images/back.jpg');
  });

  it('shows no zones section when product has no zones', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: []
      }
    });

    expect(screen.queryByText('Upload Design')).not.toBeInTheDocument();
  });

  it('renders zone overlays with correct positioning styles', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        media: mockMedia,
        zones: mockZones
      }
    });

    const frontZone = screen.getByLabelText('Customization zone: Front Logo');
    expect(frontZone.style.left).toBe('30%');
    expect(frontZone.style.top).toBe('20%');
    expect(frontZone.style.width).toBe('40%');
    expect(frontZone.style.height).toBe('30%');
  });
});
