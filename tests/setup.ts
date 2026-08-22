import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { readable } from 'svelte/store';

/**
 * Spy-able Web Storage.
 *
 * happy-dom 20 implements `localStorage` as a Proxy: `getItem` works when
 * called, but is not a real property, so `Object.getOwnPropertyDescriptor`
 * returns undefined and `vi.spyOn(localStorage, 'getItem')` fails with
 * "getItem does not exist". Every test that asserts our storage error handling
 * — the `try/catch` paths around quota errors and corrupt JSON — broke on that.
 *
 * Installing a plain object whose methods are *own* properties restores
 * spy-ability without changing storage semantics.
 */
function createSpyableStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length(): number {
      return data.size;
    },
    clear(): void {
      data.clear();
    },
    getItem(key: string): string | null {
      const value = data.get(String(key));
      return value === undefined ? null : value;
    },
    key(index: number): string | null {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      data.delete(String(key));
    },
    setItem(key: string, value: string): void {
      data.set(String(key), String(value));
    }
  } as Storage;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, {
    value: createSpyableStorage(),
    configurable: true,
    writable: true
  });
}

// Mock $app/environment to simulate browser environment
vi.mock('$app/environment', () => ({
  browser: true,
  building: false,
  dev: true,
  version: 'test'
}));

const storageValues = new Map<string, string>();
const storage: Storage = {
  get length() {
    return storageValues.size;
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => [...storageValues.keys()][index] ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, String(value))
};

// Node can expose an unusable localStorage getter that shadows the DOM environment.
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: storage
});
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage
});
