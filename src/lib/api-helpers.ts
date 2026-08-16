import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { log } from "@/lib/logger";

export function getBody<T>(request: NextRequest): Promise<T> {
  return request.json() as Promise<T>;
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { user, supabase };
}

export function logApiError(
  route: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  log("error", `API ${route} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}
