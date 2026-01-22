/**
 * Auto-scroll utility for drag and drop operations.
 *
 * When dragging near the edges of the viewport, this utility will
 * automatically scroll the page to reveal content outside the viewport.
 */

export interface AutoScrollConfig {
  /** Distance from edge (in px) to start scrolling. Default: 80 */
  edgeThreshold?: number;
  /** Maximum scroll speed (px per frame). Default: 15 */
  maxScrollSpeed?: number;
  /** Height of cancel zone at bottom (in px) to exclude from auto-scroll. Default: 0 */
  cancelZoneHeight?: number;
  /** Custom scroll container element. Defaults to window. */
  scrollContainer?: HTMLElement | null;
  /** Function to get the scroll container dynamically. Takes precedence over scrollContainer. */
  getScrollContainer?: () => HTMLElement | null;
}

export interface AutoScrollState {
  /** Whether auto-scroll is currently active */
  isActive: boolean;
  /** Animation frame ID for cleanup */
  animationFrameId: number | null;
  /** Current scroll direction: -1 (up), 0 (none), 1 (down) */
  direction: -1 | 0 | 1;
}

const defaultConfig: Required<Omit<AutoScrollConfig, 'getScrollContainer'>> & {
  getScrollContainer?: () => HTMLElement | null;
} = {
  edgeThreshold: 80,
  maxScrollSpeed: 15,
  cancelZoneHeight: 0,
  scrollContainer: null,
  getScrollContainer: undefined
};

/**
 * Creates an auto-scroll controller for drag operations.
 *
 * @param config - Configuration options
 * @returns Controller object with methods to update, start, and stop auto-scroll
 *
 * @example
 * ```ts
 * const autoScroll = createAutoScroll({ edgeThreshold: 60, cancelZoneHeight: 80 });
 *
 * // In touchmove handler:
 * autoScroll.update(touch.clientY);
 *
 * // When drag ends:
 * autoScroll.stop();
 * ```
 */
