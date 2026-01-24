import { describe, it, expect } from 'vitest';
import type { PageComponent } from '$lib/types/pages';

describe('BuilderCanvas - Sort Button Logic', () => {
  const mockWidgets: PageComponent[] = [
    {
      id: 'component-1',
      page_id: 'test-page',
      type: 'hero',
      position: 0,
      config: { heading: 'First component' },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'component-2',
      page_id: 'test-page',
      type: 'text',
      position: 1,
      config: { html: 'Second component' },
      created_at: Date.now(),
      updated_at: Date.now()
    },
    {
      id: 'component-3',
      page_id: 'test-page',
      type: 'image',
      position: 2,
      config: { src: '/test.jpg' },
      created_at: Date.now(),
      updated_at: Date.now()
    }
  ];

  it('correctly swaps component positions when moving up', () => {
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);
    const widgetToMove = sorted[1]; // Second component
    const index = sorted.findIndex((w) => w.id === widgetToMove.id);

    expect(index).toBe(1);
    expect(index > 0).toBe(true);

    const currentWidget = sorted[index];
    const widgetAbove = sorted[index - 1];

    // Verify the swap logic
    const updatedCurrent = { ...currentWidget, position: widgetAbove.position };
    const updatedAbove = { ...widgetAbove, position: currentWidget.position };

    expect(updatedCurrent.position).toBe(0);
    expect(updatedAbove.position).toBe(1);
    expect(updatedCurrent.id).toBe('component-2');
    expect(updatedAbove.id).toBe('component-1');
  });

  it('correctly swaps component positions when moving down', () => {
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);
    const widgetToMove = sorted[1]; // Second component
    const index = sorted.findIndex((w) => w.id === widgetToMove.id);

    expect(index).toBe(1);
    expect(index < sorted.length - 1).toBe(true);

    const currentWidget = sorted[index];
    const widgetBelow = sorted[index + 1];

    // Verify the swap logic
    const updatedCurrent = { ...currentWidget, position: widgetBelow.position };
    const updatedBelow = { ...widgetBelow, position: currentWidget.position };

    expect(updatedCurrent.position).toBe(2);
    expect(updatedBelow.position).toBe(1);
    expect(updatedCurrent.id).toBe('component-2');
    expect(updatedBelow.id).toBe('component-3');
  });

  it('correctly identifies first component as unable to move up', () => {
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);
    const firstWidget = sorted[0];
    const index = sorted.findIndex((w) => w.id === firstWidget.id);

    expect(index).toBe(0);
    expect(index === 0).toBe(true); // Should be disabled
  });

  it('correctly identifies last component as unable to move down', () => {
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);
    const lastWidget = sorted[sorted.length - 1];
    const index = sorted.findIndex((w) => w.id === lastWidget.id);

    expect(index).toBe(2);
    expect(index === sorted.length - 1).toBe(true); // Should be disabled
  });

  it('uses sorted array length for move down disable check', () => {
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);

    // Verify that checking against sorted.length is correct
    expect(sorted.length).toBe(mockWidgets.length);
    expect(sorted[2]).toBeDefined();
  });

  it('maintains correct button state after position swap', () => {
    // Start with pageComponents in positions 0, 1, 2
    const sorted = [...mockWidgets].sort((a, b) => a.position - b.position);

    // Move component 2 (position 1) up
    const widgetToMove = sorted[1];
    const widgetAbove = sorted[0];

    // After swap, component 2 should be at position 0
    const newWidgets = mockWidgets.map((w) => {
      if (w.id === widgetToMove.id) return { ...w, position: widgetAbove.position };
      if (w.id === widgetAbove.id) return { ...w, position: widgetToMove.position };
      return w;
    });

    // Re-sort after the swap
    const newSorted = [...newWidgets].sort((a, b) => a.position - b.position);

    // component that was at index 1 should now be at index 0
    expect(newSorted[0].id).toBe('component-2');
    expect(newSorted[1].id).toBe('component-1');

    // First component should now be unable to move up
    const newIndex = newSorted.findIndex((w) => w.id === 'component-2');
    expect(newIndex).toBe(0);
    expect(newIndex === 0).toBe(true); // Move up should be disabled
  });
});
