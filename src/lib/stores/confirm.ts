import { writable } from 'svelte/store';

/**
 * Options for the confirm dialog
 */
export interface ConfirmOptions {
  /** Dialog title (default: 'Confirm') */
  title?: string;
  /** Text for the confirm button (default: 'OK') */
  confirmText?: string;
  /** Text for the cancel button (default: 'Cancel') */
  cancelText?: string;
  /** Visual variant for styling (default: 'default') */
  variant?: 'default' | 'danger' | 'warning';
}

/**
 * Internal state for the confirm dialog
 */
export interface ConfirmState {
  message: string;
  title: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'danger' | 'warning';
}

// Internal resolver for the promise
let resolvePromise: ((value: boolean) => void) | null = null;

/**
 * Create the confirm store
 */
function createConfirmStore() {
  const { subscribe, set } = writable<ConfirmState | null>(null);

  return {
    subscribe,

    /**
     * Show a confirmation dialog
     * @param message - The confirmation message to display
     * @param options - Optional configuration for the dialog
     * @returns Promise that resolves to true if confirmed, false if cancelled
     *
     * @example
     * ```typescript
     * import { confirmStore } from '$lib/stores/confirm';
     *
     * const confirmed = await confirmStore.show('Delete this item?');
     * if (confirmed) {
     *   // User confirmed
     * }
     *
     * // With options
     * const confirmed = await confirmStore.show('Delete permanently?', {
     *   title: 'Confirm Deletion',
     *   confirmText: 'Delete',
     *   cancelText: 'Keep',
     *   variant: 'danger'
     * });
     * ```
     */
    show(message: string, options?: ConfirmOptions): Promise<boolean> {
      // If there's an existing dialog, cancel it
      if (resolvePromise) {
        resolvePromise(false);
      }

      const state: ConfirmState = {
        message,
        title: options?.title ?? 'Confirm',
        confirmText: options?.confirmText ?? 'OK',
        cancelText: options?.cancelText ?? 'Cancel',
        variant: options?.variant ?? 'default'
      };

      set(state);

      return new Promise((resolve) => {
        resolvePromise = resolve;
      });
    },

    /**
     * Confirm the dialog (resolve with true)
     */
    confirm(): void {
      if (resolvePromise) {
        resolvePromise(true);
        resolvePromise = null;
      }
      set(null);
    },

    /**
     * Cancel the dialog (resolve with false)
     */
    cancel(): void {
      if (resolvePromise) {
        resolvePromise(false);
        resolvePromise = null;
      }
      set(null);
    }
  };
}

/**
 * Confirm store - a promise-based replacement for native confirm()
 *
 * @example
 * ```typescript
 * import { confirmStore } from '$lib/stores/confirm';
 *
 * // Basic usage
 * const confirmed = await confirmStore.show('Are you sure?');
 * if (confirmed) {
 *   // proceed with action
 * }
 *
 * // Danger confirmation
 * const deleteConfirmed = await confirmStore.show('Delete this item?', {
 *   title: 'Confirm Deletion',
 *   confirmText: 'Delete',
 *   cancelText: 'Cancel',
 *   variant: 'danger'
 * });
 * ```
 */
export const confirmStore = createConfirmStore();
