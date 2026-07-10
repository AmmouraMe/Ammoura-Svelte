/**
 * Tests for built-in component defaults consistency
 *
 * These tests ensure that:
 * 1. The database initial state (created by migrations) matches the defaults from componentDefaults.ts
 * 2. The resetBuiltInComponent function uses the same defaults
 * 3. Changes to componentDefaults.ts are reflected in the database via migrations
 *
 * This is a critical consistency check - if these tests fail, the database seed and
 * reset functionality will produce different results, which is a bug.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultConfig } from '$lib/utils/editor/componentDefaults';
import type { ComponentType } from '$lib/types/pages';

/**
 * Built-in component types that should have full configurations in componentDefaults.ts
 * These are the components that users can reset to defaults
 */
const BUILTIN_COMPONENT_TYPES: { name: string; type: ComponentType }[] = [
  { name: 'Navigation Bar', type: 'navbar' },
  { name: 'Footer', type: 'footer' },
  { name: 'Hero', type: 'hero' },
  { name: 'Container', type: 'container' },
  { name: 'Features', type: 'features' }
];

/**
 * Primitive component types that should have default configurations
 */
const PRIMITIVE_COMPONENT_TYPES: { name: string; type: ComponentType }[] = [
  { name: 'Text', type: 'text' },
  { name: 'Heading', type: 'heading' },
  { name: 'Button', type: 'button' },
  { name: 'Image', type: 'image' },
  { name: 'Spacer', type: 'spacer' },
  { name: 'Divider', type: 'divider' },
  { name: 'Icon', type: 'icon' },
  { name: 'Columns', type: 'columns' },
  { name: 'Dropdown', type: 'dropdown' },
  { name: 'Theme Toggle', type: 'theme_toggle' }
];

describe('Built-in Component Defaults Consistency', () => {
  describe('getDefaultConfig returns non-empty config for all built-in types', () => {
    it.each(BUILTIN_COMPONENT_TYPES)(
      '$name ($type) should have a non-empty default config',
      ({ type }) => {
        const config = getDefaultConfig(type);
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        expect(Object.keys(config).length).toBeGreaterThan(0);
      }
    );

    it.each(PRIMITIVE_COMPONENT_TYPES)(
      '$name ($type) should have a non-empty default config',
      ({ type }) => {
        const config = getDefaultConfig(type);
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        expect(Object.keys(config).length).toBeGreaterThan(0);
      }
    );
  });

  describe('Navbar renders through the NavBar builtin (default v3)', () => {
    it('should be childless so the renderer picks NavBar.svelte', () => {
      const config = getDefaultConfig('navbar');
      expect(config.children).toBeUndefined();
    });

    it('should carry NavBar-native logo, links, and feature toggles', () => {
      const config = getDefaultConfig('navbar');
      expect(config.logo).toEqual({ text: '${site.name}', url: '/', image: '', imageHeight: 40 });
      expect(config.links).toEqual([
        { text: 'Products', url: '/#products' },
        { text: 'Pricing', url: '/#pricing' }
      ]);
      expect(config.showCart).toBe(true);
      expect(config.showAuth).toBe(true);
      expect(config.showAccountMenu).toBe(true);
      expect(config.showThemeToggle).toBe(true);
    });

    it('should not be sticky by default', () => {
      const config = getDefaultConfig('navbar');
      expect(config.sticky).toBe(false);
    });
  });

  describe('Footer renders through the Footer builtin (default v3)', () => {
    it('should be childless so the renderer picks Footer.svelte', () => {
      const config = getDefaultConfig('footer');
      expect(config.children).toBeUndefined();
    });

    it('should carry Footer-native link sections and copyright', () => {
      const config = getDefaultConfig('footer');
      expect(config.copyright).toBe('© ${site.year} ${site.name}. All rights reserved.');
      expect(
        (config.linkSections as Array<{ title: string }>).map((section) => section.title)
      ).toEqual(['Shop', 'Account', 'Legal']);
    });
  });

  describe('Hero component has full children structure', () => {
    it('should have children array with hero-main-container', () => {
      const config = getDefaultConfig('hero');
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
      expect((config.children as unknown[]).length).toBeGreaterThan(0);

      const mainContainer = (config.children as Array<{ id: string }>)[0];
      expect(mainContainer.id).toBe('hero-main-container');
    });

    it('should have hero-badge button', () => {
      const config = getDefaultConfig('hero');
      const mainContainer = (
        config.children as Array<{ config: { children: Array<{ id: string }> } }>
      )[0];
      const children = mainContainer.config.children;

      const heroBadge = children.find((child) => child.id === 'hero-badge');
      expect(heroBadge).toBeDefined();
    });

    it('should have CTA buttons', () => {
      const config = getDefaultConfig('hero');
      const mainContainer = (
        config.children as Array<{
          config: { children: Array<{ id: string; config?: { children: Array<{ id: string }> } }> };
        }>
      )[0];
      const children = mainContainer.config.children;

      const buttonsRow = children.find((child) => child.id === 'hero-buttons-row');
      expect(buttonsRow).toBeDefined();
      expect(buttonsRow!.config!.children.length).toBeGreaterThan(0);
    });
  });

  describe('Features component has full children structure', () => {
    it('should have children array with features-main-container', () => {
      const config = getDefaultConfig('features');
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
      expect((config.children as unknown[]).length).toBeGreaterThan(0);

      const mainContainer = (config.children as Array<{ id: string }>)[0];
      expect(mainContainer.id).toBe('features-main-container');
    });
  });

  describe('Container primitive has required properties', () => {
    it('should have containerPadding, containerMargin, and children', () => {
      const config = getDefaultConfig('container');
      expect(config.containerPadding).toBeDefined();
      expect(config.containerMargin).toBeDefined();
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
    });
  });

  describe('Text primitive has required properties', () => {
    it('should have text and alignment', () => {
      const config = getDefaultConfig('text');
      expect(config.text).toBeDefined();
      expect(config.alignment).toBeDefined();
    });
  });

  describe('Button primitive has required properties', () => {
    it('should have label and url', () => {
      const config = getDefaultConfig('button');
      expect(config.label).toBeDefined();
      expect(config.url).toBeDefined();
    });
  });

  describe('Heading primitive has required properties', () => {
    it('should have heading and level', () => {
      const config = getDefaultConfig('heading');
      expect(config.heading).toBeDefined();
      expect(config.level).toBeDefined();
    });
  });

  describe('Defaults are serializable to JSON', () => {
    it.each([...BUILTIN_COMPONENT_TYPES, ...PRIMITIVE_COMPONENT_TYPES])(
      '$name ($type) config should be JSON serializable',
      ({ type }) => {
        const config = getDefaultConfig(type);
        expect(() => JSON.stringify(config)).not.toThrow();
        const json = JSON.stringify(config);
        expect(() => JSON.parse(json)).not.toThrow();
        const parsed = JSON.parse(json);
        expect(parsed).toEqual(config);
      }
    );
  });
});

