import '@testing-library/jest-dom/vitest';

// Node's experimental built-in localStorage global shadows jsdom's working one in this Vitest version, so we provide a spec-faithful in-memory replacement.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

// jsdom does not implement scrollIntoView; polyfill as a no-op so components
// that call it (e.g. auto-scroll on new messages) don't throw in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// jsdom does not implement matchMedia; polyfill with a static "no match" result
// so responsive/reduced-motion checks (e.g. mobile sidebar default, prefers-
// reduced-motion) don't throw. Tests that care about a specific match can
// override window.matchMedia themselves.
if (!window.matchMedia) {
  window.matchMedia = function matchMedia(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
}
