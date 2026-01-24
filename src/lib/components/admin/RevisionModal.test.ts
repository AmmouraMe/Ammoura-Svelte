import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import RevisionModal from './RevisionModal.svelte';
import type { RevisionNode } from '$lib/types/revisions';

describe('RevisionModal - published revision styling', () => {
  const mockRevisions: RevisionNode<unknown>[] = [
    {
      id: 'rev-1',
      site_id: 'site-1',
      entity_type: 'page',
      entity_id: 'page-1',
      revision_hash: 'abc12345',
      parent_revision_id: undefined,
      data: { title: 'Test Page', slug: 'test-page', status: 'published', widgets: [] },
      created_at: Math.floor(Date.now() / 1000) - 3600,
      is_current: true,
      children: [],
      depth: 0,
      branch: 0
    },
    {
      id: 'rev-2',
      site_id: 'site-1',
      entity_type: 'page',
      entity_id: 'page-1',
      revision_hash: 'def67890',
      parent_revision_id: 'rev-1',
      data: { title: 'Test Page', slug: 'test-page', status: 'draft', widgets: [] },
      created_at: Math.floor(Date.now() / 1000) - 1800,
      is_current: false,
      children: [],
      depth: 1,
      branch: 0
    },
    {
      id: 'rev-3',
      site_id: 'site-1',
      entity_type: 'page',
      entity_id: 'page-1',
      revision_hash: 'ghi11111',
      parent_revision_id: 'rev-2',
      data: { title: 'Test Page', slug: 'test-page', status: 'draft', widgets: [] },
      created_at: Math.floor(Date.now() / 1000),
      is_current: false,
      children: [],
      depth: 2,
      branch: 0
    }
  ];

  it('applies published class to published revisions in graph view', async () => {
    render(RevisionModal, {
      props: {
        isOpen: true,
        revisions: mockRevisions,
        currentRevisionId: 'rev-2',
        onSelect: vi.fn(),
        onClose: vi.fn()
      }
    });

    // Graph view is now the only view - check revision rows
    const revisionRows = document.querySelectorAll('.revision-row');
    expect(revisionRows.length).toBe(3);

    // Find the published revision row (rev-1 has is_current: true)
    const publishedRows = document.querySelectorAll('.revision-row.published');
    expect(publishedRows.length).toBe(1);

    // Find the selected revision row (rev-2 is currentRevisionId)
    const selectedRows = document.querySelectorAll('.revision-row.selected');
    expect(selectedRows.length).toBe(1);
  });

  it('applies selected class to the current revision in graph view', async () => {
    render(RevisionModal, {
      props: {
        isOpen: true,
        revisions: mockRevisions,
        currentRevisionId: 'rev-2',
        onSelect: vi.fn(),
        onClose: vi.fn()
      }
    });

    // Graph view is now the only view
    // Check that only one revision has the selected class
    const selectedRows = document.querySelectorAll('.revision-row.selected');
    expect(selectedRows.length).toBe(1);

    // Check that other revisions don't have the selected class
    const nonSelectedRows = document.querySelectorAll('.revision-row:not(.selected)');
    expect(nonSelectedRows.length).toBe(2);
  });

  it('calls onSelect when clicking a revision row', async () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();

    render(RevisionModal, {
      props: {
        isOpen: true,
        revisions: mockRevisions,
        currentRevisionId: 'rev-2',
        onSelect: mockOnSelect,
        onClose: mockOnClose
      }
    });

    // Click on a revision row
    const revisionRows = document.querySelectorAll('.revision-row');
    await (revisionRows[0] as HTMLElement).click();

    // Verify onSelect was called
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });
});
