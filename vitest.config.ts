import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'public/shaders/lygia/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'collections/**/*.ts'],
      exclude: ['**/*.test.*', '**/types.ts', 'public/shaders/lygia/**'],
      thresholds: {
        // Phase 11 gate 5 target: ≥80% on collections/ + lib/. Current pass
        // shipping crypto + brands + sanitize tests; bump after blog content
        // helpers + adapter tests land.
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: { '@': __dirname },
  },
});