export function createAutoScroll(config: AutoScrollConfig = {}): {
  update: (clientY: number) => void;
  stop: () => void;
  getState: () => AutoScrollState;
} {
  const mergedConfig = { ...defaultConfig, ...config };
  const state: AutoScrollState = {
    isActive: false,
    animationFrameId: null,
    direction: 0
  };

  let currentClientY = 0;

  /**
   * Gets the scroll container, either from the getter function or static config.
   */
  function resolveScrollContainer(): HTMLElement | null {
    if (mergedConfig.getScrollContainer) {
      return mergedConfig.getScrollContainer();
    }
    return mergedConfig.scrollContainer ?? null;
  }

  /**
   * Calculates the scroll speed based on distance from the edge.
   * Returns a value between 0 and maxScrollSpeed.
   */
  function calculateScrollSpeed(distanceFromEdge: number): number {
    const { edgeThreshold, maxScrollSpeed } = mergedConfig;
    // Linear interpolation: closer to edge = faster scroll
    const ratio = Math.max(0, 1 - distanceFromEdge / edgeThreshold);
    return Math.round(ratio * maxScrollSpeed);
  }

  /**
   * Gets the scroll container's bounds for zone calculations.
   * When using a custom container, uses its bounding rect.
   * Otherwise uses the full window viewport.
   */
  function getContainerBounds(): { top: number; bottom: number; height: number; } {
    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    }
    // Use window viewport
    if (typeof window === 'undefined') {
      return { top: 0, bottom: 800, height: 800 };
    }
    return { top: 0, bottom: window.innerHeight, height: window.innerHeight };
  }

  /**
   * Gets the current viewport height, accounting for mobile browsers.
   */
  function getViewportHeight(): number {
    if (typeof window === 'undefined') return 800;
    return window.innerHeight;
  }

  /**
   * Gets the scroll position of the container.
   */
  function getScrollTop(): number {
    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      return scrollContainer.scrollTop;
    }
    if (typeof window === 'undefined') return 0;
    return window.scrollY || document.documentElement.scrollTop;
  }

  /**
   * Gets the maximum scroll position.
   */
  function getMaxScroll(): number {
    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      return scrollContainer.scrollHeight - scrollContainer.clientHeight;
    }
    if (typeof document === 'undefined') return 0;
    return document.documentElement.scrollHeight - getViewportHeight();
  }

  /**
   * Performs the actual scroll operation.
   */
  function performScroll(amount: number): void {
    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTop += amount;
    } else if (typeof window !== 'undefined') {
      window.scrollBy(0, amount);
    }
  }

  /**
   * Animation loop that performs the scroll.
   */
  function scrollLoop(): void {
    if (!state.isActive || state.direction === 0) {
      state.animationFrameId = null;
      return;
    }

    const { edgeThreshold } = mergedConfig;
    const bounds = getContainerBounds();

    // Calculate distance from edge based on direction
    // Using container bounds for proper zone calculations
    let distanceFromEdge: number;
    if (state.direction === -1) {
      // Scrolling up - measure from container's top edge
      distanceFromEdge = currentClientY - bounds.top;
    } else {
      // Scrolling down - measure from container's bottom edge
      distanceFromEdge = bounds.bottom - currentClientY;
    }

    // Only scroll if within edge threshold
    if (distanceFromEdge < edgeThreshold && distanceFromEdge >= 0) {
      const speed = calculateScrollSpeed(distanceFromEdge);
      if (speed > 0) {
        const scrollAmount = speed * state.direction;

        // Check bounds
        const currentScroll = getScrollTop();
        const maxScroll = getMaxScroll();

        console.log('[DEBUG] scrollLoop:', {
          direction: state.direction,
          distanceFromEdge,
          speed,
          scrollAmount,
          currentScroll,
          maxScroll,
          willScroll: state.direction === -1 ? currentScroll > 0 : currentScroll < maxScroll
        });

        if (state.direction === -1 && currentScroll > 0) {
          performScroll(scrollAmount);
        } else if (state.direction === 1 && currentScroll < maxScroll) {
          performScroll(scrollAmount);
        }
      }
    }

    // Continue the loop
    state.animationFrameId = requestAnimationFrame(scrollLoop);
  }

  /**
   * Updates the auto-scroll based on the current touch/mouse Y position.
   * clientY should be in viewport coordinates (e.g., from touch.clientY).
   */
  function update(clientY: number): void {
    currentClientY = clientY;
    const { edgeThreshold, cancelZoneHeight } = mergedConfig;
    const viewportHeight = getViewportHeight();

    const scrollContainer = resolveScrollContainer();
    console.log('[DEBUG] dragAutoScroll.update:', {
      clientY,
      viewportHeight,
      edgeThreshold,
      cancelZoneHeight,
      hasScrollContainer: !!scrollContainer,
      scrollContainerClass: scrollContainer?.className,
      maxScroll: scrollContainer ? scrollContainer.scrollHeight - scrollContainer.clientHeight : 'N/A'
    });

    // Check if touch is in the cancel zone (always relative to screen bottom)
    const isInCancelZone = clientY > viewportHeight - cancelZoneHeight;
    if (isInCancelZone) {
      console.log('[DEBUG] dragAutoScroll: in cancel zone, stopping');
      // In cancel zone - no scrolling
      if (state.isActive) {
        state.direction = 0;
        state.isActive = false;
        if (state.animationFrameId !== null) {
          cancelAnimationFrame(state.animationFrameId);
          state.animationFrameId = null;
        }
      }
      return;
    }

    // Get the scroll container's bounds for zone calculations
    const bounds = getContainerBounds();

    // Calculate effective scroll zones relative to container
    const topZoneEnd = bounds.top + edgeThreshold;
    const bottomZoneStart = bounds.bottom - edgeThreshold;

    console.log('[DEBUG] dragAutoScroll zones:', {
      bounds,
      topZoneEnd,
      bottomZoneStart,
      clientY,
      inTopZone: clientY < topZoneEnd && clientY >= bounds.top,
      inBottomZone: clientY > bottomZoneStart && clientY <= bounds.bottom
    });

    // Determine scroll direction
    let newDirection: -1 | 0 | 1 = 0;

    if (clientY < topZoneEnd && clientY >= bounds.top) {
      // Near top edge of container - scroll up
      newDirection = -1;
    } else if (clientY > bottomZoneStart && clientY <= bounds.bottom) {
      // Near bottom edge - scroll down
      newDirection = 1;
    }

    // Update state and start/stop animation as needed
    if (newDirection !== state.direction) {
      console.log('[DEBUG] dragAutoScroll: direction changed from', state.direction, 'to', newDirection);
      state.direction = newDirection;

      if (newDirection !== 0 && !state.isActive) {
        // Start scrolling
        console.log('[DEBUG] dragAutoScroll: starting scroll animation');
        state.isActive = true;
        state.animationFrameId = requestAnimationFrame(scrollLoop);
      } else if (newDirection === 0) {
        // Stop scrolling
        state.isActive = false;
        if (state.animationFrameId !== null) {
          cancelAnimationFrame(state.animationFrameId);
          state.animationFrameId = null;
        }
      }
    }
  }

  /**
   * Stops the auto-scroll and cleans up.
   */
  function stop(): void {
    state.isActive = false;
    state.direction = 0;
    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
  }

  /**
   * Returns the current state of the auto-scroll.
   */
  function getState(): AutoScrollState {
    return { ...state };
  }

  return { update, stop, getState };
}
