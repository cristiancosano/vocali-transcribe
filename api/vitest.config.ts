import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 80,
        lines: 80
      }
    }
  }
})
