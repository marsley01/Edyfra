import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { log } from "@/lib/logger";

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("You must be logged in to perform this action.");
  }

  return { user, supabase };
}

export async function requireUser() {
  const { user } = await requireAuth();

  let prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!prismaUser && user.email) {
    prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
    });
  }

  if (!prismaUser) {
    throw new NotFoundError("User profile not found. Please complete onboarding.");
  }

  return { user, prismaUser };
}

export async function requireRole(...roles: string[]) {
  const { prismaUser } = await requireUser();

  if (!roles.includes(prismaUser.role)) {
    throw new AuthError(
      `Access denied. Required role: ${roles.join(" or ")}. Your role: ${prismaUser.role}`,
    );
  }

  return { user: prismaUser, prismaUser };
}

export function handleActionError(error: unknown): { error: string } {
  if (error instanceof AuthError) {
    return { error: error.message };
  }
  if (error instanceof ValidationError) {
    return { error: error.message };
  }
  if (error instanceof NotFoundError) {
    return { error: error.message };
  }

  log("error", "Unhandled server action error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  return { error: "An unexpected error occurred. Please try again." };
}

export function createApiResponse<T>(
  data: T,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createApiError(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
