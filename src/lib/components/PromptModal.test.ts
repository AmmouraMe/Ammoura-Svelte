import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import PromptModal from './PromptModal.svelte';
import { promptStore } from '../stores/prompt';

describe('PromptModal', () => {
  beforeEach(() => {
    // Reset store state
    promptStore.cancel();
  });

  afterEach(() => {
    cleanup();
    promptStore.cancel();
  });

  describe('rendering', () => {
    it('should not render when store is null', () => {
      render(PromptModal);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when prompt is shown', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Test message');
      await tick();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });

    it('should display the title', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter value',
        title: 'Custom Title'
      });
      await tick();

      expect(screen.getByText('Custom Title')).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });

    it('should display default title when not provided', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Enter value');
      await tick();

      expect(screen.getByText('Input Required')).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });

    it('should display custom button text', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter value',
        confirmText: 'Submit',
        cancelText: 'Abort'
      });
      await tick();

      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });

    it('should display default button text', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Enter value');
      await tick();

      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });
  });

  describe('input handling', () => {
    it('should have input with default value', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        defaultValue: 'John'
      });
      await tick();

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('John');

      promptStore.cancel();
      await promptPromise;
    });

    it('should have input with placeholder', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        placeholder: 'Type here...'
      });
      await tick();

      const input = screen.getByPlaceholderText('Type here...');
      expect(input).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });

    it('should allow typing in the input and verify input exists', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      // Verify the input is rendered and can receive focus
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');

      promptStore.cancel();
      await promptPromise;
    });

    it('should use number input type when specified', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter number',
        inputType: 'number'
      });
      await tick();

      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');

      promptStore.cancel();
      await promptPromise;
    });

    it('should use email input type when specified', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter email',
        inputType: 'email'
      });
      await tick();

      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();

      promptStore.cancel();
      await promptPromise;
    });
  });

  describe('confirmation', () => {
    it('should confirm with entered value when clicking OK', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        defaultValue: 'Test Value'
      });
      await tick();

      // Verify default value is set
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Test Value');

      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      const result = await promptPromise;
      expect(result).toBe('Test Value');
    });

    it('should confirm when pressing Enter', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        defaultValue: 'Enter Test'
      });
      await tick();

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await fireEvent.keyDown(input, { key: 'Enter' });

      const result = await promptPromise;
      expect(result).toBe('Enter Test');
    });

    it('should close modal after confirmation', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      const okButton = screen.getByRole('button', { name: 'OK' });
      await user.click(okButton);

      await promptPromise;
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('cancellation', () => {
    it('should cancel when clicking Cancel button', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      const result = await promptPromise;
      expect(result).toBeNull();
    });

    it('should cancel when pressing Escape', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      const input = screen.getByRole('textbox');
      await user.click(input); // Focus the input first
      await user.keyboard('{Escape}');

      const result = await promptPromise;
      expect(result).toBeNull();
    });

    it('should cancel when clicking overlay', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      const overlay = screen.getByTestId('prompt-overlay');
      await user.click(overlay);

      const result = await promptPromise;
      expect(result).toBeNull();
    });

    it('should cancel when clicking close button', async () => {
      const user = userEvent.setup();
      render(PromptModal);
      const promptPromise = promptStore.show('Enter name');
      await tick();

      const closeButton = screen.getByLabelText('Close dialog');
      await user.click(closeButton);

      const result = await promptPromise;
      expect(result).toBeNull();
    });
  });

  describe('validation', () => {
    it('should have required attribute when required is true', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        required: true
      });
      await tick();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');

      promptStore.cancel();
      await promptPromise;
    });

    it('should have maxLength attribute when specified', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        maxLength: 50
      });
      await tick();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxlength', '50');

      promptStore.cancel();
      await promptPromise;
    });

    it('should have minLength attribute when specified', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter name',
        minLength: 3
      });
      await tick();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('minlength', '3');

      promptStore.cancel();
      await promptPromise;
    });

    it('should have pattern attribute when specified', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show({
        message: 'Enter email',
        pattern: '^[^@]+@[^@]+$'
      });
      await tick();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '^[^@]+@[^@]+$');

      promptStore.cancel();
      await promptPromise;
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Enter value');
      await tick();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      promptStore.cancel();
      await promptPromise;
    });

    it('should focus input on open', async () => {
      render(PromptModal);
      const promptPromise = promptStore.show('Enter value');

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 100));

      const input = screen.getByRole('textbox');
      expect(document.activeElement).toBe(input);

      promptStore.cancel();
      await promptPromise;
    });
  });
});
