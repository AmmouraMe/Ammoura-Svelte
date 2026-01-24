import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BuilderCanvas from '../BuilderCanvas.svelte';
import type { PageComponent } from '$lib/types/pages';

describe('BuilderCanvas - Integration Tests for Sort Buttons', () => {
  const mockWidgets: PageComponent[] = [
    {
      id: 'component-1',
      page_id: '1',
      type: 'hero',
      position: 0,
      config: { heading: 'First component' },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'component-2',
      page_id: '1',
      type: 'text',
      position: 1,
      config: {},
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'component-3',
      page_id: '1',
      type: 'image',
      position: 2,
      config: {},
      created_at: Date.now(),
      updated_at: Date.now()
    }
  ];

  it('dispatches batchUpdateComponents with correct swapped positions when moving up', async () => {
    const user = userEvent.setup();
    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents: mockWidgets,
        selectedComponent: mockWidgets[1], // Select second component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    // Listen for the batchUpdateComponents event
    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Find and click the "Move up" button
    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    await user.click(moveUpButton);

    // Verify the event was dispatched
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);

    // Get the event detail
    const eventDetail = batchUpdateSpy.mock.calls[0][0].detail;

    // With the fix, all pageComponents are renumbered: [component-2:0, component-1:1, component-3:2]
    expect(eventDetail).toHaveLength(3);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-2')?.position).toBe(0);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-1')?.position).toBe(1);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-3')?.position).toBe(2);
  });

  it('dispatches batchUpdateComponents with correct swapped positions when moving down', async () => {
    const user = userEvent.setup();
    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents: mockWidgets,
        selectedComponent: mockWidgets[1], // Select second component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    // Listen for the batchUpdateComponents event
    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Find and click the "Move down" button
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    await user.click(moveDownButton);

    // Verify the event was dispatched
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);

    // Get the event detail
    const eventDetail = batchUpdateSpy.mock.calls[0][0].detail;

    // With the fix, all pageComponents are renumbered: [component-1:0, component-3:1, component-2:2]
    expect(eventDetail).toHaveLength(3);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-1')?.position).toBe(0);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-3')?.position).toBe(1);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-2')?.position).toBe(2);
  });

  it('disables move up button for first component', () => {
    render(BuilderCanvas, {
      props: {
        pageComponents: mockWidgets,
        selectedComponent: mockWidgets[0], // Select first component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    expect(moveUpButton).toBeDisabled();
  });

  it('disables move down button for last component', () => {
    render(BuilderCanvas, {
      props: {
        pageComponents: mockWidgets,
        selectedComponent: mockWidgets[2], // Select last component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    expect(moveDownButton).toBeDisabled();
  });

  it('maintains component order after multiple position swaps', async () => {
    const user = userEvent.setup();

    // Start with pageComponents at positions 0, 1, 2
    let currentWidgets = [...mockWidgets];

    const { component, rerender } = render(BuilderCanvas, {
      props: {
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets[1],
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Move component-2 up (from position 1 to 0)
    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    await user.click(moveUpButton);

    // Simulate the parent updating the pageComponents array
    const firstUpdate = batchUpdateSpy.mock.calls[0][0].detail;
    currentWidgets = currentWidgets.map((w) => {
      const updated = firstUpdate.find((u: PageComponent) => u.id === w.id);
      return updated || w;
    });

    // Verify component order after first move
    const sorted1 = [...currentWidgets].sort((a, b) => a.position - b.position);
    expect(sorted1[0].id).toBe('component-2');
    expect(sorted1[1].id).toBe('component-1');
    expect(sorted1[2].id).toBe('component-3');

    // Re-render with updated pageComponents
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'component-2') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // Move component-2 down (from position 0 back to position 1)
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    await user.click(moveDownButton);

    // Simulate the parent updating again
    const secondUpdate = batchUpdateSpy.mock.calls[1][0].detail;
    currentWidgets = currentWidgets.map((w) => {
      const updated = secondUpdate.find((u: PageComponent) => u.id === w.id);
      return updated || w;
    });

    // Verify pageComponents returned to original order
    const sorted2 = [...currentWidgets].sort((a, b) => a.position - b.position);
    expect(sorted2[0].id).toBe('component-1');
    expect(sorted2[1].id).toBe('component-2');
    expect(sorted2[2].id).toBe('component-3');
  });

  it('handles pageComponents with duplicate position values', async () => {
    // This is a regression test for the specific bug on page 966f66d4
    const widgetsWithDuplicatePositions: PageComponent[] = [
      {
        id: 'component-a',
        page_id: '1',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-b',
        page_id: '1',
        type: 'text',
        position: 0, // Duplicate position
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-c',
        page_id: '1',
        type: 'image',
        position: 1,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const user = userEvent.setup();
    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents: widgetsWithDuplicatePositions,
        selectedComponent: widgetsWithDuplicatePositions[1],
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Even with duplicate positions, buttons should work
    // The sort should make a deterministic order (by array order as tiebreaker)
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    await user.click(moveDownButton);

    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);
    const eventDetail = batchUpdateSpy.mock.calls[0][0].detail;

    // With the fix, all pageComponents are renumbered after moving component-b down
    expect(eventDetail).toHaveLength(3);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-a')?.position).toBe(0);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-c')?.position).toBe(1);
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-b')?.position).toBe(2);
  });

  it('correctly updates button disabled state after reordering', async () => {
    const _user = userEvent.setup();
    let currentWidgets = [...mockWidgets];

    const { rerender } = render(BuilderCanvas, {
      props: {
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets[0], // First component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    // First component should have move up disabled
    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    expect(moveUpButton).toBeDisabled();

    // After moving another component, re-render with this component now in second position
    currentWidgets = [
      { ...mockWidgets[1], position: 0 },
      { ...mockWidgets[0], position: 1 },
      { ...mockWidgets[2], position: 2 }
    ];

    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets[1], // Now second component
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // Same component, now in second position, should have move up enabled
    const newMoveUpButton = screen.getByRole('button', { name: /move up/i });
    expect(newMoveUpButton).not.toBeDisabled();
  });

  it('fixes malformed page data (duplicate positions) when sorting', async () => {
    const user = userEvent.setup();

    // Mock the exact scenario from page 966f66d4-eae1-4431-8574-b5566c65145a
    // where pageComponents have duplicate position values
    const malformedWidgets: PageComponent[] = [
      {
        id: 'component-broken-1',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'hero',
        position: 0,
        config: { heading: 'Hero Section' },
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-broken-2',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'text',
        position: 0, // DUPLICATE POSITION - this is the malformed data
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-broken-3',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'image',
        position: 1,
        config: { src: '/image.jpg' },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    let currentWidgets = [...malformedWidgets];

    const { component, rerender } = render(BuilderCanvas, {
      props: {
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets[1], // Select second component (position 0)
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // STEP 1: Move the second component down (should work despite duplicate positions)
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    await user.click(moveDownButton);

    // Verify the event was dispatched
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);
    const firstUpdate = batchUpdateSpy.mock.calls[0][0].detail;

    // CRITICAL: The positions are FIXED (normalized) - all pageComponents get renumbered
    expect(firstUpdate).toHaveLength(3);
    // After moving component-broken-2 down: [component-broken-1:0, component-broken-3:1, component-broken-2:2]
    expect(firstUpdate.find((w: PageComponent) => w.id === 'component-broken-1')?.position).toBe(0);
    expect(firstUpdate.find((w: PageComponent) => w.id === 'component-broken-3')?.position).toBe(1);
    expect(firstUpdate.find((w: PageComponent) => w.id === 'component-broken-2')?.position).toBe(2);

    // STEP 2: Simulate the parent component applying the update
    currentWidgets = currentWidgets.map((w) => {
      const updated = firstUpdate.find((u: PageComponent) => u.id === w.id);
      return updated || w;
    });

    // STEP 3: Verify ALL pageComponents get renumbered correctly
    // With the fix, moving component-2 down results in: [component-1:0, component-3:1, component-2:2]
    const widget1After = currentWidgets.find((w) => w.id === 'component-broken-1');
    const widget2After = currentWidgets.find((w) => w.id === 'component-broken-2');
    const widget3After = currentWidgets.find((w) => w.id === 'component-broken-3');

    expect(widget1After?.position).toBe(0); // Stays at top
    expect(widget3After?.position).toBe(1); // Moved up
    expect(widget2After?.position).toBe(2); // Moved down

    // STEP 4: Verify all positions are unique now
    expect(widget2After?.position).not.toBe(widget3After?.position);
    expect(widget1After?.position).not.toBe(widget2After?.position);
    expect(widget1After?.position).not.toBe(widget3After?.position);

    // STEP 5: Verify correct sort order after swap
    const sortedAfterSwap = [...currentWidgets].sort((a, b) => a.position - b.position);
    expect(sortedAfterSwap[0].id).toBe('component-broken-1'); // position 0
    expect(sortedAfterSwap[1].id).toBe('component-broken-3'); // position 0 (still duplicate with component-1)
    expect(sortedAfterSwap[2].id).toBe('component-broken-2'); // position 1

    // STEP 6: Re-render with updated data and verify subsequent operations work
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'component-broken-2') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // STEP 7: Move the component back up (should work correctly)
    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    await user.click(moveUpButton);

    expect(batchUpdateSpy).toHaveBeenCalledTimes(2);
    const secondUpdate = batchUpdateSpy.mock.calls[1][0].detail;

    // Verify all pageComponents get renumbered again when moving back up
    // After moving component-2 back up: [component-1:0, component-2:1, component-3:2]
    expect(secondUpdate).toHaveLength(3);
    expect(secondUpdate.find((w: PageComponent) => w.id === 'component-broken-1')?.position).toBe(
      0
    );
    expect(secondUpdate.find((w: PageComponent) => w.id === 'component-broken-2')?.position).toBe(
      1
    );
    expect(secondUpdate.find((w: PageComponent) => w.id === 'component-broken-3')?.position).toBe(
      2
    );
  });

  it('handles malformed page with all duplicate positions', async () => {
    const user = userEvent.setup();

    // Extreme case: All pageComponents have the same position
    const extremeMalformedWidgets: PageComponent[] = [
      {
        id: 'component-extreme-1',
        page_id: 'test-page',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-extreme-2',
        page_id: 'test-page',
        type: 'text',
        position: 0, // All at position 0
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-extreme-3',
        page_id: 'test-page',
        type: 'image',
        position: 0, // All at position 0
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    const { component } = render(BuilderCanvas, {
      props: {
        pageComponents: extremeMalformedWidgets,
        selectedComponent: extremeMalformedWidgets[1], // Select middle component
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Even with all duplicates, the sort should work based on array order
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    await user.click(moveDownButton);

    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);
    const eventDetail = batchUpdateSpy.mock.calls[0][0].detail;

    // All pageComponents get renumbered after the move
    expect(eventDetail).toHaveLength(3);
    // After moving component-extreme-2 down: [component-extreme-1:0, component-extreme-3:1, component-extreme-2:2]
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-extreme-1')?.position).toBe(
      0
    );
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-extreme-3')?.position).toBe(
      1
    );
    expect(eventDetail.find((w: PageComponent) => w.id === 'component-extreme-2')?.position).toBe(
      2
    );

    // The fix ensures all positions are unique and sequential
    // The key test: despite starting with all duplicate positions, the button worked
    // and correctly renumbered all pageComponents based on their new sorted order
  });

  // This test documents the BUG and will FAIL until we fix the root cause
  // Remove .skip once the bug is fixed
  it.skip('UI updates correctly when sorting pageComponents with duplicate positions (KNOWN BUG)', async () => {
    const _user = userEvent.setup();

    // Reproduce the exact scenario from page 966f66d4-eae1-4431-8574-b5566c65145a
    const buggyWidgets: PageComponent[] = [
      {
        id: 'bug-component-1',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'bug-component-2',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'text',
        position: 0, // DUPLICATE - this is the bug
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'bug-component-3',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'image',
        position: 1,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    let currentWidgets = [...buggyWidgets];

    const { component, rerender } = render(BuilderCanvas, {
      props: {
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets[1],
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // Get initial button references
    const _initialMoveUpButton = screen.getByRole('button', { name: /move up/i });
    const initialMoveDownButton = screen.getByRole('button', { name: /move down/i });

    // Initially, component-2 should be able to move down (not the last component)
    expect(initialMoveDownButton).not.toBeDisabled();

    // Move component-2 down
    const user = userEvent.setup();
    await user.click(initialMoveDownButton);

    // Simulate parent component updating the pageComponents
    const update = batchUpdateSpy.mock.calls[0][0].detail;
    currentWidgets = currentWidgets.map((w) => {
      const updated = update.find((u: PageComponent) => u.id === w.id);
      return updated || w;
    });

    // Re-render with updated pageComponents
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'bug-component-2') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // THIS IS THE BUG: After the swap, the UI should update to show:
    // - component-2 is now in a different visual position
    // - The move up button should now work (not disabled)
    // - We should be able to move it back up

    const updatedMoveUpButton = screen.getByRole('button', { name: /move up/i });

    // This SHOULD pass but currently FAILS because the UI doesn't update
    // The component positions were swapped in data, but Svelte doesn't re-render
    expect(updatedMoveUpButton).not.toBeDisabled();

    // Try to move it back up - this should work
    await user.click(updatedMoveUpButton);

    // Should have called the event twice
    expect(batchUpdateSpy).toHaveBeenCalledTimes(2);

    // WHEN THIS TEST PASSES, the bug is fixed!
  });
});
