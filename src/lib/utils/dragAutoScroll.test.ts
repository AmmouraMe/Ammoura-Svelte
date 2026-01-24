import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAutoScroll } from './dragAutoScroll';

describe('createAutoScroll', () => {
  let originalScrollY: number;
  let originalInnerHeight: number;
  let mockScrollBy: ReturnType<typeof vi.fn>;
  let mockRequestAnimationFrame: ReturnType<typeof vi.fn>;
  let mockCancelAnimationFrame: ReturnType<typeof vi.fn>;
  let animationFrameCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    // Store original values
    originalScrollY = window.scrollY;
    originalInnerHeight = window.innerHeight;

    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      value: 100,
      writable: true,
      configurable: true
    });

    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      writable: true,
      configurable: true
    });

    // Mock document.documentElement.scrollHeight
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      writable: true,
      configurable: true
    });

    // Mock scrollBy
    mockScrollBy = vi.fn();
    window.scrollBy = mockScrollBy;

    // Mock requestAnimationFrame and capture callbacks
    let frameId = 1;
    mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      animationFrameCallback = callback;
      return frameId++;
    });
    window.requestAnimationFrame = mockRequestAnimationFrame;

    // Mock cancelAnimationFrame
    mockCancelAnimationFrame = vi.fn();
    window.cancelAnimationFrame = mockCancelAnimationFrame;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'scrollY', {
      value: originalScrollY,
      writable: true,
      configurable: true
    });
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true,
      configurable: true
    });
    animationFrameCallback = null;
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('creates auto-scroll controller with default config', () => {
      const autoScroll = createAutoScroll();
      const state = autoScroll.getState();

      expect(state.isActive).toBe(false);
      expect(state.direction).toBe(0);
      expect(state.animationFrameId).toBe(null);
    });

    it('creates auto-scroll controller with custom config', () => {
      const autoScroll = createAutoScroll({
        edgeThreshold: 100,
        maxScrollSpeed: 20,
        cancelZoneHeight: 60
      });

      expect(autoScroll.getState().isActive).toBe(false);
    });
  });

  describe('update', () => {
    it('starts scrolling up when near top edge', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Touch near top (within 80px threshold)
      autoScroll.update(40);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(true);
      expect(state.direction).toBe(-1);
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('starts scrolling down when near bottom edge', () => {
      // innerHeight is 800, so bottom threshold starts at 800 - 80 = 720
      const autoScroll = createAutoScroll({ edgeThreshold: 80, cancelZoneHeight: 0 });

      // Touch near bottom (within 80px threshold from bottom)
      autoScroll.update(760);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(true);
      expect(state.direction).toBe(1);
    });

    it('does not scroll when in middle of viewport', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Touch in the middle
      autoScroll.update(400);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(false);
      expect(state.direction).toBe(0);
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('respects cancel zone height when determining bottom scroll zone', () => {
      // innerHeight is 800, cancelZoneHeight is 80, edgeThreshold is 80
      // Cancel zone: 720 to 800 (bottom 80px)
      // Bottom scroll zone: 720 - 80 = 640 to 720 (above cancel zone)
      // But we can't enter the zone if cancel zone is blocking it!
      // With the new logic: cancel zone is checked first, then container bounds
      // For window scrolling without cancel zone overlap:
      const autoScroll = createAutoScroll({ edgeThreshold: 80, cancelZoneHeight: 60 });

      // Touch at 750 is in bottom edge zone (800 - 80 = 720 to 800)
      // But 750 > 740 (800 - 60) means it's in cancel zone, so no scroll
      // Touch at 730 should be in scroll zone (720 to 740)
      autoScroll.update(730);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(true);
      expect(state.direction).toBe(1);
    });

    it('does not scroll when in cancel zone', () => {
      // cancelZoneHeight is 80, so cancel zone is 800 - 80 = 720 to 800
      const autoScroll = createAutoScroll({ edgeThreshold: 80, cancelZoneHeight: 80 });

      // Touch in cancel zone (beyond 720)
      autoScroll.update(750);

      const state = autoScroll.getState();
      // Should not start scrolling down when in cancel zone
      expect(state.direction).toBe(0);
    });

    it('stops scrolling when moving away from edge', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Start scrolling up
      autoScroll.update(40);
      expect(autoScroll.getState().isActive).toBe(true);

      // Move to middle
      autoScroll.update(400);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(false);
      expect(state.direction).toBe(0);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('changes direction when moving from top to bottom edge', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80, cancelZoneHeight: 0 });

      // Start scrolling up
      autoScroll.update(40);
      expect(autoScroll.getState().direction).toBe(-1);

      // Move to bottom edge
      autoScroll.update(760);

      const state = autoScroll.getState();
      expect(state.isActive).toBe(true);
      expect(state.direction).toBe(1);
    });
  });

  describe('stop', () => {
    it('stops scrolling and cleans up animation frame', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Start scrolling
      autoScroll.update(40);
      expect(autoScroll.getState().isActive).toBe(true);

      // Stop
      autoScroll.stop();

      const state = autoScroll.getState();
      expect(state.isActive).toBe(false);
      expect(state.direction).toBe(0);
      expect(state.animationFrameId).toBe(null);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('can be called safely when not active', () => {
      const autoScroll = createAutoScroll();

      // Stop without starting
      expect(() => autoScroll.stop()).not.toThrow();

      const state = autoScroll.getState();
      expect(state.isActive).toBe(false);
    });
  });

  describe('scroll loop', () => {
    it('performs scroll in scroll loop callback', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80, maxScrollSpeed: 15 });

      // Start scrolling up
      autoScroll.update(20);

      // Verify animation frame was requested
      expect(mockRequestAnimationFrame).toHaveBeenCalled();

      // Simulate animation frame callback
      if (animationFrameCallback) {
        animationFrameCallback(0);
      }

      // Verify scroll was called with negative value (scroll up)
      expect(mockScrollBy).toHaveBeenCalledWith(0, expect.any(Number));
      const scrollAmount = mockScrollBy.mock.calls[0][1];
      expect(scrollAmount).toBeLessThan(0); // Negative = scroll up
    });

    it('scrolls faster when closer to edge', () => {
      // Test scroll speed near edge (20px from top)
      const autoScroll1 = createAutoScroll({ edgeThreshold: 80, maxScrollSpeed: 15 });
      autoScroll1.update(20);
      const callback1 = animationFrameCallback;
      if (callback1) callback1(0);
      const scrollAmount1 = Math.abs(mockScrollBy.mock.calls[0][1]);
      autoScroll1.stop();

      // Reset mocks for second test
      mockScrollBy.mockClear();
      mockRequestAnimationFrame.mockClear();

      // Test scroll speed farther from edge (60px from top)
      const autoScroll2 = createAutoScroll({ edgeThreshold: 80, maxScrollSpeed: 15 });
      autoScroll2.update(60);
      const callback2 = animationFrameCallback;
      if (callback2) callback2(0);
      const scrollAmount2 = Math.abs(mockScrollBy.mock.calls[0][1]);
      autoScroll2.stop();

      // Closer to edge should scroll faster
      expect(scrollAmount1).toBeGreaterThan(scrollAmount2);
    });

    it('continues animation loop while active', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Start scrolling
      autoScroll.update(20);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);

      // Simulate first animation frame
      if (animationFrameCallback) animationFrameCallback(0);

      // Should request another frame
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('stops animation loop when direction becomes 0', () => {
      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Start scrolling
      autoScroll.update(20);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);

      // Move to middle (stop scrolling)
      autoScroll.update(400);

      // Clear the callback since we stopped
      mockRequestAnimationFrame.mockClear();

      // The loop should not continue since direction is 0
      if (animationFrameCallback) animationFrameCallback(0);

      // Should not request another frame when stopped
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('scroll bounds', () => {
    it('does not scroll up when already at top', () => {
      // Set scroll position to 0
      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true
      });

      const autoScroll = createAutoScroll({ edgeThreshold: 80 });

      // Try to scroll up
      autoScroll.update(20);
      if (animationFrameCallback) animationFrameCallback(0);

      // scrollBy should not be called because we're at top
      expect(mockScrollBy).not.toHaveBeenCalled();
    });

    it('does not scroll down when already at bottom', () => {
      // Set scroll position to max (scrollHeight - innerHeight = 2000 - 800 = 1200)
      Object.defineProperty(window, 'scrollY', {
        value: 1200,
        writable: true,
        configurable: true
      });

      const autoScroll = createAutoScroll({ edgeThreshold: 80, cancelZoneHeight: 0 });

      // Try to scroll down
      autoScroll.update(760);
      if (animationFrameCallback) animationFrameCallback(0);

      // scrollBy should not be called because we're at bottom
      expect(mockScrollBy).not.toHaveBeenCalled();
    });
  });

  describe('custom scroll container', () => {
    it('uses custom scroll container when provided', () => {
      const container = document.createElement('div');
      Object.defineProperty(container, 'scrollTop', {
        value: 100,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'scrollHeight', {
        value: 2000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'clientHeight', {
        value: 500,
        writable: true,
        configurable: true
      });

      const autoScroll = createAutoScroll({
        edgeThreshold: 80,
        scrollContainer: container
      });

      // Start scrolling up
      autoScroll.update(20);

      expect(autoScroll.getState().isActive).toBe(true);

      // Simulate animation frame - should modify container scrollTop
      if (animationFrameCallback) animationFrameCallback(0);

      // window.scrollBy should NOT be called since we have a custom container
      // (The container's scrollTop should be modified instead)
      // Note: In this test we can't easily verify scrollTop modification
      // because of how the mock is set up, but we can verify the logic is triggered
      expect(autoScroll.getState().direction).toBe(-1);
    });

    it('uses getScrollContainer function when provided', () => {
      const container = document.createElement('div');
      let scrollTopValue = 100;
      Object.defineProperty(container, 'scrollTop', {
        get: () => scrollTopValue,
        set: (v) => {
          scrollTopValue = v;
        },
        configurable: true
      });
      Object.defineProperty(container, 'scrollHeight', {
        value: 2000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'clientHeight', {
        value: 500,
        writable: true,
        configurable: true
      });

      const getScrollContainer = vi.fn(() => container);
      const autoScroll = createAutoScroll({
        edgeThreshold: 80,
        getScrollContainer
      });

      // Start scrolling up
      autoScroll.update(20);

      expect(autoScroll.getState().isActive).toBe(true);

      // Simulate animation frame
      if (animationFrameCallback) animationFrameCallback(0);

      // getScrollContainer should be called to resolve the container
      expect(getScrollContainer).toHaveBeenCalled();

      // window.scrollBy should NOT be called since we have a custom container
      expect(mockScrollBy).not.toHaveBeenCalled();
    });

    it('getScrollContainer takes precedence over scrollContainer', () => {
      const staticContainer = document.createElement('div');
      const dynamicContainer = document.createElement('div');

      let dynamicScrollTop = 100;
      Object.defineProperty(dynamicContainer, 'scrollTop', {
        get: () => dynamicScrollTop,
        set: (v) => {
          dynamicScrollTop = v;
        },
        configurable: true
      });
      Object.defineProperty(dynamicContainer, 'scrollHeight', {
        value: 2000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(dynamicContainer, 'clientHeight', {
        value: 500,
        writable: true,
        configurable: true
      });

      const getScrollContainer = vi.fn(() => dynamicContainer);
      const autoScroll = createAutoScroll({
        edgeThreshold: 80,
        scrollContainer: staticContainer,
        getScrollContainer
      });

      // Start scrolling up
      autoScroll.update(20);

      // Simulate animation frame
      if (animationFrameCallback) animationFrameCallback(0);

      // getScrollContainer should be called, not the static container
      expect(getScrollContainer).toHaveBeenCalled();
    });

    it('uses container bounds for scroll zone calculations', () => {
      // Create a container positioned in the middle of the viewport
      const container = document.createElement('div');
      container.getBoundingClientRect = vi.fn(() => ({
        top: 100, // Container starts at y=100
        bottom: 500, // Container ends at y=500
        height: 400,
        left: 0,
        right: 300,
        width: 300,
        x: 0,
        y: 100,
        toJSON: () => ({})
      }));

      Object.defineProperty(container, 'scrollTop', {
        value: 100,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'scrollHeight', {
        value: 2000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'clientHeight', {
        value: 400,
        writable: true,
        configurable: true
      });

      const autoScroll = createAutoScroll({
        edgeThreshold: 60,
        scrollContainer: container
      });

      // Touch at y=450 is near bottom of container (bottom is 500, threshold is 60)
      // So 440-500 is the bottom scroll zone
      autoScroll.update(450);

      expect(autoScroll.getState().isActive).toBe(true);
      expect(autoScroll.getState().direction).toBe(1); // Scrolling down

      autoScroll.stop();

      // Touch at y=300 is in middle of container (100-500), not in any scroll zone
      autoScroll.update(300);

      expect(autoScroll.getState().isActive).toBe(false);
      expect(autoScroll.getState().direction).toBe(0);

      // Touch at y=130 is near top of container (top is 100, threshold is 60)
      // So 100-160 is the top scroll zone
      autoScroll.update(130);

      expect(autoScroll.getState().isActive).toBe(true);
      expect(autoScroll.getState().direction).toBe(-1); // Scrolling up
    });

    it('does not activate when getScrollContainer returns null', () => {
      // This tests the case where a custom getScrollContainer is provided
      // but it returns null (e.g., element not rendered yet)
      const getScrollContainer = vi.fn(() => null);

      const autoScroll = createAutoScroll({
        edgeThreshold: 80,
        getScrollContainer
      });

      // Touch near edge - should normally trigger scrolling
      autoScroll.update(40);

      // But since container is null, auto-scroll should not activate
      expect(autoScroll.getState().isActive).toBe(false);
      expect(autoScroll.getState().direction).toBe(0);
      expect(getScrollContainer).toHaveBeenCalled();
    });

    it('stops scrolling when getScrollContainer starts returning null', () => {
      // Start with a valid container
      const container = document.createElement('div');
      container.getBoundingClientRect = vi.fn(() => ({
        top: 0,
        bottom: 400,
        height: 400,
        left: 0,
        right: 300,
        width: 300,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }));
      Object.defineProperty(container, 'scrollTop', {
        value: 100,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'scrollHeight', {
        value: 2000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(container, 'clientHeight', {
        value: 400,
        writable: true,
        configurable: true
      });

      // getScrollContainer will initially return container, then null
      let returnNull = false;
      const getScrollContainer = vi.fn(() => (returnNull ? null : container));

      const autoScroll = createAutoScroll({
        edgeThreshold: 80,
        getScrollContainer
      });

      // Touch near top - should start scrolling
      autoScroll.update(40);
      expect(autoScroll.getState().isActive).toBe(true);

      // Now make getScrollContainer return null
      returnNull = true;

      // Update again - should stop scrolling
      autoScroll.update(40);
      expect(autoScroll.getState().isActive).toBe(false);
      expect(autoScroll.getState().direction).toBe(0);
    });
  });

  describe('getState', () => {
    it('returns a copy of the state', () => {
      const autoScroll = createAutoScroll();

      const state1 = autoScroll.getState();
      autoScroll.update(20);
      const state2 = autoScroll.getState();

      // States should be different objects
      expect(state1).not.toBe(state2);
      expect(state1.isActive).toBe(false);
      expect(state2.isActive).toBe(true);
    });
  });
});