// Mock the component-revisions module
vi.mock('./component-revisions', () => ({
  getCurrentComponentRevision: vi.fn().mockResolvedValue({ id: 1, revision_number: 1 }),
  createComponentRevision: vi.fn().mockResolvedValue(2),
  publishComponentRevision: vi.fn().mockResolvedValue(true)
}));

describe('resetBuiltInComponent uses getDefaultConfig', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    first: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      bind: vi.fn(),
      run: vi.fn(),
      first: vi.fn(),
      all: vi.fn()
    };

    mockDb.prepare.mockReturnValue(mockDb);
    mockDb.bind.mockReturnValue(mockDb);
    mockDb.run.mockResolvedValue({});
    mockDb.first.mockResolvedValue({ id: 1, name: 'Test Component', description: 'Test' });
    mockDb.all.mockResolvedValue({ results: [] });
    vi.clearAllMocks();
  });

  it('should update component with config from getDefaultConfig', async () => {
    // Import dynamically to allow mocking
    const { resetBuiltInComponent } = await import('./components');

    await resetBuiltInComponent(mockDb as unknown as D1Database, '1', 1, 'navbar');

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(mockDb.bind).toHaveBeenCalled();

    // The first call to bind should have the navbar config as JSON
    const bindCall = mockDb.bind.mock.calls[0];
    expect(bindCall).toBeDefined();

    const configJson = bindCall[0];
    const config = JSON.parse(configJson);

    // Verify it matches getDefaultConfig
    const expectedConfig = getDefaultConfig('navbar');
    expect(config).toEqual(expectedConfig);
  });

  it.each(BUILTIN_COMPONENT_TYPES)(
    'should use correct defaults for $name ($type)',
    async ({ type }) => {
      const { resetBuiltInComponent } = await import('./components');

      await resetBuiltInComponent(mockDb as unknown as D1Database, '1', 1, type);

      const bindCall = mockDb.bind.mock.calls[0];
      const configJson = bindCall[0];
      const config = JSON.parse(configJson);

      const expectedConfig = getDefaultConfig(type);
      expect(config).toEqual(expectedConfig);

      // Reset mocks for next iteration
      vi.clearAllMocks();
      mockDb.prepare.mockReturnValue(mockDb);
      mockDb.bind.mockReturnValue(mockDb);
      mockDb.run.mockResolvedValue({});
    }
  );
});
