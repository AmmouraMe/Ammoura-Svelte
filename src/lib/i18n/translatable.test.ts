import { describe, it, expect } from 'vitest';
import {
  extractTranslatableFields,
  getConfigValueByPath,
  setConfigValueByPath
} from './translatable';

const tree = [
  {
    id: 'hero-1',
    type: 'hero',
    config: {
      backgroundColor: 'transparent',
      children: [
        {
          id: 'hero-title',
          type: 'heading',
          config: { heading: 'Welcome to my store', level: 1 }
        },
        {
          id: 'hero-text',
          type: 'text',
          config: { text: 'The best products around.' }
        }
      ]
    }
  },
  {
    id: 'features-1',
    type: 'features',
    config: {
      title: 'Why us',
      items: [
        { title: 'Fast', description: 'Ships quickly' },
        { title: 'Cheap', description: '' }
      ]
    }
  },
  {
    id: 'temp-1751234',
    type: 'button',
    config: { label: 'Buy now', url: '/shop' }
  }
];

describe('extractTranslatableFields', () => {
  it('extracts text fields from nested children and arrays', () => {
    const fields = extractTranslatableFields(tree);
    const paths = fields.map((f) => f.field);
    expect(paths).toContain('hero-title:heading');
    expect(paths).toContain('hero-text:text');
    expect(paths).toContain('features-1:title');
    expect(paths).toContain('features-1:items.0.title');
    expect(paths).toContain('features-1:items.0.description');
    expect(paths).toContain('features-1:items.1.title');
    expect(paths).toContain('temp-1751234:label');
  });

  it('skips empty strings and non-string config values', () => {
    const paths = extractTranslatableFields(tree).map((f) => f.field);
    expect(paths).not.toContain('features-1:items.1.description'); // empty
    expect(paths).not.toContain('hero-title:level'); // number
    expect(paths).not.toContain('temp-1751234:url'); // not whitelisted
  });

  it('carries the source text for the editor', () => {
    const field = extractTranslatableFields(tree).find((f) => f.field === 'hero-title:heading');
    expect(field?.source).toBe('Welcome to my store');
  });
});

describe('config path helpers', () => {
  it('reads nested and indexed paths', () => {
    const config = tree[1].config as Record<string, unknown>;
    expect(getConfigValueByPath(config, 'items.0.title')).toBe('Fast');
    expect(getConfigValueByPath(config, 'items.9.title')).toBeUndefined();
  });

  it('writes only into existing string slots', () => {
    const config = JSON.parse(JSON.stringify(tree[1].config)) as Record<string, unknown>;
    expect(setConfigValueByPath(config, 'items.0.title', 'Rápido')).toBe(true);
    expect(getConfigValueByPath(config, 'items.0.title')).toBe('Rápido');
    // Must not invent structure for stale paths
    expect(setConfigValueByPath(config, 'items.5.title', 'Nope')).toBe(false);
    expect(setConfigValueByPath(config, 'missing.deep.path', 'Nope')).toBe(false);
  });
});
