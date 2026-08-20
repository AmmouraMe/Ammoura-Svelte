import { describe, it, expect } from 'vitest';
import {
  MAX_ELEMENTS_PER_ZONE,
  MAX_TEXT_LENGTH,
  buildOrderItemCustomizationStatements,
  readElements,
  sanitizeElements,
  type DBOrderItemCustomization,
  type OrderItemCustomizationInput
} from './order-customizations';
import type { DesignElement } from '$lib/utils/designElements';

const IMAGE: DesignElement = {
  kind: 'image',
  id: 'el-1',
  src: '/api/media/m1',
  mediaId: 'm1',
  name: 'logo.png',
  naturalWidth: 3000,
  naturalHeight: 2000,
  place: { xIn: 1, yIn: 2, widthIn: 6, heightIn: 4, rotation: 15 }
};

const TEXT: DesignElement = {
  kind: 'text',
  id: 'el-2',
  text: 'ONWARD',
  color: '#ffffff',
  font: "'Bebas Neue', sans-serif",
  place: { xIn: 0, yIn: 8, widthIn: 8, heightIn: 2, rotation: 0 }
};

function input(over: Partial<OrderItemCustomizationInput> = {}): OrderItemCustomizationInput {
  return {
    zoneId: 'zone-1',
    zoneName: 'Front',
    elements: [IMAGE, TEXT],
    designId: 'design-1',
    designRevision: 2,
    mediaId: 'm1',
    imageUrl: '/api/media/m1',
    originalFilename: 'logo.png',
    offsetXPercent: 0,
    offsetYPercent: 0,
    scale: 1,
    rotation: 15,
    ...over
  };
}

function row(over: Partial<DBOrderItemCustomization> = {}): DBOrderItemCustomization {
  return {
    id: 'c1',
    order_item_id: 'oi1',
    zone_id: 'zone-1',
    zone_name: 'Front',
    elements: null,
    design_id: null,
    design_revision: 1,
    media_id: 'm1',
    image_url: '/api/media/m1',
    original_filename: 'logo.png',
    offset_x_percent: 0,
    offset_y_percent: 0,
    scale: 1,
    rotation: 15,
    created_at: 1_700_000_000,
    ...over
  };
}

describe('sanitizeElements', () => {
  it('keeps a well-formed design intact', () => {
    expect(sanitizeElements([IMAGE, TEXT])).toEqual([IMAGE, TEXT]);
  });

  it('refuses anything that is not a list', () => {
    expect(sanitizeElements(null)).toEqual([]);
    expect(sanitizeElements('elements')).toEqual([]);
    expect(sanitizeElements({ 0: IMAGE })).toEqual([]);
  });

  it('drops kinds it cannot print and entries with no id', () => {
    const out = sanitizeElements([
      IMAGE,
      { kind: 'video', id: 'el-9', place: IMAGE.place },
      { kind: 'text', text: 'no id', place: IMAGE.place }
    ]);
    expect(out.map((e) => e.id)).toEqual(['el-1']);
  });

  it('drops an image with no source to render', () => {
    expect(sanitizeElements([{ ...IMAGE, src: '' }])).toEqual([]);
  });

  it('caps how much of a design one zone may carry', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ ...TEXT, id: `el-${i}` }));
    expect(sanitizeElements(many)).toHaveLength(MAX_ELEMENTS_PER_ZONE);
  });

  it('truncates a novel submitted as a line of text', () => {
    const long = sanitizeElements([{ ...TEXT, text: 'x'.repeat(10_000) }])[0];
    expect((long as { text: string }).text).toHaveLength(MAX_TEXT_LENGTH);
  });

  it('coerces placement values that are not finite numbers', () => {
    const out = sanitizeElements([
      { ...TEXT, place: { xIn: 'left', yIn: NaN, widthIn: Infinity, heightIn: null, rotation: 45 } }
    ]);
    expect(out[0].place).toEqual({ xIn: 0, yIn: 0, widthIn: 1, heightIn: 1, rotation: 45 });
  });

  it('keeps the mirror flag only when it is really set', () => {
    expect(sanitizeElements([{ ...IMAGE, flipped: true }])[0].flipped).toBe(true);
    expect(sanitizeElements([{ ...IMAGE, flipped: 'yes' }])[0].flipped).toBeUndefined();
  });
});

describe('buildOrderItemCustomizationStatements', () => {
  it('writes the design alongside the columns that describe its first image', () => {
    const [statement] = buildOrderItemCustomizationStatements('oi1', [input()], []);
    expect(statement.sql).toContain('elements');
    const stored = JSON.parse(statement.params[4] as string);
    expect(stored).toHaveLength(2);
    expect(statement.params[5]).toBe('design-1');
    expect(statement.params[6]).toBe(2);
    expect(statement.params[8]).toBe('/api/media/m1');
  });

  it('stores no design at all rather than an empty list', () => {
    const [statement] = buildOrderItemCustomizationStatements('oi1', [input({ elements: [] })], []);
    expect(statement.params[4]).toBeNull();
  });

  it('defaults an order with no revision to the first one', () => {
    const [statement] = buildOrderItemCustomizationStatements(
      'oi1',
      [input({ designRevision: undefined })],
      []
    );
    expect(statement.params[6]).toBe(1);
  });
});

describe('readElements', () => {
  it('reads a stored design back', () => {
    expect(readElements(row({ elements: JSON.stringify([IMAGE, TEXT]) }))).toEqual([IMAGE, TEXT]);
  });

  it('falls back to the legacy columns for an order written before 0102', () => {
    const out = readElements(row());
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'image', src: '/api/media/m1', name: 'logo.png' });
    expect(out[0].place.rotation).toBe(15);
    // No inches were ever recorded for these, and none are invented.
    expect(out[0].place.widthIn).toBe(0);
  });

  it('falls back rather than throwing on a row it cannot parse', () => {
    expect(readElements(row({ elements: '{not json' }))).toHaveLength(1);
  });

  it('returns nothing for a row with neither a design nor an image', () => {
    expect(readElements(row({ image_url: '' }))).toEqual([]);
  });
});
