import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock $app/environment to simulate browser environment
vi.mock('$app/environment', () => ({
  browser: true,
  building: false,
  dev: true,
  version: 'test'
}));

/**
 * Node 22+ defines `localStorage` / `sessionStorage` as built-in globals, but they
 * evaluate to `undefined` unless the process is started with `--localstorage-file`.
 *
 * Vitest's happy-dom environment only copies a window key onto `globalThis` when the
 * key does not already exist on the Node global, unless it is on Vitest's own
 * allowlist (`getWindowKeys`: `if (k in global) return keysArray.includes(k)`).
 * Storage is not on that allowlist, so on Node 22+ happy-dom's Storage is skipped and
 * `globalThis.localStorage` stays `undefined` — every test touching it fails with
 * "Cannot read properties of undefined" or "spyOn could not find an object to spy upon".
 *
 * Install a minimal in-memory Storage only when the global is missing. On Node 18/20,
 * where happy-dom's Storage is installed normally, this is a no-op.
 */
class MemoryStorage implements Storage {
  #data = new Map<string, string>();

  get length(): number {
    return this.#data.size;
  }

  key(index: number): string | null {
    return Array.from(this.#data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#data.has(String(key)) ? (this.#data.get(String(key)) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#data.delete(String(key));
  }

  clear(): void {
    this.#data.clear();
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof (globalThis as Record<string, unknown>)[name] === 'undefined') {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
}
