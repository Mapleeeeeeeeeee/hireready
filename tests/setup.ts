import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ============================================================
// JSDOM Polyfills
// Required by HeroUI and other UI libraries
// Only apply in browser-like environments (jsdom)
// ============================================================

if (typeof window !== 'undefined') {
  // ResizeObserver polyfill
  if (!window.ResizeObserver) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserver;
  }

  // matchMedia mock
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
}
