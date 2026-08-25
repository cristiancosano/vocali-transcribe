import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.{ts,vue}'],
      exclude: ['app/**/*.spec.ts'],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 80,
        lines: 80
      }
    }
  }
})
