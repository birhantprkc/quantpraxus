/**
 * Quantpraxus - Sınav Analiz Sistemi
 */

import '@testing-library/jest-dom'
import '@testing-library/jest-dom/vitest'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
