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

// Default mock for $app/stores so components using the i18n stores ($t, $money,
// $dateFmt — all derived from `page`) render in tests without SvelteKit request
// context. Individual test files can still vi.mock('$app/stores') themselves;
// their file-local mock takes precedence over this one.
vi.mock('$app/stores', () => ({
  page: readable({
    url: new URL('http://localhost'),
    params: {},
    route: { id: null },
    status: 200,
    error: null,
    data: { locale: 'en', currency: 'USD', i18n: { defaultLocale: 'en', enabledLocales: ['en'] } },
    state: {},
    form: undefined
  }),
  navigating: readable(null),
  updated: { subscribe: readable(false).subscribe, check: async () => false }
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
