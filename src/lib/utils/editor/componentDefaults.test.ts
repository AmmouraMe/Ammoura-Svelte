import { describe, it, expect } from 'vitest';
import {
  getDefaultConfig,
  getComponentLabel,
  getComponentDisplayLabel,
  getComponentContentPreview
} from './componentDefaults';
import type { ComponentType, ComponentConfig } from '$lib/types/pages';

describe('Component Defaults', () => {
  describe('getDefaultConfig', () => {
    it('should return default config for text component', () => {
      const config = getDefaultConfig('text');
      expect(config.text).toBe('Enter your text here');
      expect(config.alignment).toBe('left');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for heading component', () => {
      const config = getDefaultConfig('heading');
      expect(config.heading).toBe('Heading Text');
      expect(config.level).toBe(2);
      expect(config.textColor).toBe('theme:text');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for image component', () => {
      const config = getDefaultConfig('image');
      expect(config.src).toBe('');
      expect(config.alt).toBe('');
      expect(config.imageWidth).toBe('100%');
      expect(config.imageHeight).toBe('auto');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for hero component', () => {
      const config = getDefaultConfig('hero');
      // Hero now uses container-based architecture like Navbar and Footer
      expect(config.backgroundColor).toBe('transparent');
      expect(config.containerBackground).toBe('transparent');
      expect(config.containerMinHeight).toEqual({
        desktop: '600px',
        tablet: '500px',
        mobile: '450px'
      });
      expect(config.visibilityRule).toBe('always');
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
      expect(config.children?.length).toBeGreaterThan(0);
    });

    it('should return default config for button component', () => {
      const config = getDefaultConfig('button');
      expect(config.label).toBe('Click Here');
      expect(config.url).toBe('#');
      expect(config.variant).toBe('primary');
      expect(config.size).toBe('medium');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for spacer component', () => {
      const config = getDefaultConfig('spacer');
      expect(config.space).toEqual({ desktop: 40, tablet: 30, mobile: 20 });
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for divider component', () => {
      const config = getDefaultConfig('divider');
      expect(config.thickness).toBe(1);
      expect(config.dividerColor).toBe('theme:border');
      expect(config.dividerStyle).toBe('solid');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for columns component', () => {
      const config = getDefaultConfig('columns');
      expect(config.columnCount).toEqual({ desktop: 2, tablet: 2, mobile: 1 });
      expect(config.gap).toEqual({ desktop: 20 });
      expect(config.verticalAlign).toBe('stretch');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for single_product component', () => {
      const config = getDefaultConfig('single_product');
      expect(config.productId).toBe('');
      expect(config.layout).toBe('card');
      expect(config.showPrice).toBe(true);
      expect(config.showDescription).toBe(true);
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for product_list component', () => {
      const config = getDefaultConfig('product_list');
      expect(config.category).toBe('');
      expect(config.limit).toBe(6);
      expect(config.sortBy).toBe('created_at');
      expect(config.sortOrder).toBe('desc');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return default config for features component', () => {
      const config = getDefaultConfig('features');
      // Container-based architecture
      expect(config.backgroundColor).toBe('transparent');
      expect(config.containerBackground).toBe('transparent');
      expect(config.containerMaxWidth).toBe('100%');
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
      expect(config.children!.length).toBe(1); // features-main-container
      // Check nested structure exists
      const mainContainer = config.children![0];
      expect(mainContainer.id).toBe('features-main-container');
      expect(mainContainer.type).toBe('container');
      expect(mainContainer.config.children).toBeDefined();
      expect(mainContainer.config.children.length).toBe(2); // header + grid
    });

    it('should return default config for pricing component', () => {
      const config = getDefaultConfig('pricing');
      // Pricing now uses Container-based architecture
      expect(config.backgroundColor).toBe('transparent');
      expect(config.children).toBeDefined();
      expect(Array.isArray(config.children)).toBe(true);
      const children = config.children as { type: string }[];
      expect(children.length).toBeGreaterThan(0);
      // Verify it has header, cards grid, and CTA sections
      const childTypes = children.map((c) => c.type);
      expect(childTypes).toContain('container'); // header and cards containers
    });

    it('should return default config for cta component', () => {
      const config = getDefaultConfig('cta');
      expect(config.title).toBe('Ready to Get Started?');
      expect(config.primaryCtaText).toBe('Get Started');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return empty config for unknown component type', () => {
      const config = getDefaultConfig('unknown' as ComponentType);
      expect(config).toEqual({});
    });
  });

  describe('getComponentLabel', () => {
    it('should return label for text component', () => {
      expect(getComponentLabel('text')).toBe('Text Content');
    });

    it('should return label for heading component', () => {
      expect(getComponentLabel('heading')).toBe('Heading');
    });

    it('should return label for image component', () => {
      expect(getComponentLabel('image')).toBe('Image');
    });

    it('should return label for hero component', () => {
      expect(getComponentLabel('hero')).toBe('Hero');
    });

    it('should return label for button component', () => {
      expect(getComponentLabel('button')).toBe('Button');
    });

    it('should return label for spacer component', () => {
      expect(getComponentLabel('spacer')).toBe('Spacer');
    });

    it('should return label for divider component', () => {
      expect(getComponentLabel('divider')).toBe('Divider');
    });

    it('should return label for columns component', () => {
      expect(getComponentLabel('columns')).toBe('Columns');
    });

    it('should return label for single_product component', () => {
      expect(getComponentLabel('single_product')).toBe('Single Product');
    });

    it('should return label for product_list component', () => {
      expect(getComponentLabel('product_list')).toBe('Product List');
    });

    it('should return label for features component', () => {
      expect(getComponentLabel('features')).toBe('Features Section');
    });

    it('should return label for pricing component', () => {
      expect(getComponentLabel('pricing')).toBe('Pricing Section');
    });

    it('should return label for cta component', () => {
      expect(getComponentLabel('cta')).toBe('Call to Action');
    });

    it('should return label for navbar component', () => {
      expect(getComponentLabel('navbar')).toBe('Navigation Bar');
    });

    it('should return label for footer component', () => {
      expect(getComponentLabel('footer')).toBe('Footer');
    });

    it('should return label for container component', () => {
      expect(getComponentLabel('container')).toBe('Container');
    });

    it('should return label for composite component', () => {
      expect(getComponentLabel('composite')).toBe('Composite');
    });

    it('should return label for component_ref', () => {
      expect(getComponentLabel('component_ref')).toBe('Component Reference');
    });

    it('should return label for dropdown component', () => {
      expect(getComponentLabel('dropdown')).toBe('Dropdown');
    });

    it('should return label for theme_toggle component', () => {
      expect(getComponentLabel('theme_toggle')).toBe('Theme Toggle');
    });

    it('should return label for yield component', () => {
      expect(getComponentLabel('yield')).toBe('Page Content (Yield)');
    });

    it('should return component type for unknown component', () => {
      const unknownType = 'unknown' as ComponentType;
      expect(getComponentLabel(unknownType)).toBe('unknown');
    });
  });

  describe('getDefaultConfig - additional components', () => {
    it('should return default config for container component', () => {
      const config = getDefaultConfig('container');
      expect(config.backgroundColor).toBe('transparent');
      expect(config.containerBackground).toBe('transparent');
      expect(config.containerMaxWidth).toBe('1200px');
      expect(config.children).toEqual([]);
    });

    it('should return default config for navbar component', () => {
      const config = getDefaultConfig('navbar');
      expect(config.backgroundColor).toBe('transparent');
      expect(config.containerBackground).toBe('transparent');
      // position is now responsive, defaults to static
      expect(config.position).toEqual({
        desktop: { type: 'static' },
        tablet: { type: 'static' },
        mobile: { type: 'static' }
      });
      // children now contains full navbar structure with main-container, logo, links, etc.
      expect(config.children).toBeDefined();
      expect(config.children).toBeInstanceOf(Array);
      expect((config.children as Array<{ id: string }>).length).toBeGreaterThan(0);
      expect((config.children as Array<{ id: string }>)[0].id).toBe('main-container');
    });

    it('should include theme toggle in navbar nav-links-container', () => {
      const config = getDefaultConfig('navbar');
      // Navigate to the nav-links-container children
      const mainContainer = (
        config.children as Array<{
          id: string;
          config: {
            children: Array<{
              id: string;
              type: string;
              config: { children?: Array<{ id: string; type: string }> };
            }>;
          };
        }>
      )[0];
      const navLinksContainer = mainContainer.config.children.find(
        (c) => c.id === 'nav-links-container'
      );
      expect(navLinksContainer).toBeDefined();

      // Find the theme toggle in nav-links-container children
      const themeToggle = navLinksContainer?.config.children?.find((c) => c.id === 'theme-toggle');
      expect(themeToggle).toBeDefined();
      expect(themeToggle?.type).toBe('theme_toggle');
    });

    it('should return default config for footer component', () => {
      const config = getDefaultConfig('footer');
      expect(config.backgroundColor).toBe('transparent');
      expect(config.copyright).toContain('2025');
      // New Container-based footer uses linkSections instead of footerLinks
      expect(config.linkSections).toBeDefined();
      expect(config.linkSections).toHaveLength(3);
      expect(config.linkSections?.[0].title).toBe('Company');
      expect(config.socialLinks).toHaveLength(4);
      expect(config.footerBackground).toBe('transparent');
      // Legacy footerLinks is now empty for backward compatibility
      expect(config.footerLinks).toHaveLength(0);
      // Container-based children structure
      expect(config.children).toBeDefined();
      expect(config.children).toHaveLength(1);
      expect(config.children?.[0].id).toBe('main-container');
      expect(config.children?.[0].type).toBe('container');
      expect(config.children?.[0].config.children).toHaveLength(2);
      expect(config.children?.[0].config.children[0].id).toBe('footer-content-row');
      expect(config.children?.[0].config.children[1].id).toBe('footer-copyright');
    });

    it('should return default config for composite component', () => {
      const config = getDefaultConfig('composite');
      expect(config.backgroundColor).toBe('transparent');
      expect(config.children).toEqual([]);
    });

    it('should return default config for dropdown component', () => {
      const config = getDefaultConfig('dropdown');
      expect(config.backgroundColor).toBe('transparent');
      expect(config.triggerLabel).toBe('Menu');
      expect(config.triggerVariant).toBe('text');
      expect(config.showChevron).toBe(true);
      expect(config.menuWidth).toBe('200px');
      expect(config.children).toEqual([]);
    });

    it('should return default config for theme_toggle component', () => {
      const config = getDefaultConfig('theme_toggle');
      expect(config.size).toBe('medium');
      expect(config.toggleVariant).toBe('icon');
      expect(config.alignment).toBe('left');
      expect(config.backgroundColor).toBe('transparent');
    });

    it('should return config with transparent background for yield component', () => {
      const config = getDefaultConfig('yield');
      expect(config).toEqual({ backgroundColor: 'transparent' });
    });

    it('should return empty config for component_ref', () => {
      const config = getDefaultConfig('component_ref');
      expect(config).toEqual({});
    });
  });

  describe('getComponentDisplayLabel', () => {
    it('should return component label for regular widgets', () => {
      const component = { type: 'hero' as ComponentType };
      expect(getComponentDisplayLabel(component)).toBe('Hero');
    });

    it('should return component label for text component', () => {
      const component = { type: 'text' as ComponentType };
      expect(getComponentDisplayLabel(component)).toBe('Text Content');
    });

    it('should return "Component Reference" for component_ref without components list', () => {
      const component = { type: 'component_ref' as ComponentType, config: { componentId: 1 } };
      expect(getComponentDisplayLabel(component)).toBe('Component Reference');
    });

    it('should return "Component Reference" for component_ref with empty components list', () => {
      const component = { type: 'component_ref' as ComponentType, config: { componentId: 1 } };
      expect(getComponentDisplayLabel(component, [])).toBe('Component Reference');
    });

    it('should return component name for component_ref with matching component', () => {
      const component = { type: 'component_ref' as ComponentType, config: { componentId: 5 } };
      const components = [
        { id: 1, name: 'Navigation Bar' },
        { id: 5, name: 'Hero Banner' },
        { id: 10, name: 'Footer' }
      ];
      expect(getComponentDisplayLabel(component, components)).toBe('Hero Banner');
    });

    it('should return "Component Reference" for component_ref with no matching component', () => {
      const component = { type: 'component_ref' as ComponentType, config: { componentId: 99 } };
      const components = [
        { id: 1, name: 'Navigation Bar' },
        { id: 5, name: 'Hero Banner' }
      ];
      expect(getComponentDisplayLabel(component, components)).toBe('Component Reference');
    });

    it('should return "Component Reference" for component_ref without componentId', () => {
      const component = { type: 'component_ref' as ComponentType, config: {} };
      const components = [{ id: 1, name: 'Navigation Bar' }];
      expect(getComponentDisplayLabel(component, components)).toBe('Component Reference');
    });

    it('should return "Component Reference" for component_ref without config', () => {
      const component = { type: 'component_ref' as ComponentType };
      const components = [{ id: 1, name: 'Navigation Bar' }];
      expect(getComponentDisplayLabel(component, components)).toBe('Component Reference');
    });

    it('should return component label for regular component even when components are provided', () => {
      const component = { type: 'navbar' as ComponentType };
      const components = [{ id: 1, name: 'Navigation Bar' }];
      expect(getComponentDisplayLabel(component, components)).toBe('Navigation Bar');
    });

    it('should include content preview when includeContent is true', () => {
      const component = {
        type: 'button' as ComponentType,
        config: { text: 'Click Me' }
      };
      expect(getComponentDisplayLabel(component, [], true)).toBe('Button: Click Me');
    });

    it('should not include content preview when includeContent is false', () => {
      const component = {
        type: 'button' as ComponentType,
        config: { text: 'Click Me' }
      };
      expect(getComponentDisplayLabel(component, [], false)).toBe('Button');
    });
  });

  describe('getComponentContentPreview', () => {
    it('should return empty string for component without config', () => {
      const component = { type: 'text' as ComponentType };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract text from text component html', () => {
      const component = {
        type: 'text' as ComponentType,
        config: { html: '<p>Hello World</p>' }
      };
      expect(getComponentContentPreview(component)).toBe('Hello World');
    });

    it('should truncate long text content', () => {
      const component = {
        type: 'text' as ComponentType,
        config: { html: '<p>This is a very long text that should be truncated for display</p>' }
      };
      const result = getComponentContentPreview(component);
      expect(result.length).toBeLessThanOrEqual(31); // 30 chars + ellipsis
      expect(result.endsWith('…')).toBe(true);
    });

    it('should extract text from heading component', () => {
      const component = {
        type: 'heading' as ComponentType,
        config: { text: 'Welcome to our site' }
      };
      expect(getComponentContentPreview(component)).toBe('Welcome to our site');
    });

    it('should extract text from button component', () => {
      const component = {
        type: 'button' as ComponentType,
        config: { text: 'Submit' }
      };
      expect(getComponentContentPreview(component)).toBe('Submit');
    });

    it('should extract label from button component', () => {
      const component = {
        type: 'button' as ComponentType,
        config: { label: 'Cancel' }
      };
      expect(getComponentContentPreview(component)).toBe('Cancel');
    });

    it('should extract alt text from image component', () => {
      const component = {
        type: 'image' as ComponentType,
        config: { alt: 'Product photo' }
      };
      expect(getComponentContentPreview(component)).toBe('Product photo');
    });

    it('should extract filename from image src', () => {
      const component = {
        type: 'image' as ComponentType,
        config: { src: '/images/hero-banner.jpg' }
      };
      expect(getComponentContentPreview(component)).toBe('hero-banner.jpg');
    });

    it('should extract title from hero component', () => {
      const component = {
        type: 'hero' as ComponentType,
        config: { title: 'Welcome to Our Store' }
      };
      expect(getComponentContentPreview(component)).toBe('Welcome to Our Store');
    });

    it('should extract headline from cta component', () => {
      const component = {
        type: 'cta' as ComponentType,
        config: { headline: 'Get Started Today' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Get Started Today');
    });

    it('should extract icon name from icon component', () => {
      const component = {
        type: 'icon' as ComponentType,
        config: { icon: 'ShoppingCart' }
      };
      expect(getComponentContentPreview(component)).toBe('ShoppingCart');
    });

    it('should extract height from spacer component', () => {
      const component = {
        type: 'spacer' as ComponentType,
        config: { height: '2rem' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('2rem');
    });

    it('should return empty string for component with empty config', () => {
      const component = {
        type: 'container' as ComponentType,
        config: {}
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should strip HTML tags from text content', () => {
      const component = {
        type: 'text' as ComponentType,
        config: { html: '<p><strong>Bold</strong> and <em>italic</em> text</p>' }
      };
      expect(getComponentContentPreview(component)).toBe('Bold and italic text');
    });

    it('should extract style from divider component', () => {
      const component = {
        type: 'divider' as ComponentType,
        config: { style: 'dashed' } as unknown as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('dashed');
    });

    it('should return empty string for divider without style', () => {
      const component = {
        type: 'divider' as ComponentType,
        config: {}
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract title from default/unknown component type', () => {
      const component = {
        type: 'composite' as ComponentType,
        config: { title: 'My Composite Widget' }
      };
      expect(getComponentContentPreview(component)).toBe('My Composite Widget');
    });

    it('should extract text from default component type when no title', () => {
      const component = {
        type: 'composite' as ComponentType,
        config: { text: 'Some text content' }
      };
      expect(getComponentContentPreview(component)).toBe('Some text content');
    });

    it('should extract label from default component type when no title or text', () => {
      const component = {
        type: 'composite' as ComponentType,
        config: { label: 'My Label' }
      };
      expect(getComponentContentPreview(component)).toBe('My Label');
    });

    it('should return empty for default component type with no known properties', () => {
      const component = {
        type: 'composite' as ComponentType,
        config: { someUnknownProp: 'value' } as unknown as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract content from text component via content property', () => {
      const component = {
        type: 'text' as ComponentType,
        config: { content: 'Plain text content' } as unknown as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Plain text content');
    });

    it('should extract name from container component', () => {
      const component = {
        type: 'container' as ComponentType,
        config: { name: 'My Section' }
      };
      expect(getComponentContentPreview(component)).toBe('My Section');
    });

    it('should extract label from container component when no name', () => {
      const component = {
        type: 'container' as ComponentType,
        config: { label: 'Section Label' }
      };
      expect(getComponentContentPreview(component)).toBe('Section Label');
    });

    it('should return empty string for component with null config', () => {
      const component = {
        type: 'text' as ComponentType,
        config: undefined as unknown as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract label from button component', () => {
      const component = {
        type: 'button' as ComponentType,
        config: { label: 'Click Here' }
      };
      expect(getComponentContentPreview(component)).toBe('Click Here');
    });

    it('should extract alt text from image component', () => {
      const component = {
        type: 'image' as ComponentType,
        config: { alt: 'A beautiful sunset' }
      };
      expect(getComponentContentPreview(component)).toBe('A beautiful sunset');
    });

    it('should extract filename from image src when no alt', () => {
      const component = {
        type: 'image' as ComponentType,
        config: { src: '/images/photo.png' }
      };
      expect(getComponentContentPreview(component)).toBe('photo.png');
    });

    it('should extract title from CTA via title fallback', () => {
      const component = {
        type: 'cta' as ComponentType,
        config: { title: 'My CTA Title' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('My CTA Title');
    });

    it('should extract title from features component', () => {
      const component = {
        type: 'features' as ComponentType,
        config: { title: 'Our Key Features' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Our Key Features');
    });

    it('should return empty string for hero without title', () => {
      const component = {
        type: 'hero' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should return empty string for cta without headline or title', () => {
      const component = {
        type: 'cta' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should return empty string for features without title', () => {
      const component = {
        type: 'features' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract title from pricing component', () => {
      const component = {
        type: 'pricing' as ComponentType,
        config: { title: 'Choose Your Plan' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Choose Your Plan');
    });

    it('should extract label from dropdown component', () => {
      const component = {
        type: 'dropdown' as ComponentType,
        config: { label: 'Select Option' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Select Option');
    });

    it('should extract brand name from navbar component', () => {
      const component = {
        type: 'navbar' as ComponentType,
        config: { brandName: 'My Store' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('My Store');
    });

    it('should extract copyright from footer component', () => {
      const component = {
        type: 'footer' as ComponentType,
        config: { copyright: '2024 My Company' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('2024 My Company');
    });

    it('should truncate long content preview', () => {
      const longText = 'A'.repeat(100);
      const component = {
        type: 'heading' as ComponentType,
        config: { text: longText }
      };
      const preview = getComponentContentPreview(component);
      expect(preview.length).toBeLessThanOrEqual(53); // 50 + '...'
    });

    it('should extract logoText from navbar when brandName is absent', () => {
      const component = {
        type: 'navbar' as ComponentType,
        config: { logoText: 'My Logo' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('My Logo');
    });

    it('should return empty string for navbar with no brandName or logoText', () => {
      const component = {
        type: 'navbar' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract height from spacer component', () => {
      const component = {
        type: 'spacer' as ComponentType,
        config: { height: 48 } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('48');
    });

    it('should return empty for spacer without height', () => {
      const component = {
        type: 'spacer' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should extract label from container when name is absent', () => {
      const component = {
        type: 'container' as ComponentType,
        config: { label: 'My Container' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('My Container');
    });

    it('should extract label from columns when name is absent', () => {
      const component = {
        type: 'columns' as ComponentType,
        config: { label: 'Two Columns' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('Two Columns');
    });

    it('should extract style from divider component', () => {
      const component = {
        type: 'divider' as ComponentType,
        config: { style: 'dashed' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('dashed');
    });

    it('should return empty string for icon with no name or icon', () => {
      const component = {
        type: 'icon' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should return empty string for dropdown with no label', () => {
      const component = {
        type: 'dropdown' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should return empty string for footer with no copyright', () => {
      const component = {
        type: 'footer' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });

    it('should return icon name for icon with name but no icon property', () => {
      const component = {
        type: 'icon' as ComponentType,
        config: { name: 'arrow-right' } as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('arrow-right');
    });

    it('should return empty string for pricing with no title', () => {
      const component = {
        type: 'pricing' as ComponentType,
        config: {} as ComponentConfig
      };
      expect(getComponentContentPreview(component)).toBe('');
    });
  });
});
