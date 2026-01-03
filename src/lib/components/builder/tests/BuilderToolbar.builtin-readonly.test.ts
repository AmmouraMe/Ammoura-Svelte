import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BuilderToolbar from '../BuilderToolbar.svelte';

describe('BuilderToolbar - Built-in Component Name Protection', () => {
  const defaultProps = {
    mode: 'component' as const,
    title: 'Navigation Bar',
    slug: '/component-1',
    currentBreakpoint: 'desktop' as const,
    colorTheme: 'vibrant',
    colorThemes: [],
    layoutId: null,
    layouts: [],
    hasUnsavedChanges: false,
    isSaving: false,
    lastSavedAt: null,
    canUndo: false,
    canRedo: false,
    canPublish: true,
    userName: 'Test User'
  };

  it('should make title input readonly for built-in components', () => {
    render(BuilderToolbar, {
      props: {
        ...defaultProps,
        isBuiltIn: true
      }
    });

    const titleInput = screen.getByDisplayValue('Navigation Bar') as HTMLInputElement;
    expect(titleInput).toHaveAttribute('readonly');
    expect(titleInput).toHaveClass('readonly');
    expect(titleInput.title).toBe('Built-in component names cannot be changed');
  });

  it('should allow title editing for non-built-in components', () => {
    render(BuilderToolbar, {
      props: {
        ...defaultProps,
        isBuiltIn: false
      }
    });

    const titleInput = screen.getByDisplayValue('Navigation Bar') as HTMLInputElement;
    expect(titleInput).not.toHaveAttribute('readonly');
    expect(titleInput).not.toHaveClass('readonly');
  });

  it('should not dispatch updateTitle event for built-in components', async () => {
    const user = userEvent.setup();
    const updateTitleHandler = vi.fn();

    const { component } = render(BuilderToolbar, {
      props: {
        ...defaultProps,
        isBuiltIn: true
      }
    });

    component.$on('updateTitle', updateTitleHandler);

    const titleInput = screen.getByDisplayValue('Navigation Bar') as HTMLInputElement;

    // Try to type in the input - should not work because it's readonly
    await user.type(titleInput, ' Modified');

    // Value should not change and event should not be dispatched
    expect(updateTitleHandler).not.toHaveBeenCalled();
  });

  it('should dispatch updateTitle event for non-built-in components', async () => {
    const user = userEvent.setup();
    const updateTitleHandler = vi.fn();

    const { component } = render(BuilderToolbar, {
      props: {
        ...defaultProps,
        isBuiltIn: false
      }
    });

    component.$on('updateTitle', updateTitleHandler);

    const titleInput = screen.getByDisplayValue('Navigation Bar') as HTMLInputElement;

    // Clear and type new value
    await user.clear(titleInput);
    await user.type(titleInput, 'My Component');

    // Event should be dispatched
    expect(updateTitleHandler).toHaveBeenCalled();
  });

  it('should default isBuiltIn to false when not provided', () => {
    render(BuilderToolbar, {
      props: defaultProps
    });

    const titleInput = screen.getByDisplayValue('Navigation Bar') as HTMLInputElement;
    expect(titleInput).not.toHaveAttribute('readonly');
  });
});
