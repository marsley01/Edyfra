export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  const propNames = Object.getOwnPropertyNames(
    value as Record<string, unknown>,
  );

  for (const name of propNames) {
    const prop = (value as Record<string, unknown>)[name];
    deepFreeze(prop);
  }

  return Object.freeze(value);
}

export function deepSeal<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  const propNames = Object.getOwnPropertyNames(
    value as Record<string, unknown>,
  );

  for (const name of propNames) {
    const prop = (value as Record<string, unknown>)[name];
    deepSeal(prop);
  }

  return Object.seal(value);
}

export function flatten(
  obj: Record<string, unknown>,
  prefix = "",
  separator = ".",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const prefixedKey = prefix.length > 0 ? `${prefix}${separator}${key}` : key;

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const nested = flatten(
        value as Record<string, unknown>,
        prefixedKey,
        separator,
      );
      Object.assign(result, nested);
    } else {
      result[prefixedKey] = value;
    }
  }

  return result;
}

export function unflatten(
  obj: Record<string, unknown>,
  separator = ".",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(separator);
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as string;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = value;
      } else {
        const existing = current[part];
        if (typeof existing !== "object" || existing === null) {
          const next = {} as Record<string, unknown>;
          current[part] = next;
          current = next;
        } else {
          current = existing as Record<string, unknown>;
        }
      }
    }
  }

  return result;
}

export function get<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T,
): T | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return defaultValue;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return (current as T | undefined) ?? defaultValue;
}

export function set(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as string;
    const isLast = i === keys.length - 1;

    if (isLast) {
      current[key] = value;
    } else {
      const existing = current[key];
      if (
        typeof existing !== "object" ||
        existing === null
      ) {
        const next: Record<string, unknown> = {};
        current[key] = next;
        current = next;
      } else {
        current = existing as Record<string, unknown>;
      }
    }
  }
}

export function has(obj: Record<string, unknown>, path: string): boolean {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return false;
    }

    if (!(key in (current as Record<string, unknown>))) {
      return false;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return true;
}

export function omitBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: string) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (!predicate(obj[key] as T[keyof T], key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: string) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (predicate(obj[key] as T[keyof T], key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

export function mergeWithCustomizer<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
  customizer: (
    targetValue: unknown,
    sourceValue: unknown,
    key: string,
  ) => unknown,
): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = (source as Record<string, unknown>)[key];
    const customized = customizer(targetValue, sourceValue, key);

    if (customized !== undefined) {
      result[key] = customized;
    } else if (
      isRecord(targetValue) &&
      isRecord(sourceValue)
    ) {
      result[key] = mergeWithCustomizer(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
        customizer,
      );
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hash(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}
