import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

import './utils';

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test';

export const TEST_LIST_ID = 'list-id';

// Polyfill IntersectionObserver for framer-motion
// @ts-expect-error - Polyfilling globals for test environment
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Fix for JSDOM recursion bug with hardwareConcurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => 4,
  configurable: true,
});

// Ensure jsdom environment is fully initialized before tests run
beforeAll(() => {
  // Verify jsdom globals are available
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('jsdom environment not properly initialized');
  }
});

// Reset mocks after each test for test isolation
afterEach(() => {
  vi.resetAllMocks();
  cleanup();
});
