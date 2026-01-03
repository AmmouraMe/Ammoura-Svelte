import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { promptStore, type PromptOptions } from './prompt';

describe('promptStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    promptStore.cancel();
  });

  describe('initial state', () => {
    it('should have null state initially', () => {
      const state = get(promptStore);
      expect(state).toBeNull();
    });
  });

  describe('show', () => {
    it('should show prompt with message', async () => {
      // Start showing the prompt (don't await, as it waits for resolution)
      const promptPromise = promptStore.show('Enter your name');

      const state = get(promptStore);
      expect(state).not.toBeNull();
      expect(state?.message).toBe('Enter your name');
      expect(state?.defaultValue).toBe('');
      expect(state?.placeholder).toBe('');
      expect(state?.title).toBe('Input Required');

      // Cancel to resolve the promise
      promptStore.cancel();
      const result = await promptPromise;
      expect(result).toBeNull();
    });

    it('should show prompt with all options', async () => {
      const options: PromptOptions = {
        message: 'Enter page name',
        defaultValue: 'Untitled Page',
        placeholder: 'e.g., About Us',
        title: 'New Page',
        confirmText: 'Create',
        cancelText: 'Abort'
      };

      const promptPromise = promptStore.show(options);

      const state = get(promptStore);
      expect(state).not.toBeNull();
      expect(state?.message).toBe('Enter page name');
      expect(state?.defaultValue).toBe('Untitled Page');
      expect(state?.placeholder).toBe('e.g., About Us');
      expect(state?.title).toBe('New Page');
      expect(state?.confirmText).toBe('Create');
      expect(state?.cancelText).toBe('Abort');

      promptStore.cancel();
      await promptPromise;
    });

    it('should use defaults for missing options', async () => {
      const promptPromise = promptStore.show({ message: 'Test message' });

      const state = get(promptStore);
      expect(state?.confirmText).toBe('OK');
      expect(state?.cancelText).toBe('Cancel');
      expect(state?.title).toBe('Input Required');
      expect(state?.defaultValue).toBe('');
      expect(state?.placeholder).toBe('');

      promptStore.cancel();
      await promptPromise;
    });
  });

  describe('confirm', () => {
    it('should resolve with the entered value', async () => {
      const promptPromise = promptStore.show('Enter name');

      // Simulate user entering a value
      promptStore.confirm('John Doe');

      const result = await promptPromise;
      expect(result).toBe('John Doe');
    });

    it('should close the prompt after confirmation', async () => {
      const promptPromise = promptStore.show('Enter name');
      promptStore.confirm('Test');

      await promptPromise;
      const state = get(promptStore);
      expect(state).toBeNull();
    });

    it('should resolve with empty string if confirmed with empty value', async () => {
      const promptPromise = promptStore.show('Enter name');
      promptStore.confirm('');

      const result = await promptPromise;
      expect(result).toBe('');
    });

    it('should trim whitespace from the value', async () => {
      const promptPromise = promptStore.show('Enter name');
      promptStore.confirm('  John Doe  ');

      const result = await promptPromise;
      expect(result).toBe('John Doe');
    });
  });

  describe('cancel', () => {
    it('should resolve with null when cancelled', async () => {
      const promptPromise = promptStore.show('Enter name');
      promptStore.cancel();

      const result = await promptPromise;
      expect(result).toBeNull();
    });

    it('should close the prompt after cancellation', async () => {
      const promptPromise = promptStore.show('Enter name');
      promptStore.cancel();

      await promptPromise;
      const state = get(promptStore);
      expect(state).toBeNull();
    });

    it('should do nothing if no prompt is open', () => {
      // Should not throw
      expect(() => promptStore.cancel()).not.toThrow();
    });
  });

  describe('multiple prompts', () => {
    it('should handle sequential prompts', async () => {
      // First prompt
      const firstPromise = promptStore.show('First');
      promptStore.confirm('First Answer');
      const firstResult = await firstPromise;
      expect(firstResult).toBe('First Answer');

      // Second prompt
      const secondPromise = promptStore.show('Second');
      promptStore.confirm('Second Answer');
      const secondResult = await secondPromise;
      expect(secondResult).toBe('Second Answer');
    });

    it('should cancel previous prompt when new one opens', async () => {
      const firstPromise = promptStore.show('First');

      // Opening new prompt should cancel the first
      const secondPromise = promptStore.show('Second');

      const firstResult = await firstPromise;
      expect(firstResult).toBeNull();

      promptStore.confirm('Answer');
      const secondResult = await secondPromise;
      expect(secondResult).toBe('Answer');
    });
  });

  describe('validation', () => {
    it('should support required validation', async () => {
      const promptPromise = promptStore.show({
        message: 'Enter name',
        required: true
      });

      const state = get(promptStore);
      expect(state?.required).toBe(true);

      promptStore.cancel();
      await promptPromise;
    });

    it('should support maxLength validation', async () => {
      const promptPromise = promptStore.show({
        message: 'Enter name',
        maxLength: 50
      });

      const state = get(promptStore);
      expect(state?.maxLength).toBe(50);

      promptStore.cancel();
      await promptPromise;
    });

    it('should support minLength validation', async () => {
      const promptPromise = promptStore.show({
        message: 'Enter name',
        minLength: 3
      });

      const state = get(promptStore);
      expect(state?.minLength).toBe(3);

      promptStore.cancel();
      await promptPromise;
    });

    it('should support pattern validation', async () => {
      const promptPromise = promptStore.show({
        message: 'Enter email',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      });

      const state = get(promptStore);
      expect(state?.pattern).toBe('^[^@]+@[^@]+\\.[^@]+$');

      promptStore.cancel();
      await promptPromise;
    });
  });

  describe('input type', () => {
    it('should default to text input type', async () => {
      const promptPromise = promptStore.show('Enter value');

      const state = get(promptStore);
      expect(state?.inputType).toBe('text');

      promptStore.cancel();
      await promptPromise;
    });

    it('should support different input types', async () => {
      const promptPromise = promptStore.show({
        message: 'Enter number',
        inputType: 'number'
      });

      const state = get(promptStore);
      expect(state?.inputType).toBe('number');

      promptStore.cancel();
      await promptPromise;
    });
  });
});
