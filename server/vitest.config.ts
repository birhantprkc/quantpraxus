/**
 * Quantpraxus - Sınav Analiz Sistemi
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'server',
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.ts'],
      exclude: [
        'index.ts',
        'vite.ts',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
})
