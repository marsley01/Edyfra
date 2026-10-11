"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function NoAccessSignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut().catch(() => {});
        window.location.href = "/auth/institution-login";
      }}
      className="flex h-10 items-center justify-center rounded-lg border border-white/[0.1] text-sm font-medium text-white/80 hover:bg-white/[0.06] disabled:opacity-50"
    >
      {busy ? "Signing out..." : "Sign in with a different account"}
    </button>
  );
}
