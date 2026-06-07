"use client";

import { useEffect, useState } from "react";

/**
 * Debounces a value by `delay` ms.
 * Returns the latest value once no changes have happened for `delay` ms.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
