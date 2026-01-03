import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BuilderCanvas from '../BuilderCanvas.svelte';
import type { PageComponent } from '$lib/types/pages';

/**
 * ✅ REGRESSION TEST - BUG FIXED! ✅
 *
 * Bug (RESOLVED): pageComponents with duplicate positions now sort correctly
 *
 * Context:
 * - On page 966f66d4-eae1-4431-8574-b5566c65145a, up/down sort buttons were not working
 * - pageComponents had duplicate position values in database (e.g., two pageComponents at position 0)
 * - First sort operation would work, but subsequent sorts would fail
 *
 * Root Cause (IDENTIFIED):
 * - When swapping positions with duplicates (0 ↔ 0), nothing changed
 * - The parent component wasn't normalizing positions after each update
 * - Svelte couldn't detect changes because positions remained the same
 *
 * The Fix:
 * - AdvancedBuilder.handlebatchUpdateComponents() now normalizes positions after each update
 * - pageComponents are sorted by position (with stable sort for duplicates using ID)
 * - Positions are then reassigned sequentially (0, 1, 2, 3...)
 * - This ensures every sort operation makes progress, even with malformed data
 *
 * Expected Behavior (NOW WORKING):
 * ✅ Sort buttons work even with malformed (duplicate position) data
 * ✅ Each sort operation fixes duplicate positions automatically
 * ✅ UI updates immediately after each sort
 * ✅ Multiple consecutive sorts work correctly
 * ✅ Button states update properly (disabled when at top/bottom)
 *
 * These tests verify:
 * 1. Basic sorting with duplicate positions works
 * 2. Multiple consecutive sorts work correctly
 * 3. UI state updates properly after each operation
 * 4. Position normalization happens automatically
 */
