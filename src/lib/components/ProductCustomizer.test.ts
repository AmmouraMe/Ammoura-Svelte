import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
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
      sortOrder: 0,
      printAreaId: null
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
      sortOrder: 1,
      printAreaId: null
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
        productId: 'test-product',
        media: mockMedia,
        zones: mockZones
      }
    });

    expect(screen.getByText('Design Your Product')).toBeInTheDocument();
    // The hint also documents the keyboard shortcuts, so match on the stable
    // leading instruction rather than the whole string.
    expect(screen.getByText(/Add artwork or text to a print area/)).toBeInTheDocument();
  });

  it('offers undo and redo, disabled until something changes', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
        media: [],
        zones: []
      }
    });

    expect(screen.getByTitle('Undo (last design change)')).toBeDisabled();
    expect(screen.getByTitle('Redo')).toBeDisabled();
  });

  it('renders the product image', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
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
        productId: 'test-product',
        media: mockMedia,
        zones: mockZones
      }
    });

    // zone-front has mediaId: null (visible on all), zone-back has mediaId: 'media-1' (visible on first image)
    expect(screen.getByLabelText('Print area: Front Logo')).toBeInTheDocument();
    expect(screen.getByLabelText('Print area: Back Print')).toBeInTheDocument();
  });

  it('renders zone names in controls section', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
        media: mockMedia,
        zones: mockZones
      }
    });

    // Zone names appear in both the overlay placeholder and the controls
    expect(screen.getAllByText('Front Logo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Back Print').length).toBeGreaterThanOrEqual(1);
  });

  it('offers both ways in on every empty zone', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
        media: mockMedia,
        zones: mockZones
      }
    });

    expect(screen.getAllByText('Add artwork').length).toBe(2);
    expect(screen.getAllByText('Add text').length).toBe(2);
  });

  it('renders media thumbnails when multiple images exist', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
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
        productId: 'test-product',
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
        productId: 'test-product',
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
        productId: 'test-product',
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
        productId: 'test-product',
        media: mockMedia,
        zones: []
      }
    });

    expect(screen.queryByText('Add artwork')).not.toBeInTheDocument();
  });

  it('renders zone overlays with correct positioning styles', () => {
    render(ProductCustomizer, {
      props: {
        productImage: '/fallback.jpg',
        productName: 'Test Shirt',
        productId: 'test-product',
        media: mockMedia,
        zones: mockZones
      }
    });

    const frontZone = screen.getByLabelText('Print area: Front Logo');
    expect(frontZone.style.left).toBe('30%');
    expect(frontZone.style.top).toBe('20%');
    expect(frontZone.style.width).toBe('40%');
    expect(frontZone.style.height).toBe('30%');
  });
});

