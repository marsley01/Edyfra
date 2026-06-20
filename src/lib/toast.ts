"use client";

import { toast } from "sonner";

/**
 * Edyfra toast helpers.
 *
 * Every error toast we show should answer three questions for the human reading it:
 *   1. What happened?     -> the `title` (short, friendly, no jargon)
 *   2. Why did it happen? -> the `cause`  (one short line, plain English)
 *   3. What now?          -> the `fix`    (one short, actionable nudge)
 *
 * If you only know two of the three, that's fine — pass what you have.
 * Never expose raw stack traces or DB error codes to users; log those to console.
 */

export interface ErrorToastInput {
  /** What happened in 2–6 words. e.g. "Couldn't sign you in" */
  title: string;
  /** Why it happened — one short line. Optional. */
  cause?: string;
  /** What the user can try next. Optional. */
  fix?: string;
  /** The raw error for our logs only — never shown. */
  raw?: unknown;
  /** Optional id to dedupe toasts (e.g. "save-profile"). */
  id?: string;
  /** Optional action button — pass label + onClick. */
  action?: { label: string; onClick: () => void };
}

function joinLines(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

/**
 * Show a personalized error toast.
 *
 * @example
 *   showError({
 *     title: "Couldn't sign you in",
 *     cause: "That email and password don't match anything we have.",
 *     fix: "Double-check the spelling or reset your password.",
 *   });
 */
export function showError({ title, cause, fix, raw, id, action }: ErrorToastInput) {
  if (raw !== undefined) {
    // Logs only — users never see the raw error.
    // eslint-disable-next-line no-console
    console.error(`[toast] ${title}`, raw);
  }
  const description = joinLines([cause, fix]);
  toast.error(title, {
    id,
    description: description || undefined,
    duration: 6500,
    action: action ? { label: action.label, onClick: action.onClick } : undefined,
  });
}

/** Friendly success toast. Keep the title personal, optional description for context. */
export function showSuccess(title: string, opts?: { description?: string; id?: string; action?: { label: string; onClick: () => void } }) {
  toast.success(title, {
    id: opts?.id,
    description: opts?.description,
    duration: 4500,
    action: opts?.action ? { label: opts.action.label, onClick: opts.action.onClick } : undefined,
  });
}

/** Heads-up / informational toast. */
export function showInfo(title: string, opts?: { description?: string; id?: string }) {
  toast.message(title, {
    id: opts?.id,
    description: opts?.description,
    duration: 4500,
  });
}

/** Loading toast — returns the id so the caller can dismiss it. */
export function showLoading(title: string, opts?: { description?: string; id?: string }) {
  return toast.loading(title, {
    id: opts?.id,
    description: opts?.description,
  });
}

/**
 * Translate raw error shapes (Error / string / Supabase / Stream / Prisma) into
 * a friendly ErrorToastInput. Use this as a fallback when you really don't
 * know what went wrong — but prefer hand-written copy when you do.
 */
export function explainError(err: unknown, fallbackTitle = "Something went sideways"): ErrorToastInput {
  const msg = typeof err === "string" ? err : (err as any)?.message || (err as any)?.error || "";
  const lower = msg.toLowerCase();

  // Network / offline
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return {
      title: "We can't reach our servers right now",
      cause: "Your connection dropped or our servers blinked.",
      fix: "Check your internet and try again in a moment.",
      raw: err,
    };
  }

  // Rate limit
  if (lower.includes("too many requests") || lower.includes("rate limit") || lower.includes("429")) {
    return {
      title: "Whoa — slow down a sec",
      cause: "You've made a lot of requests in a short time.",
      fix: "Wait a few seconds, then try again.",
      raw: err,
    };
  }

  // Auth / permission
  if (lower.includes("unauthorized") || lower.includes("not signed in") || lower.includes("not authenticated")) {
    return {
      title: "You need to sign in for that",
      cause: "Your session expired or you're signed out.",
      fix: "Sign back in and try again.",
      raw: err,
    };
  }
  if (lower.includes("forbidden") || lower.includes("permission")) {
    return {
      title: "You don't have access to this",
      cause: "Your account isn't allowed to do that.",
      fix: "If you think that's wrong, ping support.",
      raw: err,
    };
  }

  // Validation
  if (lower.includes("invalid") || lower.includes("required") || lower.includes("must")) {
    return {
      title: "Some details look off",
      cause: msg,
      fix: "Tweak the inputs and try again.",
      raw: err,
    };
  }

  // Supabase email/password
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return {
      title: "That login didn't work",
      cause: "Email and password don't match our records.",
      fix: "Double-check the spelling, or reset your password.",
      raw: err,
    };
  }
  if (lower.includes("user already registered")) {
    return {
      title: "You already have an account",
      cause: "That email is already signed up with us.",
      fix: "Try signing in instead — or reset your password.",
      raw: err,
    };
  }

  // 404 / not found
  if (lower.includes("not found")) {
    return {
      title: "We couldn't find that",
      cause: msg || "It may have been removed or moved.",
      fix: "Refresh the page and try again.",
      raw: err,
    };
  }

  // Default
  return {
    title: fallbackTitle,
    cause: msg || "We're not sure what caused it.",
    fix: "Give it another try. If it keeps happening, contact support.",
    raw: err,
  };
}

/** Show a toast from any unknown error shape. Shortcut for `showError(explainError(err))`. */
export function showUnknownError(err: unknown, fallbackTitle?: string) {
  showError(explainError(err, fallbackTitle));
}
