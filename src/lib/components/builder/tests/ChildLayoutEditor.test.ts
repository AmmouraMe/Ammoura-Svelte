import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ChildLayoutEditor from '../ChildLayoutEditor.svelte';
import type { ComponentConfig, Breakpoint } from '$lib/types/pages';

describe('ChildLayoutEditor', () => {
  let mockConfig: ComponentConfig;
  let mockOnUpdate: ReturnType<typeof vi.fn>;
  const currentBreakpoint: Breakpoint = 'desktop';

  beforeEach(() => {
    mockConfig = {
      text: 'Test child',
      layoutFlexGrow: { desktop: 0, tablet: 0, mobile: 0 },
      layoutFlexShrink: { desktop: 1, tablet: 1, mobile: 1 },
      layoutAlignSelf: { desktop: 'auto', tablet: 'auto', mobile: 'auto' },
      layoutOrder: { desktop: 0, tablet: 0, mobile: 0 }
    };
    mockOnUpdate = vi.fn();
  });

  describe('Rendering', () => {
    it('renders the layout editor sections', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Child Layout')).toBeInTheDocument();
    });

    it('shows flex controls when parent display mode is flex', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Flex Grow')).toBeInTheDocument();
      expect(screen.getByText('Flex Shrink')).toBeInTheDocument();
      expect(screen.getByText('Align Self')).toBeInTheDocument();
    });

    it('shows grid controls when parent display mode is grid', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'grid',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Grid Column')).toBeInTheDocument();
      expect(screen.getByText('Grid Row')).toBeInTheDocument();
    });

    it('shows order control in both flex and grid modes', () => {
      const { rerender } = render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Order')).toBeInTheDocument();

      rerender({
        config: mockConfig,
        currentBreakpoint,
        parentDisplayMode: 'grid',
        onUpdate: mockOnUpdate
      });

      expect(screen.getByText('Order')).toBeInTheDocument();
    });

    it('displays current breakpoint indicator', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'tablet',
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('tablet')).toBeInTheDocument();
    });
  });

  describe('Flex Controls', () => {
    it('updates flex-grow when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const growInput = screen.getByLabelText('Flex Grow');
      await fireEvent.input(growInput, { target: { value: '2' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutFlexGrow.desktop).toBe(2);
    });

    it('updates flex-shrink when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const shrinkInput = screen.getByLabelText('Flex Shrink');
      await fireEvent.input(shrinkInput, { target: { value: '0' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutFlexShrink.desktop).toBe(0);
    });

    it('updates align-self when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const alignSelect = screen.getByLabelText('Align Self');
      await fireEvent.change(alignSelect, { target: { value: 'center' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutAlignSelf.desktop).toBe('center');
    });

    it('shows flex-basis input', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Flex Basis')).toBeInTheDocument();
    });
  });

  describe('Grid Controls', () => {
    it('updates grid-column when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'grid',
          onUpdate: mockOnUpdate
        }
      });

      const colInput = screen.getByLabelText('Grid Column');
      await fireEvent.input(colInput, { target: { value: 'span 2' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutGridColumn.desktop).toBe('span 2');
    });

    it('updates grid-row when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'grid',
          onUpdate: mockOnUpdate
        }
      });

      const rowInput = screen.getByLabelText('Grid Row');
      await fireEvent.input(rowInput, { target: { value: '1 / 3' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutGridRow.desktop).toBe('1 / 3');
    });

    it('shows place-self control for grid mode', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'grid',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByText('Place Self')).toBeInTheDocument();
    });
  });

  describe('Order Control', () => {
    it('updates order when changed', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const orderInput = screen.getByLabelText('Order');
      await fireEvent.input(orderInput, { target: { value: '5' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutOrder.desktop).toBe(5);
    });

    it('allows negative order values', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const orderInput = screen.getByLabelText('Order');
      await fireEvent.input(orderInput, { target: { value: '-1' } });

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutOrder.desktop).toBe(-1);
    });
  });

  describe('Responsive Values', () => {
    it('initializes with default values if not provided', () => {
      const emptyConfig: ComponentConfig = { text: 'No layout props' };

      render(ChildLayoutEditor, {
        props: {
          config: emptyConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      // Should render without errors and show default values
      expect(screen.getByText('Child Layout')).toBeInTheDocument();
    });

    it('applies changes only to current breakpoint', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint: 'tablet',
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const growInput = screen.getByLabelText('Flex Grow');
      await fireEvent.input(growInput, { target: { value: '3' } });

      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutFlexGrow.tablet).toBe(3);
      // Other breakpoints should remain unchanged
      expect(updatedConfig.layoutFlexGrow.desktop).toBe(0);
    });
  });

  describe('Quick Presets', () => {
    it('shows quick preset buttons for common flex patterns', () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      expect(screen.getByRole('button', { name: /fill/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fixed/i })).toBeInTheDocument();
    });

    it('applies fill preset (flex-grow: 1)', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const fillBtn = screen.getByRole('button', { name: /fill/i });
      await fireEvent.click(fillBtn);

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutFlexGrow.desktop).toBe(1);
      expect(updatedConfig.layoutFlexShrink.desktop).toBe(1);
    });

    it('applies fixed preset (flex-grow: 0, flex-shrink: 0)', async () => {
      render(ChildLayoutEditor, {
        props: {
          config: mockConfig,
          currentBreakpoint,
          parentDisplayMode: 'flex',
          onUpdate: mockOnUpdate
        }
      });

      const fixedBtn = screen.getByRole('button', { name: /fixed/i });
      await fireEvent.click(fixedBtn);

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedConfig = mockOnUpdate.mock.calls[0][0];
      expect(updatedConfig.layoutFlexGrow.desktop).toBe(0);
      expect(updatedConfig.layoutFlexShrink.desktop).toBe(0);
    });
  });
});
