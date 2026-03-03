/**
 * Quantpraxus - Sınav Analiz Sistemi
 */

/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import type {
  TestingLibraryMatchers,
} from '@testing-library/jest-dom/matchers'

declare global {
  namespace Vi {
    interface Assertion extends TestingLibraryMatchers<HTMLElement, void> {}
    interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, void> {}
  }
}
