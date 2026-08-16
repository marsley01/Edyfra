import { createClient } from "@/utils/supabase/server";
import { AppError } from "@/core/errors";
import { Role, parseRole } from "./Roles";
import type { RBACUser } from "./RBAC";
import { RBAC } from "./RBAC";
import type { Permission } from "./Permissions";
import { logger } from "@/core/logging";

export type AuthResult = {
  user: RBACUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function authenticate(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw AppError.unauthorized("You must be signed in to access this resource.");
  }

  const role = parseRole(authUser.user_metadata?.role as string) || Role.STUDENT;

  const user: RBACUser = {
    id: authUser.id,
    role,
    institutionId: authUser.user_metadata?.institutionId as string | undefined,
  };

  return { user, supabase };
}

export async function authorize(permission: Permission): Promise<AuthResult> {
  const { user, supabase } = await authenticate();
  RBAC.check(user, permission);
  return { user, supabase };
}

export async function authorizeAll(permissions: Permission[]): Promise<AuthResult> {
  const { user, supabase } = await authenticate();
  RBAC.checkAll(user, permissions);
  return { user, supabase };
}

export async function requireMinRole(minimumRole: Role): Promise<AuthResult> {
  const { user, supabase } = await authenticate();
  RBAC.requireRole(user, minimumRole);
  return { user, supabase };
}

export function withAuth<T>(
  handler: (auth: AuthResult, ...args: unknown[]) => Promise<T>,
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]) => {
    const auth = await authenticate();
    return handler(auth, ...args);
  };
}

export function withPermission<T>(
  permission: Permission,
  handler: (auth: AuthResult, ...args: unknown[]) => Promise<T>,
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]) => {
    const auth = await authorize(permission);
    return handler(auth, ...args);
  };
}

export async function authenticateAPI(request: Request): Promise<AuthResult> {
  try {
    return await authenticate();
  } catch (err) {
    logger.warn("API authentication failed", {
      path: new URL(request.url).pathname,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
