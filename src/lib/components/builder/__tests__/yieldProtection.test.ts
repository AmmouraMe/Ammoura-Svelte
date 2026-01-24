import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import BuilderCanvas from '$lib/components/builder/BuilderCanvas.svelte';
import type { PageComponent } from '$lib/types/pages';

describe('Yield Component Protection in Layout Mode', () => {
  const mockYieldComponent: PageComponent = {
    id: 'yield-1',
    page_id: '1',
    type: 'yield',
    position: 0,
    config: {},
    created_at: Date.now(),
    updated_at: Date.now()
  };

  const mockTextComponent: PageComponent = {
    id: 'text-1',
    page_id: '1',
    type: 'text',
    position: 1,
    config: {},
    created_at: Date.now(),
    updated_at: Date.now()
  };

  it('hides delete button for Yield Component in layout mode', () => {
    const { container } = render(BuilderCanvas, {
      props: {
        mode: 'layout',
        pageComponents: [mockYieldComponent],
        selectedComponent: mockYieldComponent,
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'default',
        userCurrentThemeId: 'default',
        colorThemes: []
      }
    });

    // The delete button should not be present for Yield Component in layout mode
    const deleteButtons = container.querySelectorAll('.btn-danger');
    expect(deleteButtons.length).toBe(0);
  });

  it('shows delete button for non-Yield Components in layout mode', () => {
    const { container } = render(BuilderCanvas, {
      props: {
        mode: 'layout',
        pageComponents: [mockTextComponent],
        selectedComponent: mockTextComponent,
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'default',
        userCurrentThemeId: 'default',
        colorThemes: []
      }
    });

    // The delete button should be present for non-Yield Components
    const deleteButtons = container.querySelectorAll('.btn-danger');
    expect(deleteButtons.length).toBe(1);
  });

  it('shows delete button for Yield Component in page mode', () => {
    const { container } = render(BuilderCanvas, {
      props: {
        mode: 'page',
        pageComponents: [mockYieldComponent],
        selectedComponent: mockYieldComponent,
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'default',
        userCurrentThemeId: 'default',
        colorThemes: []
      }
    });

    // The delete button should be present for Yield Components in page mode
    const deleteButtons = container.querySelectorAll('.btn-danger');
    expect(deleteButtons.length).toBe(1);
  });

  it('prevents deletion event from being dispatched for Yield Component in layout mode', () => {
    const deleteWidgetSpy = vi.fn();

    const { component, container } = render(BuilderCanvas, {
      props: {
        mode: 'layout',
        pageComponents: [mockYieldComponent, mockTextComponent],
        selectedComponent: mockYieldComponent,
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'default',
        userCurrentThemeId: 'default',
        colorThemes: []
      }
    });

    component.$on('deleteWidget', deleteWidgetSpy);

    // Since the delete button should not exist for Yield Component, we can't click it
    const deleteButtons = container.querySelectorAll('.btn-danger');
    expect(deleteButtons.length).toBe(0);
    expect(deleteWidgetSpy).not.toHaveBeenCalled();
  });
});
