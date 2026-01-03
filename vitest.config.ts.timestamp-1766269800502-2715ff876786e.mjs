// vitest.config.ts
import { sveltekit } from 'file:///C:/Users/monag/_Projects/starspace/hermes/node_modules/@sveltejs/kit/src/exports/vite/index.js';
import { defineConfig } from 'file:///C:/Users/monag/_Projects/starspace/hermes/node_modules/vitest/dist/config.js';
import { readFileSync } from 'fs';
var pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
var vitest_config_default = defineConfig({
  plugins: [sveltekit()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
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
export { vitest_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXG1vbmFnXFxcXF9Qcm9qZWN0c1xcXFxzdGFyc3BhY2VcXFxcaGVybWVzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtb25hZ1xcXFxfUHJvamVjdHNcXFxcc3RhcnNwYWNlXFxcXGhlcm1lc1xcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9tb25hZy9fUHJvamVjdHMvc3RhcnNwYWNlL2hlcm1lcy92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuXG5jb25zdCBwa2cgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYygnLi9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtzdmVsdGVraXQoKV0sXG4gIGRlZmluZToge1xuICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocGtnLnZlcnNpb24pXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnt0ZXN0LHNwZWN9Lntqcyx0c30nXSxcbiAgICBlbnZpcm9ubWVudDogJ2hhcHB5LWRvbScsXG4gICAgcG9vbDogJ3RocmVhZHMnLFxuICAgIHBvb2xPcHRpb25zOiB7IHRocmVhZHM6IHsgc2luZ2xlVGhyZWFkOiBmYWxzZSB9IH0sXG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBzZXR1cEZpbGVzOiBbJy4vdGVzdHMvc2V0dXAudHMnXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCcsICdsY292J10sXG4gICAgICByZXBvcnRzRGlyZWN0b3J5OiAnLi9jb3ZlcmFnZScsXG4gICAgICBpbmNsdWRlOiBbJ3NyYy9saWIvKiovKi57anMsdHN9J10sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICdzcmMvKiovKi57dGVzdCxzcGVjfS57anMsdHN9JyxcbiAgICAgICAgJ3NyYy8qKi8qLmQudHMnLFxuICAgICAgICAnc3JjL2FwcC5odG1sJyxcbiAgICAgICAgJ3NyYy9hcHAuY3NzJyxcbiAgICAgICAgJ3NyYy9saWIvY29tcG9uZW50cy8qKicsXG4gICAgICAgICdzcmMvbGliL3R5cGVzLyoqJyxcbiAgICAgICAgJ3NyYy9yb3V0ZXMvKionLFxuICAgICAgICAndGVzdHMvKionLFxuICAgICAgICAnbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgJy5zdmVsdGUta2l0LyoqJyxcbiAgICAgICAgJ2J1aWxkLyoqJyxcbiAgICAgICAgJ2Rpc3QvKionXG4gICAgICBdLFxuICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICBsaW5lczogODAsXG4gICAgICAgIGZ1bmN0aW9uczogODAsXG4gICAgICAgIGJyYW5jaGVzOiA3NSxcbiAgICAgICAgc3RhdGVtZW50czogODBcbiAgICAgIH0sXG4gICAgICBhbGw6IHRydWUsXG4gICAgICBjbGVhbjogdHJ1ZVxuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZULFNBQVMsaUJBQWlCO0FBQ3ZWLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsb0JBQW9CO0FBRTdCLElBQU0sTUFBTSxLQUFLLE1BQU0sYUFBYSxrQkFBa0IsT0FBTyxDQUFDO0FBRTlELElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxVQUFVLENBQUM7QUFBQSxFQUNyQixRQUFRO0FBQUEsSUFDTixpQkFBaUIsS0FBSyxVQUFVLElBQUksT0FBTztBQUFBLEVBQzdDO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTLENBQUMsOEJBQThCO0FBQUEsSUFDeEMsYUFBYTtBQUFBLElBQ2IsTUFBTTtBQUFBLElBQ04sYUFBYSxFQUFFLFNBQVMsRUFBRSxjQUFjLE1BQU0sRUFBRTtBQUFBLElBQ2hELFNBQVM7QUFBQSxJQUNULFlBQVksQ0FBQyxrQkFBa0I7QUFBQSxJQUMvQixVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ3pDLGtCQUFrQjtBQUFBLE1BQ2xCLFNBQVMsQ0FBQyxzQkFBc0I7QUFBQSxNQUNoQyxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsT0FBTztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsVUFBVTtBQUFBLFFBQ1YsWUFBWTtBQUFBLE1BQ2Q7QUFBQSxNQUNBLEtBQUs7QUFBQSxNQUNMLE9BQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
