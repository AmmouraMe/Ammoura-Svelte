import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
