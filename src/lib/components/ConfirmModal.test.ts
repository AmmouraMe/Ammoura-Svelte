import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import ConfirmModal from './ConfirmModal.svelte';
import { confirmStore } from '../stores/confirm';

describe('ConfirmModal', () => {
  beforeEach(() => {
    // Reset store state
    confirmStore.cancel();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should not render when store is null', () => {
      render(ConfirmModal);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when store has state', async () => {
      render(ConfirmModal);
      confirmStore.show('Delete this item?');
      await tick();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete this item?')).toBeInTheDocument();
    });

    it('should display custom title', async () => {
      render(ConfirmModal);
      confirmStore.show('Delete?', { title: 'Confirm Deletion' });
      await tick();

      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    });

    it('should display custom button text', async () => {
      render(ConfirmModal);
      confirmStore.show('Delete?', {
        confirmText: 'Yes, Delete',
        cancelText: 'No, Keep'
      });
      await tick();

      expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
    });
  });

  describe('confirmation', () => {
    it('should resolve with true when confirm button clicked', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      await fireEvent.click(confirmBtn);

      await expect(promise).resolves.toBe(true);
    });

    it('should close modal after confirmation', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      await fireEvent.click(confirmBtn);
      const result = await promise;

      // Verify result and that store state is cleared
      expect(result).toBe(true);
      const { get } = await import('svelte/store');
      expect(get(confirmStore)).toBeNull();
    });
  });

  describe('cancellation', () => {
    it('should resolve with false when cancel button clicked', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelBtn);

      await expect(promise).resolves.toBe(false);
    });

    it('should resolve with false when clicking overlay', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      const overlay = screen.getByTestId('confirm-overlay');
      await fireEvent.click(overlay);

      await expect(promise).resolves.toBe(false);
    });

    it('should resolve with false when pressing Escape', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      await fireEvent.keyDown(window, { key: 'Escape' });

      await expect(promise).resolves.toBe(false);
    });

    it('should close modal after cancellation', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelBtn);
      const result = await promise;

      // Verify result and that store state is cleared
      expect(result).toBe(false);
      const { get } = await import('svelte/store');
      expect(get(confirmStore)).toBeNull();
    });
  });

  describe('keyboard navigation', () => {
    it('should confirm when Enter is pressed', async () => {
      render(ConfirmModal);
      const promise = confirmStore.show('Continue?');
      await tick();

      await fireEvent.keyDown(window, { key: 'Enter' });

      await expect(promise).resolves.toBe(true);
    });
  });

  describe('variants', () => {
    it('should apply danger variant class', async () => {
      render(ConfirmModal);
      confirmStore.show('Delete?', { variant: 'danger' });
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      expect(confirmBtn.classList.contains('btn-danger')).toBe(true);
    });

    it('should apply warning variant class', async () => {
      render(ConfirmModal);
      confirmStore.show('Warning!', { variant: 'warning' });
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      expect(confirmBtn.classList.contains('btn-warning')).toBe(true);
    });

    it('should apply default variant class', async () => {
      render(ConfirmModal);
      confirmStore.show('Continue?');
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      expect(confirmBtn.classList.contains('btn-primary')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper aria attributes', async () => {
      render(ConfirmModal);
      confirmStore.show('Delete item?', { title: 'Confirm' });
      await tick();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title');
    });

    it('should have confirm button that can receive focus', async () => {
      render(ConfirmModal);
      confirmStore.show('Continue?');
      await tick();

      const confirmBtn = screen.getByRole('button', { name: 'OK' });
      // Verify button exists and can be focused
      expect(confirmBtn).toBeInTheDocument();
      confirmBtn.focus();
      expect(document.activeElement).toBe(confirmBtn);
    });
  });
});
