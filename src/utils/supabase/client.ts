import { createBrowserClient } from "@supabase/ssr";

let supabaseSingleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  if (supabaseSingleton) return supabaseSingleton;
  supabaseSingleton = createBrowserClient(url, key);
  return supabaseSingleton;
}
