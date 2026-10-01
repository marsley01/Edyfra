"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { showError } from "@/lib/toast";

export interface GoogleButtonProps {
  /**
   * Where the callback should send the user once the session is established.
   * Anything that is not a same-origin absolute path is discarded server-side
   * by `sanitizeNextPath`, so this is a hint, not a security boundary.
   */
  next?: string;
  /** Lets the host page surface the failure inline as well as in a toast. */
  onError?: (message: string | null) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Supabase OAuth does not distinguish sign-up from sign-in: whichever address
 * the Google account carries becomes a session, and a brand-new address gets a
 * brand-new `auth.users` row. That is why this single button is correct on both
 * the login and the register page.
 */
export function GoogleButton({
  next = "/dashboard",
  onError,
  disabled = false,
  label = "Continue with Google",
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleClick() {
    if (loading || disabled) return;

    setLoading(true);
    onError?.(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Built from the origin actually serving this page, so preview
        // deployments and the apex/www pair both work with no rebuild.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // `select_account` stops a user who is already signed into Google in
        // the same browser from being silently signed in as the wrong account.
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    // No error means the browser is navigating to accounts.google.com. Leave
    // the button disabled so a double-click cannot start a second flow.
    if (!error) return;

    console.error(
      "[google-oauth] signInWithOAuth failed:",
      error.status,
      error.code,
      error.message,
    );

    const providerDisabled = /provider/i.test(error.message);
    const message = providerDisabled
      ? "Google sign-in is not enabled yet. Use your email and password."
      : "Could not start Google sign-in. Try again in a moment.";

    setLoading(false);
    onError?.(message);
    showError({
      title: "Couldn't start Google sign-in",
      cause: providerDisabled ? "The Google provider is switched off in Supabase." : error.message,
      fix: "Try again, or sign in with your email and password.",
      raw: error,
      id: "google-oauth",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="flex h-16 w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white font-black text-xs uppercase tracking-widest text-black shadow-sm transition-all hover:bg-neutral-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-secondary"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <GoogleMark className="h-5 w-5" />
          {label}
        </>
      )}
    </button>
  );
}

/** "or continue with email" separator that sits between the two paths. */
export function AuthDivider({ children = "or continue with email" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.89Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.21 7.21 0 0 1 0-4.54V6.61H1.29a12 12 0 0 0 0 10.78l3.98-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l3.98 3.12C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
