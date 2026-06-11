export function register() {
  // Next.js 15 dev mode passes --localstorage-file to Node.js without a valid
  // path.  Node ≥22 creates a localStorage proxy that throws on .getItem()
  // instead of returning null.  The DevOverlay reads this during SSR, crashing
  // every request with "localStorage.getItem is not a function".
  // Patch it to a safe no-op before any page rendering begins.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as typeof globalThis & { localStorage?: unknown };
  if (!g.localStorage) return;

  try {
    (g.localStorage as Storage).getItem("__probe__");
  } catch {
    Object.defineProperty(g, "localStorage", {
      value: {
        getItem: (_key: string): null => null,
        setItem: (_key: string, _value: string): void => {},
        removeItem: (_key: string): void => {},
        clear: (): void => {},
        length: 0,
        key: (_index: number): null => null,
      },
      writable: true,
      configurable: true,
    });
  }
}
