"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

/**
 * Tiny client shim for Supabase's legacy implicit flow (hash-based tokens).
 * supabase-js will pick up the `#access_token=...` fragment on mount and
 * create a session in storage. We then route the user to a sensible place.
 */
export default function AuthCallbackHandle() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      // Wait a tick so supabase-js can hydrate from the URL hash.
      await new Promise((r) => setTimeout(r, 50));

      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isRecovery = hash.includes("type=recovery");

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setStatus("error");
        setErrorMsg(error?.message || "We couldn't read your sign-in link.");
        return;
      }

      // Password recovery should always land on /update-password
      // so the user can actually set a new one.
      const dest = isRecovery ? "/update-password" : next.startsWith("/") ? next : "/dashboard";
      router.replace(dest);
    })();
    return () => {
      active = false;
    };
  }, [router, next]);

  if (status === "error") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tightest">That link didn&apos;t work</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground/80">What happened:</span>{" "}
              {errorMsg}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground/80">Likely cause:</span>{" "}
              the link expired or was already used.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground/80">Try this:</span>{" "}
              request a fresh link and open it within 60 minutes.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="h-11 inline-flex items-center px-5 rounded-full bg-foreground text-background text-xs font-black tracking-widest uppercase"
            >
              Go to login
            </Link>
            <Link
              href="/forgot-password"
              className="h-11 inline-flex items-center px-5 rounded-full border-2 border-border text-xs font-black tracking-widest uppercase"
            >
              Send a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">
          Finishing sign-in… one second.
        </p>
      </div>
    </div>
  );
}
