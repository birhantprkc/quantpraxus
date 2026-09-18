/**
 * Quantpraxus - Sınav Analiz Sistemi
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'shared',
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: ['**/*.d.ts']
    }
  }
})
