import { createBrowserClient } from "@supabase/ssr";

let supabaseSingleton: ReturnType<typeof createBrowserClient> | null = null;

function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not defined. Please check your environment configuration.`);
  }
  return value;
}

export function createClient() {
  const url = validateEnvVar("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = validateEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  if (supabaseSingleton) return supabaseSingleton;
  supabaseSingleton = createBrowserClient(url, key);
  return supabaseSingleton;
}
