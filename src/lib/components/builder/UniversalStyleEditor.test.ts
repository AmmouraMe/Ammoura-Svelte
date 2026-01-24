import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import UniversalStyleEditor from './UniversalStyleEditor.svelte';
import type { ComponentConfig, Breakpoint } from '$lib/types/pages';

describe('UniversalStyleEditor', () => {
  const mockConfig: ComponentConfig = {
    id: 'test-component',
    styles: {}
  };

  const defaultProps = {
    config: mockConfig,
    currentBreakpoint: 'desktop' as Breakpoint,
    colorTheme: 'default',
    colorThemes: []
  };

  describe('Rendering', () => {
    it('renders breakpoint badge', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Breakpoint:')).toBeInTheDocument();
      expect(screen.getByText('desktop')).toBeInTheDocument();
    });

    it('renders padding section', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Padding')).toBeInTheDocument();
      // Padding inputs exist with specific IDs
      expect(document.getElementById('padding-top')).toBeInTheDocument();
      expect(document.getElementById('padding-right')).toBeInTheDocument();
      expect(document.getElementById('padding-bottom')).toBeInTheDocument();
      expect(document.getElementById('padding-left')).toBeInTheDocument();
    });

    it('renders margin section', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Margin')).toBeInTheDocument();
    });

    it('renders size section', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByLabelText('Width')).toBeInTheDocument();
      expect(screen.getByLabelText('Height')).toBeInTheDocument();
    });

    it('renders background section', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(screen.getByLabelText('Background Image URL')).toBeInTheDocument();
    });

    it('renders border section', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByText('Border')).toBeInTheDocument();
      expect(screen.getByLabelText('Border Width (px)')).toBeInTheDocument();
      expect(screen.getByLabelText('Border Style')).toBeInTheDocument();
      expect(screen.getByLabelText('Border Radius (px)')).toBeInTheDocument();
    });
  });

  describe('Padding Controls', () => {
    it('dispatches update when padding changes', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(UniversalStyleEditor, {
        props: defaultProps
      });

      component.$on('update', handleUpdate);

      // Use the specific ID for padding-top input
      const paddingTopInput = document.getElementById('padding-top') as HTMLInputElement;
      await fireEvent.input(paddingTopInput, { target: { value: '20' } });

      expect(handleUpdate).toHaveBeenCalled();
    });
  });

  describe('Size Controls', () => {
    it('dispatches update when width changes', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(UniversalStyleEditor, {
        props: defaultProps
      });

      component.$on('update', handleUpdate);

      const widthInput = screen.getByLabelText('Width');
      await fireEvent.input(widthInput, { target: { value: '100%' } });

      expect(handleUpdate).toHaveBeenCalled();
    });

    it('has quick width buttons', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '50%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fit Content' })).toBeInTheDocument();
    });

    it('applies quick width preset when clicked', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(UniversalStyleEditor, {
        props: defaultProps
      });

      component.$on('update', handleUpdate);

      const fullWidthBtn = screen.getByRole('button', { name: '100%' });
      await fireEvent.click(fullWidthBtn);

      expect(handleUpdate).toHaveBeenCalled();
    });
  });

  describe('Border Controls', () => {
    it('dispatches update when border width changes', async () => {
      const handleUpdate = vi.fn();
      const { component } = render(UniversalStyleEditor, {
        props: defaultProps
      });

      component.$on('update', handleUpdate);

      const borderWidthInput = screen.getByLabelText('Border Width (px)');
      await fireEvent.input(borderWidthInput, { target: { value: '2' } });

      expect(handleUpdate).toHaveBeenCalled();
    });

    it('has border style dropdown', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      const borderStyleSelect = screen.getByLabelText('Border Style');
      expect(borderStyleSelect).toBeInTheDocument();
    });

    it('has quick border radius buttons', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      // Find all quick radius buttons (0, 4, 8, 16, Full)
      const quickButtons = screen
        .getAllByRole('button')
        .filter((btn) => ['0', '4', '8', '16', 'Full'].includes(btn.textContent || ''));
      expect(quickButtons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Responsive Values', () => {
    it('displays current breakpoint in badge', () => {
      render(UniversalStyleEditor, {
        props: {
          ...defaultProps,
          currentBreakpoint: 'tablet' as Breakpoint
        }
      });

      expect(screen.getByText('tablet')).toBeInTheDocument();
    });
  });

  describe('Margin Center Button', () => {
    it('has a center button for auto margins', () => {
      render(UniversalStyleEditor, { props: defaultProps });

      const centerBtn = screen.getByRole('button', { name: 'Center' });
      expect(centerBtn).toBeInTheDocument();
    });
  });
});
