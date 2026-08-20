import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  // Without this, Vite resolves Svelte to its server build under vitest and
  // `onMount` never fires, so any component whose setup runs on mount renders
  // as if it had no state at all.
  resolve: { conditions: ['browser'] },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'happy-dom',
    pool: 'threads',
    poolOptions: { threads: { singleThread: false } },
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.{js,ts}'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/*.d.ts',
        'src/app.html',
        'src/app.css',
        'src/lib/components/**',
        'src/lib/types/**',
        'src/routes/**',
        'tests/**',
        'node_modules/**',
        '.svelte-kit/**',
        'build/**',
        'dist/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      all: true,
      clean: true
    }
  }
});
