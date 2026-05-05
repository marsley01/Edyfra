import { createBrowserClient } from "@supabase/ssr";

let supabaseSingleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseSingleton) {
    return supabaseSingleton;
  }
  supabaseSingleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return supabaseSingleton;
}
