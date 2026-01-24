import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { confirmStore } from './confirm';

describe('confirmStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    confirmStore.cancel();
  });

  describe('initial state', () => {
    it('should have null state initially', () => {
      const state = get(confirmStore);
      expect(state).toBeNull();
    });
  });

  describe('show', () => {
    it('should set message and show dialog', async () => {
      const promise = confirmStore.show('Are you sure you want to delete this?');

      const state = get(confirmStore);
      expect(state).not.toBeNull();
      expect(state?.message).toBe('Are you sure you want to delete this?');
      expect(state?.title).toBe('Confirm');

      // Cleanup
      confirmStore.cancel();
      await expect(promise).resolves.toBe(false);
    });

    it('should accept custom options', async () => {
      const promise = confirmStore.show('Delete this item permanently?', {
        title: 'Confirm Deletion',
        confirmText: 'Delete',
        cancelText: 'Keep',
        variant: 'danger'
      });

      const state = get(confirmStore);
      expect(state?.message).toBe('Delete this item permanently?');
      expect(state?.title).toBe('Confirm Deletion');
      expect(state?.confirmText).toBe('Delete');
      expect(state?.cancelText).toBe('Keep');
      expect(state?.variant).toBe('danger');

      // Cleanup
      confirmStore.cancel();
      await expect(promise).resolves.toBe(false);
    });

    it('should use default values for missing options', async () => {
      const promise = confirmStore.show('Continue?');

      const state = get(confirmStore);
      expect(state?.confirmText).toBe('OK');
      expect(state?.cancelText).toBe('Cancel');
      expect(state?.title).toBe('Confirm');
      expect(state?.variant).toBe('default');

      // Cleanup
      confirmStore.cancel();
      await expect(promise).resolves.toBe(false);
    });
  });

  describe('confirm', () => {
    it('should resolve promise with true when confirmed', async () => {
      const promise = confirmStore.show('Delete this?');

      confirmStore.confirm();

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should reset state after confirm', async () => {
      const promise = confirmStore.show('Delete?');

      confirmStore.confirm();
      await promise;

      const state = get(confirmStore);
      expect(state).toBeNull();
    });

    it('should do nothing if no active dialog', () => {
      // Should not throw
      confirmStore.confirm();
      expect(get(confirmStore)).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should resolve promise with false when cancelled', async () => {
      const promise = confirmStore.show('Delete this?');

      confirmStore.cancel();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should reset state after cancel', async () => {
      const promise = confirmStore.show('Delete?');

      confirmStore.cancel();
      await promise;

      const state = get(confirmStore);
      expect(state).toBeNull();
    });

    it('should do nothing if no active dialog', () => {
      // Should not throw
      confirmStore.cancel();
      expect(get(confirmStore)).toBeNull();
    });
  });

  describe('sequential dialogs', () => {
    it('should handle multiple sequential dialogs correctly', async () => {
      // First dialog
      const promise1 = confirmStore.show('First question?');
      confirmStore.confirm();
      const result1 = await promise1;
      expect(result1).toBe(true);

      // Second dialog
      const promise2 = confirmStore.show('Second question?');
      confirmStore.cancel();
      const result2 = await promise2;
      expect(result2).toBe(false);
    });

    it('should replace active dialog with new one', async () => {
      const promise1 = confirmStore.show('First?');
      const promise2 = confirmStore.show('Second?');

      const state = get(confirmStore);
      expect(state?.message).toBe('Second?');

      confirmStore.confirm();

      // First promise resolves with false (cancelled)
      await expect(promise1).resolves.toBe(false);
      // Second promise resolves with true (confirmed)
      await expect(promise2).resolves.toBe(true);
    });
  });

  describe('variant styles', () => {
    it('should support danger variant', async () => {
      const promise = confirmStore.show('Delete permanently?', { variant: 'danger' });

      const state = get(confirmStore);
      expect(state?.variant).toBe('danger');

      confirmStore.cancel();
      await promise;
    });

    it('should support warning variant', async () => {
      const promise = confirmStore.show('This may cause issues', { variant: 'warning' });

      const state = get(confirmStore);
      expect(state?.variant).toBe('warning');

      confirmStore.cancel();
      await promise;
    });

    it('should default to default variant', async () => {
      const promise = confirmStore.show('Continue?');

      const state = get(confirmStore);
      expect(state?.variant).toBe('default');

      confirmStore.cancel();
      await promise;
    });
  });
});
