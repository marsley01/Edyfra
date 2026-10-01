"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

/**
 * Consumes `token_hash` from an auth email link and exchanges it for a session
 * via `verifyOtp`.
 *
 * Going through `verifyOtp` rather than letting Supabase's implicit flow put
 * tokens in the URL fragment keeps the token out of the address bar, out of
 * `Referer` headers, and out of browser history.
 */

type Status = "working" | "done" | "error";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  // Email-change links should land back on the settings page that started it.
  const next = type === "email_change" ? "/dashboard/settings?email=confirmed" : null;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!tokenHash || !type) {
      setStatus("error");
      setMessage(
        "This link is missing its verification token. Request a fresh one and open it directly from the email.",
      );
      return;
    }

    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as Parameters<typeof supabase.auth.verifyOtp>[0] extends undefined
            ? never
            : "recovery" | "email_change" | "invite" | "magiclink" | "signup" | "email",
        });

        if (!active) return;

        if (error) {
          setStatus("error");
          setMessage(
            /expired|invalid/i.test(error.message)
              ? "This link has expired or has already been used. Request a new one."
              : error.message,
          );
          return;
        }

        setStatus("done");
        // Recovery needs the session that verifyOtp just created, so /update-password
        // can call updateUser() without re-authenticating.
        router.replace(next || "/update-password");
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage("We couldn't verify this link. Please try again.");
      }
    })();

    return () => {
      active = false;
    };
  }, [tokenHash, type, next, router]);

  if (status === "error") {
    return (
      <Frame>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-3xl font-black tracking-tightest">That link didn&apos;t work</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/forgot-password"
            className="h-11 inline-flex items-center rounded-full bg-foreground px-5 text-background text-xs font-black uppercase tracking-widest"
          >
            Send a new link
          </Link>
          <Link
            href="/auth/login"
            className="h-11 inline-flex items-center rounded-full border-2 border-border px-5 text-xs font-black uppercase tracking-widest"
          >
            Go to login
          </Link>
        </div>
      </Frame>
    );
  }

  if (status === "done") {
    return (
      <Frame>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <Check className="h-7 w-7 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black tracking-tightest">Link verified</h1>
        <p className="text-sm text-muted-foreground">Taking you to the next step…</p>
      </Frame>
    );
  }

  return (
    <Frame>
      <Loader2 className="mx-auto mb-6 h-8 w-8 animate-spin text-primary" />
      <h1 className="text-3xl font-black tracking-tightest">Verifying your link</h1>
      <p className="text-sm text-muted-foreground">One moment.</p>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-[440px] space-y-6 text-center">{children}</div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Frame>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        </Frame>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
