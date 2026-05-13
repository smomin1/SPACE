import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/unit/schema.test.ts', 'tests/unit/requirement-schema.test.ts'],
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
    ],
    setupFiles: ['tests/setup.ts'],
  },
})
