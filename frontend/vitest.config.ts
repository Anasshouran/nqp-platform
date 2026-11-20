import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Coverage instrumentation slows a few interaction-heavy page tests past
    // the old 10s limit; 30s keeps `npm run test:coverage` stable.
    testTimeout: 30000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // M5-D-J2B full measurement: cover the whole frontend, not just registry.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/__mocks__/**', '**/*.d.ts', 'src/test/**'],
      // Thresholds follow the measured full-scope baseline (see
      // docs/10_Testing/Coverage_Measurement.md). Functions is necessarily
      // lower than the old registry-only 60% because v8 counts every callback
      // in the whole app, most of which has no dedicated test yet.
      thresholds: {
        lines: 70,
        functions: 30,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
