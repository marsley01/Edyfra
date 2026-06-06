"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/actions/institution-invitations";

export function AcceptClient({ token }: { token: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!token);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "ok"; invitation: { name: string; email: string; role: string; institutionName: string } }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await acceptInvitation({ token });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setState({
          kind: "ok",
          invitation: {
            name: res.invitation.name,
            email: res.invitation.email,
            role: res.invitation.role,
            institutionName: res.invitation.institutionName,
          },
        });
      } else {
        setState({ kind: "err", message: res.error });
        toast.error(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <Center>
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </Center>
    );
  }
  if (state.kind === "err") {
    return (
      <Center>
        <div className="max-w-md rounded-3xl border border-rose-200 bg-rose-50/40 p-10 text-center">
          <XCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-black text-gray-900">Invitation unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{state.message}</p>
          <LinkButton href="/institution/login" className="mt-6">
            Back to login
          </LinkButton>
        </div>
      </Center>
    );
  }
  if (state.kind === "ok") {
    const inv = state.invitation;
    return (
      <Center>
        <div className="max-w-md rounded-3xl border border-emerald-200 bg-emerald-50/40 p-10 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-xl font-black text-gray-900">You're invited, {inv.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            <strong>{inv.institutionName}</strong> has invited you to join as a{" "}
            <strong>{inv.role.toLowerCase()}</strong>. Sign in with{" "}
            <span className="font-bold">{inv.email}</span> to accept the invitation, or create a new
            account using that email.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <LinkButton href="/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton href="/signup" variant="ghost">
              Create account
            </LinkButton>
          </div>
        </div>
      </Center>
    );
  }
  return (
    <Center>
      <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-indigo-500" />
        <h1 className="mt-4 text-xl font-black text-gray-900">Open your invitation</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the link in your email, or paste your invitation token here.
        </p>
        <Button
          className="mt-6 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => {
            const t = window.prompt("Paste your invitation token");
            if (t) router.push(`/institution/accept?token=${t}`);
          }}
        >
          Enter token
        </Button>
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 p-6">
      {children}
    </div>
  );
}
