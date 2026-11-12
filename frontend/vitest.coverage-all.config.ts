import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(baseConfig, defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.tsx',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/main.tsx',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 0, functions: 0, branches: 0, statements: 0,
      },
    },
  },
}));
