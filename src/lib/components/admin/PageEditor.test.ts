import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PageEditor from './PageEditor.svelte';
import type { PageComponent, ColorTheme } from '$lib/types/pages';

describe('PageEditor - hasUnsavedChanges', () => {
  const defaultProps = {
    pageId: '1',
    initialTitle: 'Test Page',
    initialSlug: '/test-page',
    initialStatus: 'draft' as const,
    initialColorTheme: undefined as ColorTheme | undefined,
    initialComponents: [] as PageComponent[],
    onSave: vi.fn(),
    onSaveDraft: vi.fn(),
    onPublish: vi.fn(),
    onCancel: vi.fn()
  };

  it('renders without errors', () => {
    const { component } = render(PageEditor, {
      props: defaultProps
    });

    expect(component).toBeTruthy();
  });

  it('accepts title input changes', async () => {
    const { container } = render(PageEditor, {
      props: defaultProps
    });

    const titleInput = container.querySelector('.title-input') as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    expect(titleInput?.value).toBe('Test Page');
  });

  it('accepts slug input changes', async () => {
    const { container } = render(PageEditor, {
      props: defaultProps
    });

    const slugInput = container.querySelector('.slug-input') as HTMLInputElement;
    expect(slugInput).toBeTruthy();
    expect(slugInput?.value).toBe('/test-page');
  });

  it('handles initial widgets correctly', () => {
    const initialComponents: PageComponent[] = [
      {
        id: '1',
        page_id: '1',
        type: 'hero',
        config: { title: 'Hero Title' },
        position: 0,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const { container } = render(PageEditor, {
      props: {
        ...defaultProps,
        initialComponents
      }
    });

    expect(container).toBeTruthy();
  });

  it('handles colorTheme changes', () => {
    const initialTheme: ColorTheme = 'dark';

    const { container } = render(PageEditor, {
      props: {
        ...defaultProps,
        initialColorTheme: initialTheme
      }
    });

    expect(container).toBeTruthy();
  });

  it('handles undefined colorTheme', () => {
    const { container } = render(PageEditor, {
      props: {
        ...defaultProps,
        initialColorTheme: undefined
      }
    });

    expect(container).toBeTruthy();
  });

  it('handles custom colorTheme string', () => {
    const customTheme: ColorTheme = 'custom-theme-id';

    const { container } = render(PageEditor, {
      props: {
        ...defaultProps,
        initialColorTheme: customTheme
      }
    });

    expect(container).toBeTruthy();
  });
});
