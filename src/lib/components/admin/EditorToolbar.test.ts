import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EditorToolbar from './EditorToolbar.svelte';
import type { ColorTheme } from '$lib/types/pages';

describe('EditorToolbar', () => {
  const defaultProps = {
    title: 'Test Page',
    slug: '/test-page',
    status: 'draft' as const,
    colorTheme: undefined as ColorTheme | undefined,
    currentBreakpoint: 'desktop' as const,
    saving: false,
    publishing: false,
    canSaveDraft: false,
    canPublish: false,
    lastSaved: null,
    canUndo: false,
    canRedo: false,
    pageId: '1',
    revisions: [],
    currentRevisionId: null,
    showComponentLibrary: true,
    showPropertiesPanel: true,
    events: {
      undo: vi.fn(),
      redo: vi.fn(),
      saveDraft: vi.fn(),
      publish: vi.fn(),
      save: vi.fn(),
      cancel: vi.fn(),
      loadRevision: vi.fn(),
      publishRevision: vi.fn(),
      toggleComponentLibrary: vi.fn(),
      togglePropertiesPanel: vi.fn(),
      changeTheme: vi.fn()
    }
  };

  describe('Publish button', () => {
    it('disables publish button when viewing published version with no changes', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: false
        }
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).toBeDisabled();
      expect(publishButton).toHaveAttribute('title', 'Already viewing published version');
    });

    it('enables publish button when viewing draft with no changes', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: true
        }
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).not.toBeDisabled();
    });

    it('enables publish button when there are unsaved changes', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: true
        }
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).not.toBeDisabled();
    });

    it('disables publish button when saving', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: true,
          saving: true
        }
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).toBeDisabled();
    });

    it('disables publish button when publishing', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: true,
          publishing: true
        }
      });

      const publishButton = screen.getByRole('button', { name: /publishing/i });
      expect(publishButton).toBeDisabled();
    });

    it('calls publish event when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const publishSpy = vi.fn();

      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canPublish: true,
          events: {
            ...defaultProps.events,
            publish: publishSpy
          }
        }
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      await user.click(publishButton);

      expect(publishSpy).toHaveBeenCalledTimes(1);
    });

    it('does not render publish button for new pages (no pageId)', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          pageId: null,
          canPublish: true
        }
      });

      const publishButtons = screen.queryAllByRole('button', { name: /publish/i });
      expect(publishButtons).toHaveLength(0);
    });
  });

  describe('Save Draft button', () => {
    it('renders save draft button for existing pages', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          pageId: '1'
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftButton).toBeInTheDocument();
    });

    it('disables save draft button when there are no unsaved changes', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canSaveDraft: false
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftButton).toBeDisabled();
      expect(saveDraftButton).toHaveAttribute('title', 'No changes to save');
    });

    it('enables save draft button when there are unsaved changes', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canSaveDraft: true
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftButton).not.toBeDisabled();
    });

    it('disables save draft button when saving', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canSaveDraft: true,
          saving: true
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /saving/i });
      expect(saveDraftButton).toBeDisabled();
    });

    it('disables save draft button when publishing', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canSaveDraft: true,
          publishing: true
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftButton).toBeDisabled();
    });

    it('calls saveDraft event when clicked with unsaved changes', async () => {
      const user = userEvent.setup({ delay: null });
      const saveDraftSpy = vi.fn();

      render(EditorToolbar, {
        props: {
          ...defaultProps,
          canSaveDraft: true,
          events: {
            ...defaultProps.events,
            saveDraft: saveDraftSpy
          }
        }
      });

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftButton);

      expect(saveDraftSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Create button', () => {
    it('renders create button for new pages', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          pageId: null
        }
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeInTheDocument();
    });

    it('disables create button when saving', () => {
      render(EditorToolbar, {
        props: {
          ...defaultProps,
          pageId: null,
          saving: true
        }
      });

      const createButton = screen.getByRole('button', { name: /creating/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Edge Cases - Button States', () => {
    describe('Viewing a published version', () => {
      it('both buttons disabled when viewing published with no changes', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: false
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });

      it('both buttons enabled when viewing published with changes', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: true,
            canPublish: true
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).not.toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });

    describe('Viewing a draft version', () => {
      it('save draft disabled, publish enabled when viewing draft with no changes', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: true
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });

      it('both buttons enabled when viewing draft with changes', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: true,
            canPublish: true
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).not.toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });

    describe('After saving a draft', () => {
      it('save draft disabled, publish enabled (draft can be promoted)', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: true
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });

    describe('After publishing', () => {
      it('both buttons disabled (no changes, viewing published)', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: false
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });
    });

    describe('Loading old draft from history', () => {
      it('save draft disabled, publish enabled (can promote old draft)', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: true,
            currentRevisionId: 'old-draft-123'
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });

    describe('Loading old published version from history', () => {
      it('both buttons disabled (viewing old published, no changes)', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: false,
            canPublish: false,
            currentRevisionId: 'old-published-456'
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });
    });

    describe('Making changes after loading revision', () => {
      it('both buttons enabled when changes made to any loaded revision', () => {
        render(EditorToolbar, {
          props: {
            ...defaultProps,
            canSaveDraft: true,
            canPublish: true,
            currentRevisionId: 'any-revision-789'
          }
        });

        const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
        const publishButton = screen.getByRole('button', { name: /publish/i });

        expect(saveDraftButton).not.toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });
  });
});