describe('ProductCustomizer — designs of more than one thing', () => {
  const zone: ProductCustomizationZone = {
    id: 'zone-front',
    productId: 'prod-1',
    mediaId: null,
    name: 'Front Logo',
    xPercent: 25,
    yPercent: 25,
    widthPercent: 50,
    heightPercent: 50,
    maxFileSize: 10485760,
    allowedTypes: ['image/png'],
    sortOrder: 0,
    printAreaId: 'area-1'
  };

  const printAreas = {
    'area-1': { physWidth: 12, physHeight: 16, unit: 'in', requiredDpi: 150, name: 'Front' }
  };

  const baseProps = {
    productImage: '/fallback.jpg',
    productName: 'Test Shirt',
    productId: 'prod-1',
    media: [] as ProductMedia[],
    zones: [zone],
    printAreas
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the print area size and required resolution', () => {
    render(ProductCustomizer, { props: baseProps });
    expect(screen.getByText('12 × 16 in · 150 DPI')).toBeInTheDocument();
  });

  it('adds a line of text, and offers type and ink for it', async () => {
    render(ProductCustomizer, { props: baseProps });

    await fireEvent.click(screen.getByText('Add text'));

    // In the preview, and in the layer list under the zone.
    expect(screen.getByLabelText('Text: Your text')).toBeInTheDocument();
    expect(screen.getByLabelText('Font')).toBeInTheDocument();
    expect(screen.getByLabelText('Black')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Your text')).toBeInTheDocument();
  });

  it('stacks several elements, newest on top of the layer list', async () => {
    render(ProductCustomizer, { props: baseProps });

    await fireEvent.click(screen.getByText('Add text'));
    await fireEvent.input(screen.getByDisplayValue('Your text'), {
      target: { value: 'ONWARD' }
    });
    await fireEvent.click(screen.getByText('Add text'));

    const layers = screen.getAllByText(/ONWARD|Your text/);
    expect(layers.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('Text: ONWARD')).toBeInTheDocument();
  });

  it('enables undo once something has been added, and puts it back', async () => {
    render(ProductCustomizer, { props: baseProps });

    expect(screen.getByTitle('Undo (last design change)')).toBeDisabled();
    await fireEvent.click(screen.getByText('Add text'));
    expect(screen.getByTitle('Undo (last design change)')).toBeEnabled();

    await fireEvent.click(screen.getByTitle('Undo (last design change)'));
    expect(screen.queryByLabelText('Text: Your text')).not.toBeInTheDocument();
    expect(
      screen.getByText('Nothing here yet — add artwork or a line of text.')
    ).toBeInTheDocument();
  });

  it('tells the cart about the elements, not just a single upload', async () => {
    const { component } = render(ProductCustomizer, { props: baseProps });
    const changes: unknown[] = [];
    component.$on('customizationsChange', (e) => changes.push(e.detail));

    await fireEvent.click(screen.getByText('Add text'));

    const latest = changes.at(-1) as Array<{
      zoneId: string;
      elements?: Array<{ kind: string; text?: string }>;
      imageDataUrl: string;
      designId?: string;
      designRevision?: number;
    }>;
    expect(latest).toHaveLength(1);
    expect(latest[0].zoneId).toBe('zone-front');
    expect(latest[0].elements?.[0]).toMatchObject({ kind: 'text', text: 'Your text' });
    // A text-only design has no artwork file behind it.
    expect(latest[0].imageDataUrl).toBe('');
    expect(latest[0].designId).toBeTruthy();
    expect(latest[0].designRevision).toBe(1);
  });

  it('removes an element from the layer list', async () => {
    render(ProductCustomizer, { props: baseProps });

    await fireEvent.click(screen.getByText('Add text'));
    await fireEvent.click(screen.getByLabelText('Remove Your text from Front Logo'));

    expect(screen.queryByLabelText('Text: Your text')).not.toBeInTheDocument();
  });

  it('reads an older single-upload design back as an element', async () => {
    render(ProductCustomizer, {
      props: {
        ...baseProps,
        initialCustomizations: [
          {
            zoneId: 'zone-front',
            zoneName: 'Front Logo',
            imageDataUrl: '/api/media/m1',
            mediaId: 'm1',
            naturalWidth: 2000,
            naturalHeight: 2000,
            originalFilename: 'logo.png',
            offsetXPercent: 0,
            offsetYPercent: 0,
            scale: 1,
            rotation: 0
          }
        ]
      }
    });

    await tick();
    expect(screen.getByLabelText('Artwork: logo.png')).toBeInTheDocument();
    expect(screen.getByText(/DPI/)).toBeInTheDocument();
  });

  it('picks a restored draft up where it was left', async () => {
    const { unmount } = render(ProductCustomizer, { props: baseProps });
    await fireEvent.click(screen.getByText('Add text'));
    await fireEvent.input(screen.getByDisplayValue('Your text'), {
      target: { value: 'SAVED' }
    });
    await fireEvent.click(screen.getByText('Add text'));
    unmount();

    render(ProductCustomizer, { props: baseProps });
    await tick();
    expect(screen.getByLabelText('Text: SAVED')).toBeInTheDocument();
    expect(screen.getByText('Start over')).toBeInTheDocument();

    await fireEvent.click(screen.getByText('Start over'));
    expect(screen.queryByLabelText('Text: SAVED')).not.toBeInTheDocument();
  });
});
