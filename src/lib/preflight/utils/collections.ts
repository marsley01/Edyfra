export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of items) {
    const key = keyFn(item);
    const group = result[key];
    if (group === undefined) {
      result[key] = [item];
    } else {
      group.push(item);
    }
  }

  return result;
}

export function keyBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const item of items) {
    const key = keyFn(item);
    result[key] = item;
  }

  return result;
}

export function partition<T>(
  items: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];

  for (const item of items) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }

  return [pass, fail];
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("Chunk size must be positive");
  }

  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T>>
): T {
  let result: Record<string, unknown> = { ...target };

  for (const source of sources) {
    if (source === undefined || source === null) {
      continue;
    }

    for (const key of Object.keys(source) as Array<keyof T>) {
      const sourceValue = source[key];
      const targetValue = result[key as string];

      if (
        isRecord(sourceValue) &&
        isRecord(targetValue)
      ) {
        result[key as string] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else if (sourceValue !== undefined) {
        result[key as string] = sourceValue;
      }
    }
  }

  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    cloned[key] = deepClone(
      (value as Record<string, unknown>)[key],
    );
  }

  return cloned as T;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}

export function mapValues<T extends Record<string, unknown>, V>(
  obj: T,
  fn: (value: T[keyof T], key: string) => V,
): Record<string, V> {
  const result: Record<string, V> = {};

  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key] as T[keyof T], key);
  }

  return result;
}

export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function uniqBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

export function sortBy<T>(
  items: T[],
  keyFn: (item: T) => string | number,
  order: "asc" | "desc" = "asc",
): T[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);

    if (keyA < keyB) {
      return order === "asc" ? -1 : 1;
    }
    if (keyA > keyB) {
      return order === "asc" ? 1 : -1;
    }
    return 0;
  });

  return sorted;
}

export function orderBy<T>(
  items: T[],
  keyFns: Array<(item: T) => string | number>,
  orders: Array<"asc" | "desc"> = [],
): T[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    for (let i = 0; i < keyFns.length; i++) {
      const keyFn = keyFns[i] as (item: T) => string | number;
      const order = (orders[i] as "asc" | "desc" | undefined) ?? "asc";
      const keyA = keyFn(a);
      const keyB = keyFn(b);

      if (keyA < keyB) {
        return order === "asc" ? -1 : 1;
      }
      if (keyA > keyB) {
        return order === "asc" ? 1 : -1;
      }
    }
    return 0;
  });

  return sorted;
}
