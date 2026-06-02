import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/unit/schema.test.ts', 'tests/unit/requirement-schema.test.ts'],
    setupFiles: ['tests/setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
          exclude: ['tests/components/**', 'tests/unit/schema.test.ts', 'tests/unit/requirement-schema.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['tests/components/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
})
