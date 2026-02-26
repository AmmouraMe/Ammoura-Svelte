import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Hero from './Hero.svelte';
import type { WidgetConfig } from '$lib/types/pages';

describe('Hero', () => {
  describe('legacy hero (no children)', () => {
    const legacyConfig: WidgetConfig = {
      title: 'Welcome',
      subtitle: 'A great subtitle',
      backgroundColor: '#1a1a2e',
      heroHeight: { desktop: '400px' },
      contentAlign: 'center'
    };

    it('renders the legacy hero format', () => {
      render(Hero, { props: { config: legacyConfig } });
      const heroWidget = document.querySelector('.hero-widget');
      expect(heroWidget).toBeInTheDocument();
      expect(document.querySelector('.hero-container')).not.toBeInTheDocument();
    });

    it('displays title and subtitle', () => {
      render(Hero, { props: { config: legacyConfig } });
      expect(document.querySelector('.hero-content h1')?.textContent).toContain('Welcome');
      expect(document.querySelector('.hero-content p')?.textContent).toContain('A great subtitle');
    });

    it('applies background image when set', () => {
      const config = {
        ...legacyConfig,
        backgroundImage: '/images/hero-bg.jpg'
      };
      render(Hero, { props: { config } });
      const heroWidget = document.querySelector('.hero-widget') as HTMLElement;
      expect(heroWidget).toBeInTheDocument();
      expect(heroWidget.style.backgroundImage).toContain('/images/hero-bg.jpg');
    });

    it('sets background-image to none when no image provided', () => {
      render(Hero, { props: { config: legacyConfig } });
      const heroWidget = document.querySelector('.hero-widget') as HTMLElement;
      expect(heroWidget.style.backgroundImage).toBe('none');
    });

    it('renders overlay when enabled', () => {
      const config = {
        ...legacyConfig,
        backgroundImage: '/images/hero-bg.jpg',
        overlay: true,
        overlayOpacity: 60
      };
      render(Hero, { props: { config } });
      const overlay = document.querySelector('.hero-overlay') as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(overlay.style.opacity).toBe('0.6');
    });

    it('does not render overlay when disabled', () => {
      render(Hero, { props: { config: legacyConfig } });
      expect(document.querySelector('.hero-overlay')).not.toBeInTheDocument();
    });

    it('renders CTA button when ctaText is set', () => {
      const config = {
        ...legacyConfig,
        ctaText: 'Get Started',
        ctaLink: '/signup'
      };
      render(Hero, { props: { config } });
      const cta = document.querySelector('.hero-cta-primary');
      expect(cta).toBeInTheDocument();
      expect(cta?.textContent?.trim()).toBe('Get Started');
    });
  });

  describe('container-based hero (with children)', () => {
    const containerConfig: WidgetConfig = {
      containerBackground: 'transparent',
      containerMinHeight: { desktop: '600px', tablet: '500px', mobile: '450px' },
      containerMaxWidth: '100%',
      containerDisplay: { desktop: 'flex', tablet: 'flex', mobile: 'flex' },
      containerFlexDirection: { desktop: 'column', tablet: 'column', mobile: 'column' },
      containerAlignItems: 'center',
      containerJustifyContent: 'center',
      containerGap: { desktop: 24, tablet: 20, mobile: 16 },
      children: [
        {
          id: 'child-1',
          type: 'text' as const,
          config: { text: 'Hello World' },
          position: 0,
          page_id: 'page-1',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]
    };

    it('renders the container-based hero format when children exist', () => {
      render(Hero, { props: { config: containerConfig } });
      const heroContainer = document.querySelector('.hero-container');
      expect(heroContainer).toBeInTheDocument();
      expect(document.querySelector('.hero-widget')).not.toBeInTheDocument();
    });

    it('applies background image to container-based hero', () => {
      const config = {
        ...containerConfig,
        backgroundImage: '/images/hero-bg.jpg'
      };
      render(Hero, { props: { config } });
      const heroContainer = document.querySelector('.hero-container') as HTMLElement;
      expect(heroContainer).toBeInTheDocument();
      expect(heroContainer.style.backgroundImage).toContain('/images/hero-bg.jpg');
      expect(heroContainer.style.backgroundSize).toBe('cover');
      expect(heroContainer.style.backgroundPosition).toContain('center');
      expect(heroContainer.style.backgroundRepeat).toBe('no-repeat');
    });

    it('does not set background-image when no image provided', () => {
      render(Hero, { props: { config: containerConfig } });
      const heroContainer = document.querySelector('.hero-container') as HTMLElement;
      // When no backgroundImage is set, the background shorthand may reset background-image
      // The exact value depends on DOM parsing - just verify no URL is present
      expect(heroContainer.style.backgroundImage).not.toContain('/images/');
    });

    it('renders overlay on container-based hero when enabled with background image', () => {
      const config = {
        ...containerConfig,
        backgroundImage: '/images/hero-bg.jpg',
        overlay: true,
        overlayOpacity: 50
      };
      render(Hero, { props: { config } });
      const overlay = document.querySelector('.hero-overlay') as HTMLElement;
      expect(overlay).toBeInTheDocument();
      expect(overlay.style.opacity).toBe('0.5');
    });

    it('does not render overlay on container-based hero without background image', () => {
      const config = {
        ...containerConfig,
        overlay: true,
        overlayOpacity: 50
      };
      render(Hero, { props: { config } });
      expect(document.querySelector('.hero-overlay')).not.toBeInTheDocument();
    });

    it('applies container background color', () => {
      const config = {
        ...containerConfig,
        containerBackground: '#1a1a2e'
      };
      render(Hero, { props: { config } });
      const heroContainer = document.querySelector('.hero-container') as HTMLElement;
      // Uses the background shorthand which jsdom parses
      const style = heroContainer.getAttribute('style') || '';
      expect(style).toContain('#1a1a2e');
    });

    it('applies both background color and background image', () => {
      const config = {
        ...containerConfig,
        containerBackground: '#1a1a2e',
        backgroundImage: '/images/hero-bg.jpg'
      };
      render(Hero, { props: { config } });
      const heroContainer = document.querySelector('.hero-container') as HTMLElement;
      const style = heroContainer.getAttribute('style') || '';
      expect(style).toContain('#1a1a2e');
      expect(style).toContain('url(/images/hero-bg.jpg)');
    });

    it('applies min-height from config', () => {
      render(Hero, { props: { config: containerConfig } });
      const heroContainer = document.querySelector('.hero-container') as HTMLElement;
      // Default breakpoint is desktop
      expect(heroContainer.style.minHeight).toBe('600px');
    });

    it('renders children in non-editable mode', () => {
      render(Hero, { props: { config: containerConfig } });
      const contentWrapper = document.querySelector('.hero-content-wrapper');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  describe('editable mode', () => {
    const legacyConfig: WidgetConfig = {
      title: 'Edit Me',
      subtitle: 'Edit subtitle',
      heroHeight: { desktop: '400px' }
    };

    it('makes title contenteditable in edit mode', () => {
      const onUpdate = vi.fn();
      render(Hero, {
        props: {
          config: legacyConfig,
          isEditable: true,
          onUpdate
        }
      });
      const title = document.querySelector('h1[contenteditable="true"]');
      expect(title).toBeInTheDocument();
    });

    it('makes subtitle contenteditable in edit mode', () => {
      const onUpdate = vi.fn();
      render(Hero, {
        props: {
          config: legacyConfig,
          isEditable: true,
          onUpdate
        }
      });
      const subtitle = document.querySelector('p[contenteditable="true"]');
      expect(subtitle).toBeInTheDocument();
    });
  });
});
