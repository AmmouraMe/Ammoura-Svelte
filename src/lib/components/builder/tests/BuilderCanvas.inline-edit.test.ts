import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BuilderCanvas from '../BuilderCanvas.svelte';
import type { PageComponent } from '$lib/types/pages';

describe('BuilderCanvas - Inline Editing', () => {
  it('dispatches updateComponent when hero title is edited', async () => {
    const pageComponents: PageComponent[] = [
      {
        id: 'component-1',
        page_id: 'test-page',
        type: 'hero',
        position: 0,
        config: {
          title: 'Original Title',
          subtitle: 'Original Subtitle',
          backgroundColor: 'theme:primary'
        },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const updateComponentSpy = vi.fn();

    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents,
        selectedComponent: null,
        hoveredComponent: null,
        currentBreakpoint: 'desktop' as const,
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    component.$on('updateComponent', updateComponentSpy);

    // Find the h1 element which should be contenteditable
    const titleElement = screen.getByText('Original Title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement.getAttribute('contenteditable')).toBe('true');

    // Simulate editing the title by directly updating textContent and triggering input
    titleElement.textContent = 'New Title';
    titleElement.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait a bit for the event to propagate
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The updateComponent event should be dispatched with updated config
    expect(updateComponentSpy).toHaveBeenCalled();

    const lastCall = updateComponentSpy.mock.calls[updateComponentSpy.mock.calls.length - 1];
    const updatedWidget = lastCall[0].detail;

    expect(updatedWidget.config.title).toBe('New Title');
    expect(updatedWidget.id).toBe('component-1');
  });

  it('dispatches updateComponent when hero subtitle is edited', async () => {
    const pageComponents: PageComponent[] = [
      {
        id: 'component-2',
        page_id: 'test-page',
        type: 'hero',
        position: 0,
        config: {
          title: 'Hero Title',
          subtitle: 'Original Subtitle',
          backgroundColor: 'theme:primary'
        },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const updateComponentSpy = vi.fn();

    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents,
        selectedComponent: null,
        hoveredComponent: null,
        currentBreakpoint: 'desktop' as const,
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    component.$on('updateComponent', updateComponentSpy);

    // Find the subtitle paragraph element
    const subtitleElement = screen.getByText('Original Subtitle');
    expect(subtitleElement).toBeInTheDocument();
    expect(subtitleElement.getAttribute('contenteditable')).toBe('true');

    // Simulate editing the subtitle by directly updating textContent and triggering input
    subtitleElement.textContent = 'New Subtitle';
    subtitleElement.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait a bit for the event to propagate
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The updateComponent event should be dispatched
    expect(updateComponentSpy).toHaveBeenCalled();

    const lastCall = updateComponentSpy.mock.calls[updateComponentSpy.mock.calls.length - 1];
    const updatedWidget = lastCall[0].detail;

    expect(updatedWidget.config.subtitle).toBe('New Subtitle');
    expect(updatedWidget.id).toBe('component-2');
  });

  it('renders hero component with contenteditable elements', async () => {
    const pageComponents: PageComponent[] = [
      {
        id: 'component-3',
        page_id: 'test-page',
        type: 'hero',
        position: 0,
        config: {
          title: 'Hero Title',
          subtitle: 'Hero Subtitle',
          backgroundColor: 'theme:primary'
        },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const updateComponentSpy = vi.fn();

    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents,
        selectedComponent: null,
        hoveredComponent: null,
        currentBreakpoint: 'desktop' as const,
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    component.$on('updateComponent', updateComponentSpy);

    // Verify that elements are contenteditable
    const titleElement = screen.getByText('Hero Title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement.getAttribute('contenteditable')).toBe('true');
  });
});
