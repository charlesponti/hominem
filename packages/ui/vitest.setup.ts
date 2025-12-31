/// <reference types="vitest" />
import '@testing-library/jest-dom'

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Polyfills for jsdom (needed for Radix UI components)
if (typeof window !== 'undefined' && typeof window.Element !== 'undefined') {
  // Pointer event polyfills
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {}
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }

  // scrollIntoView polyfill
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}
