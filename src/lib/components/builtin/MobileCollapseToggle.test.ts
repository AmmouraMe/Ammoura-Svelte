import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MobileCollapseToggle from './MobileCollapseToggle.svelte';

describe('MobileCollapseToggle', () => {
  describe('rendering', () => {
    it('renders the toggle button', () => {
      render(MobileCollapseToggle, {
        props: { label: 'Menu' }
      });
      const button = screen.getByRole('button', { name: /toggle menu/i });
      expect(button).toBeInTheDocument();
    });

    it('renders the label text', () => {
      render(MobileCollapseToggle, {
        props: { label: 'Navigation' }
      });
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('renders default label when none provided', () => {
      render(MobileCollapseToggle);
      const button = screen.getByRole('button', { name: /toggle menu/i });
      expect(button).toBeInTheDocument();
    });

    it('renders hamburger icon (3-line) when collapsed', () => {
      render(MobileCollapseToggle, {
        props: { expanded: false }
      });
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has mobile-collapse-toggle class', () => {
      render(MobileCollapseToggle, {
        props: { label: 'Test' }
      });
      const button = screen.getByRole('button');
      expect(button.classList.contains('mobile-collapse-toggle')).toBe(true);
    });
  });

  describe('toggle behavior', () => {
    it('starts collapsed by default', () => {
      render(MobileCollapseToggle);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles expanded state on click', async () => {
      render(MobileCollapseToggle);
      const button = screen.getByRole('button');

      expect(button.getAttribute('aria-expanded')).toBe('false');

      await fireEvent.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('true');

      await fireEvent.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('starts expanded when expanded prop is true', () => {
      render(MobileCollapseToggle, {
        props: { expanded: true }
      });
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('dispatches toggle event with expanded state on click', async () => {
      const { component } = render(MobileCollapseToggle);
      const toggleHandler = vi.fn();
      component.$on('toggle', toggleHandler);

      const button = screen.getByRole('button');
      await fireEvent.click(button);

      expect(toggleHandler).toHaveBeenCalledTimes(1);
      expect(toggleHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { expanded: true }
        })
      );
    });

    it('dispatches toggle with false when collapsing', async () => {
      const { component } = render(MobileCollapseToggle, {
        props: { expanded: true }
      });
      const toggleHandler = vi.fn();
      component.$on('toggle', toggleHandler);

      const button = screen.getByRole('button');
      await fireEvent.click(button);

      expect(toggleHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { expanded: false }
        })
      );
    });
  });

  describe('styling', () => {
    it('applies custom icon color', () => {
      render(MobileCollapseToggle, {
        props: { iconColor: '#ff0000' }
      });
      const button = screen.getByRole('button');
      expect(button.getAttribute('style')).toContain('color: #ff0000');
    });

    it('applies custom background color', () => {
      render(MobileCollapseToggle, {
        props: { backgroundColor: '#333333' }
      });
      const button = screen.getByRole('button');
      expect(button.getAttribute('style')).toContain('background-color: #333333');
    });
  });

  describe('accessibility', () => {
    it('has aria-label for screen readers', () => {
      render(MobileCollapseToggle, {
        props: { label: 'Menu' }
      });
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Toggle Menu');
    });

    it('has aria-expanded attribute', () => {
      render(MobileCollapseToggle);
      const button = screen.getByRole('button');
      expect(button.hasAttribute('aria-expanded')).toBe(true);
    });

    it('updates aria-expanded on toggle', async () => {
      render(MobileCollapseToggle);
      const button = screen.getByRole('button');

      expect(button.getAttribute('aria-expanded')).toBe('false');
      await fireEvent.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
