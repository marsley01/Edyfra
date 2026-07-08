export function isValidURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(str: string): boolean {
  return EMAIL_REGEX.test(str);
}

const API_KEY_REGEX = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidApiKey(str: string): boolean {
  return API_KEY_REGEX.test(str);
}

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function isValidVersion(str: string): boolean {
  return SEMVER_REGEX.test(str);
}

export interface ConfigSchema {
  [key: string]:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | ConfigSchema;
}

export type ValidationResult =
  | { valid: true; errors: undefined }
  | { valid: false; errors: string[] };

export function validateConfig(
  config: Record<string, unknown>,
  schema: ConfigSchema,
): ValidationResult {
  const errors: string[] = [];

  for (const [key, expectedType] of Object.entries(schema)) {
    const value = config[key];

    if (value === undefined) {
      errors.push(`Missing required field: "${key}"`);
      continue;
    }

    if (typeof expectedType === "string") {
      if (expectedType === "array") {
        if (!Array.isArray(value)) {
          errors.push(
            `Field "${key}" expected array, got ${typeof value}`,
          );
        }
      } else if (typeof value !== expectedType) {
        errors.push(
          `Field "${key}" expected ${expectedType}, got ${typeof value}`,
        );
      }
    } else if (typeof expectedType === "object" && expectedType !== null) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push(`Field "${key}" expected object, got ${typeof value}`);
      } else {
        const nestedResult = validateConfig(
          value as Record<string, unknown>,
          expectedType,
        );
        if (!nestedResult.valid) {
          errors.push(...nestedResult.errors.map((e) => `${key}.${e}`));
        }
      }
    }
  }

  return errors.length === 0
    ? { valid: true, errors: undefined }
    : { valid: false, errors };
}

export function assertDefined<T>(
  value: T | undefined,
  name?: string,
): asserts value is T {
  if (value === undefined) {
    throw new Error(
      `Assertion failed: ${name ?? "value"} is undefined`,
    );
  }
}

export function assertNonNull<T>(
  value: T | null | undefined,
  name?: string,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(
      `Assertion failed: ${name ?? "value"} is null or undefined`,
    );
  }
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
