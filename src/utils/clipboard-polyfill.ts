export function polyfillClipboard() {
  if (typeof navigator === "undefined") return;
  try {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {},
        readText: async () => "",
        write: async () => {},
        read: async () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      },
      writable: false,
      configurable: true,
    });
  } catch {
    // navigator.clipboard already defined and non-configurable — safe to proceed
  }
}