describe('BuilderCanvas - Duplicate Positions Regression Tests', () => {
  it('UI updates correctly when sorting pageComponents with duplicate positions', async () => {
    const user = userEvent.setup();

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
        position: 0, // DUPLICATE POSITION - this is the bug trigger
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
        selectedComponent: currentWidgets[1], // Select bug-component-2
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // STEP 1: Verify initial state
    const initialMoveDownButton = screen.getByRole('button', { name: /move down/i });
    expect(initialMoveDownButton).not.toBeDisabled();

    // STEP 2: Move component-2 down (swap with component-3)
    await user.click(initialMoveDownButton);
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);

    // STEP 3: Simulate parent component applying the position swap
    const firstUpdate = batchUpdateSpy.mock.calls[0][0].detail;
    currentWidgets = currentWidgets.map((w) => {
      const updated = firstUpdate.find((u: PageComponent) => u.id === w.id);
      return updated || w;
    });

    // Verify data was actually updated
    // With the fix, all pageComponents get renumbered: [component-1: 0, component-3: 1, component-2: 2]
    const widget1AfterSwap = currentWidgets.find((w) => w.id === 'bug-component-1');
    const widget2AfterSwap = currentWidgets.find((w) => w.id === 'bug-component-2');
    const widget3AfterSwap = currentWidgets.find((w) => w.id === 'bug-component-3');
    expect(widget1AfterSwap?.position).toBe(0); // Stays at top
    expect(widget3AfterSwap?.position).toBe(1); // Moved up
    expect(widget2AfterSwap?.position).toBe(2); // Moved down

    // STEP 4: Re-render with updated pageComponents (simulating Svelte reactivity)
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'bug-component-2') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // STEP 5: THE BUG - UI should update but doesn't
    // After the swap, component-2 is now at position 1 (last position)
    // So the move down button should be disabled, but move up should work

    const updatedMoveUpButton = screen.getByRole('button', { name: /move up/i });
    const updatedMoveDownButton = screen.getByRole('button', { name: /move down/i });

    // THIS ASSERTION WILL FAIL with the current bug:
    // The UI doesn't update, so buttons stay in their old state
    expect(updatedMoveUpButton).not.toBeDisabled(); // Should be enabled now
    expect(updatedMoveDownButton).toBeDisabled(); // Should be disabled (at bottom)

    // STEP 6: Verify we can move it back up
    await user.click(updatedMoveUpButton);
    expect(batchUpdateSpy).toHaveBeenCalledTimes(2);

    // With the fix, all pageComponents are updated with renumbered positions
    const secondUpdate = batchUpdateSpy.mock.calls[1][0].detail;
    expect(secondUpdate).toHaveLength(3);
    // After moving component-2 back up: [component-1:0, component-2:1, component-3:2]
    expect(secondUpdate.find((w: PageComponent) => w.id === 'bug-component-1')?.position).toBe(0);
    expect(secondUpdate.find((w: PageComponent) => w.id === 'bug-component-2')?.position).toBe(1);
    expect(secondUpdate.find((w: PageComponent) => w.id === 'bug-component-3')?.position).toBe(2);
  });

  it('handles multiple consecutive sorts with duplicate positions', async () => {
    const user = userEvent.setup();

    // Multiple pageComponents with duplicate positions
    const multiDupeWidgets: PageComponent[] = [
      {
        id: 'w1',
        page_id: 'test',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'w2',
        page_id: 'test',
        type: 'text',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'w3',
        page_id: 'test',
        type: 'text',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'w4',
        page_id: 'test',
        type: 'image',
        position: 1,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    let currentWidgets = [...multiDupeWidgets];

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

    // Perform 2 consecutive move operations (w2 can only move down twice before reaching bottom)
    for (let i = 0; i < 2; i++) {
      const moveDownButton = screen.getByRole('button', { name: /move down/i });

      // With the fix, the button should work correctly on each iteration
      expect(moveDownButton).not.toBeDisabled();

      await user.click(moveDownButton);

      // Apply the update (simulating AdvancedBuilder's handlebatchUpdateComponents)
      // With our fix, the component already returns normalized positions
      const update = batchUpdateSpy.mock.calls[i][0].detail as PageComponent[];
      currentWidgets = update;

      // Re-render with the updated pageComponents
      await rerender({
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets.find((w) => w.id === 'w2') || null,
        hoveredComponent: null,
        currentBreakpoint: 'desktop'
      });

      // Verify w2 moved down by 1 position each time
      const w2 = currentWidgets.find((w) => w.id === 'w2');
      // Initial stable sorted order: [w1:0, w2:1, w3:2, w4:3]
      // After 1st move: [w1:0, w3:1, w2:2, w4:3]
      // After 2nd move: [w1:0, w3:1, w4:2, w2:3] - now at bottom
      expect(w2?.position).toBe(i + 2); // Moves from 1→2→3
    }

    // After 2 moves, w2 is at the bottom, so move down should be disabled
    const moveDownButtonAfter = screen.queryByRole('button', { name: /move down/i });
    expect(moveDownButtonAfter).toBeDisabled();

    // Verify 2 move operations were dispatched
    expect(batchUpdateSpy).toHaveBeenCalledTimes(2);

    // After moving down 2 times with 4 pageComponents, w2 should be at position 3 (bottom)
    const w2Final = currentWidgets.find((w) => w.id === 'w2');
    expect(w2Final?.position).toBe(3); // Should be at the bottom
  });

  // NEW TEST: First click does nothing, subsequent clicks work
  it('first sort click on malformed page should work immediately', async () => {
    const user = userEvent.setup();

    // Mock the EXACT scenario from page 966f66d4: duplicate positions
    const malformedPageComponents: PageComponent[] = [
      {
        id: 'component-first',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-second',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'text',
        position: 0, // DUPLICATE - same as first component
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'component-third',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'image',
        position: 1,
        config: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    let currentWidgets = [...malformedPageComponents];

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

    // THE BUG: First click - nothing happens (no visible change)
    const moveDownButton = screen.getByRole('button', { name: /move down/i });
    expect(moveDownButton).not.toBeDisabled(); // Button should be enabled

    // First click
    await user.click(moveDownButton);

    // Should have dispatched the event
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);

    // Apply the normalization like AdvancedBuilder does
    const firstUpdate = batchUpdateSpy.mock.calls[0][0].detail as PageComponent[];
    const updateMap = new Map(firstUpdate.map((u) => [u.id, u]));
    currentWidgets = currentWidgets.map((w) => updateMap.get(w.id) || w);

    // Normalize positions
    const sortedWidgets = [...currentWidgets].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.id.localeCompare(b.id);
    });
    currentWidgets = sortedWidgets.map((w, index) => ({
      ...w,
      position: index
    }));

    // Re-render with normalized positions
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'component-second') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // BUG: After first click, component-second should have moved from position 0 to position 2
    // But in reality, on the malformed page, the FIRST click doesn't do anything visible
    const widgetSecond = currentWidgets.find((w) => w.id === 'component-second');

    // THIS ASSERTION DOCUMENTS THE EXPECTED BEHAVIOR (should pass after fix)
    // After moving down once, component-second should be at position 2
    expect(widgetSecond?.position).toBe(2);

    // The button state should also update correctly after first click
    const moveDownAfterFirst = screen.getByRole('button', { name: /move down/i });
    expect(moveDownAfterFirst).toBeDisabled(); // Should be disabled (now at bottom)

    // WHEN THIS TEST PASSES, the "first click does nothing" bug is fixed!
  });

  it('first sort operation works immediately with duplicate positions (no delay)', async () => {
    const user = userEvent.setup();

    // EXACT reproduction: Mock page 966f66d4 with duplicate positions
    // This represents the ACTUAL malformed state from the database
    const malformedPageData: PageComponent[] = [
      {
        id: 'hero-section',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'hero',
        position: 0,
        config: { heading: 'Welcome' },
        created_at: Date.now() - 10000,
        updated_at: Date.now() - 10000
      },
      {
        id: 'text-block',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'text',
        position: 0, // DUPLICATE - Same as hero-section
        config: {},
        created_at: Date.now() - 5000,
        updated_at: Date.now() - 5000
      },
      {
        id: 'image-component',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'image',
        position: 1,
        config: { src: '/image.jpg' },
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    let currentWidgets = [...malformedPageData];

    const { component, rerender } = render(BuilderCanvas, {
      props: {
        pageComponents: currentWidgets,
        selectedComponent: currentWidgets[1], // Select text-block (middle component with duplicate position)
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // CRITICAL TEST: The FIRST click should work immediately
    // Currently this might fail because duplicate positions cause issues
    const initialMoveDownButton = screen.getByRole('button', { name: /move down/i });

    // Verify button is not disabled initially
    expect(initialMoveDownButton).not.toBeDisabled();

    // FIRST CLICK - This should work immediately, not require a second click
    await user.click(initialMoveDownButton);

    // The event MUST be dispatched on the first click
    expect(batchUpdateSpy).toHaveBeenCalledTimes(1);

    // Apply the update with normalization (simulating AdvancedBuilder)
    const firstUpdate = batchUpdateSpy.mock.calls[0][0].detail as PageComponent[];
    const updateMap = new Map(firstUpdate.map((u) => [u.id, u]));
    currentWidgets = currentWidgets.map((w) => updateMap.get(w.id) || w);

    // Normalize positions
    const sortedWidgets = [...currentWidgets].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.id.localeCompare(b.id);
    });
    currentWidgets = sortedWidgets.map((w, index) => ({
      ...w,
      position: index
    }));

    // Re-render with updated state
    await rerender({
      pageComponents: currentWidgets,
      selectedComponent: currentWidgets.find((w) => w.id === 'text-block') || null,
      hoveredComponent: null,
      currentBreakpoint: 'desktop'
    });

    // VERIFY: After first click, the component should have moved
    const textBlock = currentWidgets.find((w) => w.id === 'text-block');
    expect(textBlock?.position).toBeGreaterThan(0); // Should have moved from position 0

    // VERIFY: Visual order should reflect the change
    const sortedByPosition = [...currentWidgets].sort((a, b) => a.position - b.position);
    const textBlockIndex = sortedByPosition.findIndex((w) => w.id === 'text-block');
    expect(textBlockIndex).toBeGreaterThan(0); // Should not be first anymore

    // VERIFY: Button states should update correctly after first click
    const moveUpButton = screen.getByRole('button', { name: /move up/i });
    expect(moveUpButton).not.toBeDisabled(); // Should be able to move back up

    // IF THIS TEST FAILS: The "first click does nothing" bug is present
    // The component didn't move on the first click, requiring a second click
  });

  it('comprehensive integration: full sorting workflow with malformed data', async () => {
    const user = userEvent.setup();

    // Complete reproduction of page 966f66d4 state
    const PageComponents: PageComponent[] = [
      {
        id: 'w1-hero',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'hero',
        position: 0,
        config: {},
        created_at: Date.now() - 30000,
        updated_at: Date.now() - 30000
      },
      {
        id: 'w2-text',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'text',
        position: 0, // Duplicate
        config: {},
        created_at: Date.now() - 20000,
        updated_at: Date.now() - 20000
      },
      {
        id: 'w3-image',
        page_id: '966f66d4-eae1-4431-8574-b5566c65145a',
        type: 'image',
        position: 1,
        config: {},
        created_at: Date.now() - 10000,
        updated_at: Date.now() - 10000
      }
    ];

    let pageComponents = [...PageComponents];

    const { component, rerender } = render(BuilderCanvas, {
      props: {
        pageComponents,
        selectedComponent: pageComponents[0],
        hoveredComponent: null,
        currentBreakpoint: 'desktop',
        colorTheme: 'vibrant',
        userCurrentThemeId: 'vibrant'
      }
    });

    const batchUpdateSpy = vi.fn();
    component.$on('batchUpdateComponents', batchUpdateSpy);

    // TEST SEQUENCE: Move first component down multiple times
    for (let i = 0; i < 2; i++) {
      const moveDownButton = screen.getByRole('button', { name: /move down/i });

      // Each click should work immediately
      await user.click(moveDownButton);

      expect(batchUpdateSpy).toHaveBeenCalledTimes(i + 1);

      // Apply update with normalization
      const update = batchUpdateSpy.mock.calls[i][0].detail as PageComponent[];
      const updateMap = new Map(update.map((u) => [u.id, u]));
      pageComponents = pageComponents.map((w) => updateMap.get(w.id) || w);

      // Normalize
      const sorted = [...pageComponents].sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.id.localeCompare(b.id);
      });
      pageComponents = sorted.map((w, idx) => ({ ...w, position: idx }));

      // Re-render
      await rerender({
        pageComponents,
        selectedComponent: pageComponents.find((w) => w.id === 'w1-hero') || null,
        hoveredComponent: null,
        currentBreakpoint: 'desktop'
      });

      // Verify each operation actually moved the component
      const w1 = pageComponents.find((w) => w.id === 'w1-hero');
      expect(w1?.position).toBe(i + 1); // Should be at position 1 after first move, 2 after second
    }

    // After moving down twice, should be at bottom
    const finalMoveDownButton = screen.getByRole('button', { name: /move down/i });
    expect(finalMoveDownButton).toBeDisabled();

    // Final positions should be normalized and correct
    expect(pageComponents.length).toBe(3);
    expect(pageComponents.find((w) => w.id === 'w1-hero')?.position).toBe(2); // At bottom
    expect(pageComponents.find((w) => w.id === 'w2-text')?.position).toBe(0); // At top
    expect(pageComponents.find((w) => w.id === 'w3-image')?.position).toBe(1); // In middle
  });
});
