import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  translateComponents,
  translateProducts,
  translateGeneralSettings,
  upsertEntityTranslations
} from './content-translations';

function dbReturningRows(rows: Array<Record<string, unknown>>): D1Database {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: rows }),
    run: vi.fn().mockResolvedValue({})
  };
  return {
    prepare: vi.fn().mockReturnValue(statement),
    batch: vi.fn().mockResolvedValue([])
  } as unknown as D1Database;
}

const components = [
  {
    id: 'w1',
    type: 'heading',
    config: { heading: 'Welcome', level: 1 }
  },
  {
    id: 'w2',
    type: 'container',
    config: {
      children: [{ id: 'w3', type: 'text', config: { text: 'Hello there' } }]
    }
  }
];

describe('translateComponents', () => {
  it('no-ops for the default locale without touching the DB', async () => {
    const db = dbReturningRows([]);
    const result = await translateComponents(db, 'site-1', 'en', 'en', 'page-1', components);
    expect(result).toBe(components);
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it('overlays translated fields and leaves untranslated ones as source', async () => {
    const db = dbReturningRows([
      { field: 'w1:heading', value: 'Bienvenido' },
      { field: 'w3:text', value: 'Hola' },
      { field: 'gone:text', value: 'orphan row for a deleted widget' }
    ]);
    interface AnyWidget {
      config: Record<string, unknown> & { children?: AnyWidget[] };
    }
    const result = (await translateComponents(
      db,
      'site-1',
      'es',
      'en',
      'page-1',
      components
    )) as unknown as AnyWidget[];

    expect(result[0].config.heading).toBe('Bienvenido');
    expect(result[1].config.children?.[0].config.text).toBe('Hola');
    // input not mutated
    expect(components[0].config.heading).toBe('Welcome');
  });

  it('returns input unchanged when no translations exist', async () => {
    const db = dbReturningRows([]);
    const result = await translateComponents(db, 'site-1', 'es', 'en', 'page-1', components);
    expect(result).toBe(components);
  });
});

describe('translateProducts', () => {
  it('overlays name/description per product', async () => {
    const db = dbReturningRows([
      { entity_id: 'p1', field: 'name', value: 'Camiseta' },
      { entity_id: 'p1', field: 'description', value: 'Muy bonita' }
    ]);
    const products = [
      { id: 'p1', name: 'T-Shirt', description: 'Very nice' },
      { id: 'p2', name: 'Mug', description: 'A mug' }
    ];
    const result = await translateProducts(db, 'site-1', 'es', 'en', products);
    expect(result[0].name).toBe('Camiseta');
    expect(result[0].description).toBe('Muy bonita');
    expect(result[1].name).toBe('Mug');
    expect(products[0].name).toBe('T-Shirt');
  });
});

describe('translateGeneralSettings', () => {
  it('overlays store name and tagline', async () => {
    const db = dbReturningRows([{ field: 'general_store_name', value: 'Mi Tienda' }]);
    const settings = {
      storeName: 'My Store',
      tagline: 'Nice things',
      description: '',
      storeEmail: '',
      supportEmail: '',
      contactPhone: '',
      currency: 'USD',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weightUnit: 'lb',
      dimensionUnit: 'in'
    };
    const result = await translateGeneralSettings(db, 'site-1', 'es', 'en', settings);
    expect(result.storeName).toBe('Mi Tienda');
    expect(result.tagline).toBe('Nice things');
  });
});

describe('upsertEntityTranslations', () => {
  let db: D1Database;
  let prepared: string[];

  beforeEach(() => {
    prepared = [];
    const statement = {
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({})
    };
    db = {
      prepare: vi.fn((sql: string) => {
        prepared.push(sql);
        return statement;
      }),
      batch: vi.fn().mockResolvedValue([])
    } as unknown as D1Database;
  });

  it('upserts non-empty values and deletes empty ones in one batch', async () => {
    await upsertEntityTranslations(db, 'site-1', 'es', 'page_widget', 'page-1', {
      'w1:heading': 'Bienvenido',
      'w3:text': ''
    });
    expect(db.batch).toHaveBeenCalledOnce();
    expect(prepared.some((sql) => sql.includes('INSERT INTO content_translations'))).toBe(true);
    expect(prepared.some((sql) => sql.startsWith('DELETE FROM content_translations'))).toBe(true);
  });

  it('does nothing for an empty entry set', async () => {
    await upsertEntityTranslations(db, 'site-1', 'es', 'page_widget', 'page-1', {});
    expect(db.batch).not.toHaveBeenCalled();
  });
});
