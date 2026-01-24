import { writable } from 'svelte/store';

/**
 * Options for configuring a prompt dialog
 */
export interface PromptOptions {
  /** The message to display in the prompt */
  message: string;
  /** Default value pre-filled in the input */
  defaultValue?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Title of the prompt dialog */
  title?: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the input is required (non-empty) */
  required?: boolean;
  /** Maximum length of the input */
  maxLength?: number;
  /** Minimum length of the input */
  minLength?: number;
  /** Regex pattern the input must match */
  pattern?: string;
  /** Type of input (text, number, email, etc.) */
  inputType?: 'text' | 'number' | 'email' | 'url' | 'password' | 'tel';
}

/**
 * Internal state of the prompt dialog
 */
export interface PromptState {
  message: string;
  defaultValue: string;
  placeholder: string;
  title: string;
  confirmText: string;
  cancelText: string;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  inputType: 'text' | 'number' | 'email' | 'url' | 'password' | 'tel';
  resolve: (value: string | null) => void;
}

const store = writable<PromptState | null>(null);

let currentResolve: ((value: string | null) => void) | null = null;

/**
 * Prompt store - a promise-based replacement for native prompt()
 *
 * @example
 * // Basic usage
 * const name = await promptStore.show('Enter your name');
 * if (name !== null) {
 *   console.log(`Hello, ${name}!`);
 * }
 *
 * @example
 * // With options
 * const pageName = await promptStore.show({
 *   message: 'Enter page name',
 *   title: 'Create New Page',
 *   defaultValue: 'Untitled Page',
 *   placeholder: 'e.g., About Us',
 *   confirmText: 'Create',
 *   cancelText: 'Cancel',
 *   required: true
 * });
 */
export const promptStore = {
  subscribe: store.subscribe,

  /**
   * Show a prompt dialog and return a promise that resolves with the entered value
   * @param optionsOrMessage - Either a string message or full options object
   * @returns Promise that resolves with the entered string, or null if cancelled
   */
  show: (optionsOrMessage: string | PromptOptions): Promise<string | null> => {
    // Cancel any existing prompt
    if (currentResolve) {
      currentResolve(null);
      currentResolve = null;
    }

    const options: PromptOptions =
      typeof optionsOrMessage === 'string' ? { message: optionsOrMessage } : optionsOrMessage;

    return new Promise((resolve) => {
      currentResolve = resolve;

      const state: PromptState = {
        message: options.message,
        defaultValue: options.defaultValue ?? '',
        placeholder: options.placeholder ?? '',
        title: options.title ?? 'Input Required',
        confirmText: options.confirmText ?? 'OK',
        cancelText: options.cancelText ?? 'Cancel',
        required: options.required ?? false,
        maxLength: options.maxLength,
        minLength: options.minLength,
        pattern: options.pattern,
        inputType: options.inputType ?? 'text',
        resolve
      };

      store.set(state);
    });
  },

  /**
   * Confirm the prompt with the given value
   * @param value - The value entered by the user
   */
  confirm: (value: string): void => {
    if (currentResolve) {
      const trimmedValue = value.trim();
      currentResolve(trimmedValue);
      currentResolve = null;
    }
    store.set(null);
  },

  /**
   * Cancel the current prompt
   */
  cancel: (): void => {
    if (currentResolve) {
      currentResolve(null);
      currentResolve = null;
    }
    store.set(null);
  }
};
