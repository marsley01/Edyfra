export class EnvironmentError extends Error {
  constructor(variable: string, hint?: string) {
    const msg = hint
      ? `Missing required environment variable: ${variable}. ${hint}`
      : `Missing required environment variable: ${variable}`;
    super(msg);
    this.name = "EnvironmentError";
  }
}

export interface EnvVar<T> {
  key: string;
  parse: (raw: string) => T;
  required?: boolean;
  hint?: string;
  default?: T;
}

export class Environment<T extends Record<string, unknown>> {
  private vars: Map<string, EnvVar<unknown>> = new Map();
  private parsed: Partial<T> = {};

  register<K extends keyof T & string>(def: EnvVar<T[K]>) {
    this.vars.set(def.key, def as EnvVar<unknown>);
    return this;
  }

  validate(): this {
    for (const [, def] of this.vars) {
      const raw = process.env[def.key];
      if (!raw && def.required && def.default === undefined) {
        throw new EnvironmentError(def.key, def.hint);
      }
      const value = raw || def.default;
      if (value !== undefined) {
        try {
          (this.parsed as Record<string, unknown>)[def.key] = def.parse(String(value));
        } catch {
          throw new EnvironmentError(
            def.key,
            `Failed to parse "${String(value)}". ${def.hint || ""}`,
          );
        }
      }
    }
    return this;
  }

  get<K extends keyof T & string>(key: K): T[K] {
    if (!(key in this.parsed)) {
      const def = this.vars.get(key as string);
      if (def?.default !== undefined) return def.default as T[K];
      throw new EnvironmentError(key as string, "Accessed before validation or missing.");
    }
    return this.parsed[key] as T[K];
  }

  getOr<K extends keyof T & string>(key: K, fallback: T[K]): T[K] {
    try {
      return this.get(key);
    } catch {
      return fallback;
    }
  }

  all(): T {
    return this.parsed as T;
  }
}

export type AppEnv = {
  NODE_ENV: "development" | "production" | "test";
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_STREAM_KEY: string;
  STREAM_SECRET: string;
  OPENROUTER_API_KEY: string;
  RESEND_API_KEY: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  GOOGLE_AI_KEY?: string;
  PROJECT_NUMBER?: string;
  MPESA_CONSUMER_KEY?: string;
  MPESA_CONSUMER_SECRET?: string;
  MPESA_PASSKEY?: string;
  MPESA_SHORTCODE?: string;
  MPESA_CALLBACK_URL?: string;
  MPESA_ENV?: "sandbox" | "production";
  ADMIN_EMAIL_1?: string;
  ADMIN_EMAIL_2?: string;
  ADMIN_SECRET_KEY?: string;
  CRON_SECRET?: string;
};

export const env = new Environment<AppEnv>()
  .register({ key: "NODE_ENV", parse: (s) => s as AppEnv["NODE_ENV"], default: "development" })
  .register({ key: "NEXT_PUBLIC_SUPABASE_URL", parse: (s) => s, required: true, hint: "Get this from your Supabase project settings." })
  .register({ key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", parse: (s) => s, required: true })
  .register({ key: "DATABASE_URL", parse: (s) => s, required: true, hint: "PostgreSQL connection string for Prisma." })
  .register({ key: "DIRECT_URL", parse: (s) => s, required: true })
  .register({ key: "SUPABASE_SERVICE_ROLE_KEY", parse: (s) => s, required: true, hint: "Server-side only. Never expose to the client." })
  .register({ key: "NEXT_PUBLIC_STREAM_KEY", parse: (s) => s, required: true })
  .register({ key: "STREAM_SECRET", parse: (s) => s, required: true })
  .register({ key: "OPENROUTER_API_KEY", parse: (s) => s, required: true })
  .register({ key: "RESEND_API_KEY", parse: (s) => s, required: true })
  .register({ key: "UPSTASH_REDIS_REST_URL", parse: (s) => s, required: true })
  .register({ key: "UPSTASH_REDIS_REST_TOKEN", parse: (s) => s, required: true });
