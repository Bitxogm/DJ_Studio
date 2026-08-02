import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver; @radix-ui/react-slider (y otros
// primitivos de tamaño dinámico) lo requieren incluso cuando no importa el
// layout real en tests. Stub mínimo, no mide nada de verdad.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
