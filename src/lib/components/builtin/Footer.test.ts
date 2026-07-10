import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Footer from './Footer.svelte';

describe('Footer', () => {
  const defaultConfig = {
    containerPadding: {
      desktop: { top: 48, right: 24, bottom: 48, left: 24 }
    },
    containerBackground: '#f9fafb',
    containerMaxWidth: '1200px',
    footerTextColor: '#374151',
    children: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the footer element', () => {
      render(Footer, { props: { config: defaultConfig } });
      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('renders with default config when no config provided', () => {
      render(Footer, { props: { config: {} } });
      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('applies background color from config', () => {
      const config = {
        ...defaultConfig,
        footerBackground: '#1f2937'
      };
      render(Footer, { props: { config } });
      const footer = document.querySelector('footer');
      expect(footer).toHaveStyle({ backgroundColor: '#1f2937' });
    });

    it('applies text color from config', () => {
      const config = {
        ...defaultConfig,
        footerTextColor: '#ffffff'
      };
      render(Footer, { props: { config } });
      const footer = document.querySelector('footer');
      expect(footer).toHaveStyle({ color: '#ffffff' });
    });
  });

  describe('copyright', () => {
    it('displays copyright text', () => {
      const config = {
        ...defaultConfig,
        copyright: '© 2025 Test Store. All rights reserved.'
      };
      render(Footer, { props: { config } });
      expect(screen.getByText('© 2025 Test Store. All rights reserved.')).toBeInTheDocument();
    });

    it('displays default copyright when not provided', () => {
      render(Footer, { props: { config: {} } });
      expect(screen.getByText('© 2025 Store Name. All rights reserved.')).toBeInTheDocument();
    });
  });

  describe('footer links', () => {
    it('renders footer links', () => {
      const config = {
        ...defaultConfig,
        footerLinks: [
          { text: 'Privacy Policy', url: '/privacy' },
          { text: 'Terms of Service', url: '/terms' }
        ]
      };
      render(Footer, { props: { config } });
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('renders links with correct href', () => {
      const config = {
        ...defaultConfig,
        footerLinks: [{ text: 'Privacy Policy', url: '/privacy' }]
      };
      render(Footer, { props: { config } });
      const link = screen.getByText('Privacy Policy');
      expect(link).toHaveAttribute('href', '/privacy');
    });

    it('opens links in new tab when specified', () => {
      const config = {
        ...defaultConfig,
        footerLinks: [{ text: 'External Link', url: 'https://example.com', openInNewTab: true }]
      };
      render(Footer, { props: { config } });
      const link = screen.getByText('External Link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('social links', () => {
    it('renders social links', () => {
      const config = {
        ...defaultConfig,
        socialLinks: [
          { platform: 'facebook' as const, url: 'https://facebook.com/store' },
          { platform: 'twitter' as const, url: 'https://twitter.com/store' }
        ]
      };
      render(Footer, { props: { config } });
      const socialLinks = document.querySelectorAll('.social-link');
      expect(socialLinks.length).toBe(2);
    });

    it('renders social links with correct aria-label', () => {
      const config = {
        ...defaultConfig,
        socialLinks: [{ platform: 'facebook' as const, url: 'https://facebook.com/store' }]
      };
      render(Footer, { props: { config } });
      const link = screen.getByLabelText('facebook');
      expect(link).toBeInTheDocument();
    });

    it('opens social links in new tab', () => {
      const config = {
        ...defaultConfig,
        socialLinks: [{ platform: 'twitter' as const, url: 'https://twitter.com/store' }]
      };
      render(Footer, { props: { config } });
      const link = screen.getByLabelText('twitter');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('link sections', () => {
    it('renders link sections with titles', () => {
      const config = {
        ...defaultConfig,
        linkSections: [
          {
            title: 'Company',
            links: [
              { text: 'About', url: '/about' },
              { text: 'Careers', url: '/careers' }
            ]
          },
          {
            title: 'Support',
            links: [
              { text: 'Help Center', url: '/help' },
              { text: 'Contact', url: '/contact' }
            ]
          }
        ]
      };
      render(Footer, { props: { config } });
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });
  });

  describe('logo section', () => {
    it('renders logo text when provided', () => {
      const config = {
        ...defaultConfig,
        logo: { text: 'Store Name', url: '/' }
      };
      render(Footer, { props: { config } });
      expect(screen.getByText('Store Name')).toBeInTheDocument();
    });

    it('renders logo image when provided', () => {
      const config = {
        ...defaultConfig,
        logo: { text: 'Store', url: '/', image: '/logo.png', imageHeight: 40 }
      };
      render(Footer, { props: { config } });
      const logoImg = document.querySelector('.logo-image');
      expect(logoImg).toBeInTheDocument();
      expect(logoImg).toHaveAttribute('src', '/logo.png');
    });
  });

  describe('template substitution', () => {
    it('substitutes site variables in copyright', () => {
      const config = {
        ...defaultConfig,
        copyright: '© 2025 ${site.name}. All rights reserved.'
      };
      const siteContext = {
        name: 'My Store',
        tagline: '',
        description: '',
        email: '',
        supportEmail: '',
        phone: '',
        currency: '',
        year: '2025'
      };
      render(Footer, { props: { config, siteContext } });
      expect(screen.getByText('© 2025 My Store. All rights reserved.')).toBeInTheDocument();
    });
  });

  describe('container integration', () => {
    it('uses Container component for layout', () => {
      render(Footer, { props: { config: defaultConfig } });
      // Container is used inside the footer
      const container = document.querySelector('.footer-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('responsive layout', () => {
    it('has responsive footer content class', () => {
      render(Footer, { props: { config: defaultConfig } });
      const content = document.querySelector('.footer-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('border and shadow', () => {
    it('applies border when configured', () => {
      const config = {
        ...defaultConfig,
        footerBorderColor: '#e5e7eb'
      };
      render(Footer, { props: { config } });
      const footer = document.querySelector('footer');
      expect(footer).toHaveStyle({ borderTop: '1px solid #e5e7eb' });
    });

    it('applies shadow when configured', () => {
      const config = {
        ...defaultConfig,
        footerShadow: true
      };
      render(Footer, { props: { config } });
      const footer = document.querySelector('footer');
      expect(footer).toHaveStyle({ boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)' });
    });
  });

  describe('tagline/description', () => {
    it('renders tagline when provided', () => {
      const config = {
        ...defaultConfig,
        tagline: 'Your trusted online store for quality products.'
      };
      render(Footer, { props: { config } });
      expect(
        screen.getByText('Your trusted online store for quality products.')
      ).toBeInTheDocument();
    });
  });
});
