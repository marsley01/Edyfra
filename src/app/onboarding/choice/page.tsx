"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { showError } from "@/lib/toast";

export default function RoleChoicePage() {
  const router = useRouter();
  // `checking` covers the redirect decision on load; `loading` covers saving
  // the choice. Previously one flag did both and the UI rendered neither, so
  // the cards were clickable while the page was still deciding where to send
  // the user.
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<"STUDENT" | "TUTOR" | null>(null);

  useEffect(() => {
    (async () => {
      try {
      // No browser-side "am I signed in?" check here. The proxy already sends
      // signed-out visitors to /auth/login before this page renders, and the
      // server is the only reliable judge: when the browser client could not
      // read the session cookie it redirected to /auth/login, the proxy sent a
      // signed-in user from there to /dashboard, and the dashboard sent them
      // back here — an endless loop that made onboarding unreachable. If the
      // session really is gone, updateUserRole() reports it on Continue.
      const { getUserData } = await import("@/app/actions/user");
      const profile = await getUserData();

      if (profile) {
        // Only bounce out of onboarding once there is a profile row to render
        // against. Previously a TUTOR-role user with no profile was sent to
        // /dashboard, whose layout sent them straight back here — an infinite
        // full-page redirect loop that locked them out of the entire app.
        const hasProfileRow = Boolean(profile.studentProfile || profile.tutorProfile);
        if (hasProfileRow) {
          // Picking a role creates a stub profile row, so someone who chose a
          // role and then abandoned the form used to be bounced to /dashboard
          // from here forever — a tutor could never get back to the KYC form
          // and so never actually applied. Resume the unfinished wizard instead.
          const { getMyProfileStatus } = await import("@/app/actions/profile-status");
          const status = await getMyProfileStatus();
          const missing = new Set(status?.missing ?? []);
          if (status?.kind === "TUTOR" && missing.has("kycDocuments")) {
            window.location.href = "/onboarding/tutor";
            return;
          }
          if (
            status?.kind === "STUDENT" &&
            (missing.has("subjects") || missing.has("weakTopics") || missing.has("studyStyle"))
          ) {
            window.location.href = "/onboarding/student";
            return;
          }
          window.location.href = "/dashboard";
          return;
        }
      }
      } catch (error) {
        console.error("[onboarding/choice] status check failed:", error);
      }
      setChecking(false);
    })();
  }, [router]);

  const selectRole = async (role: "STUDENT" | "TUTOR") => {
    setLoading(true);
    try {
      const { updateUserRole } = await import("@/app/actions/user");
      const result = await updateUserRole(role);
      
      if (result.success) {
        // Keep the spinner up while the next page loads.
        window.location.href = role === "TUTOR" ? "/onboarding/tutor" : "/onboarding/student";
        return;
      } else {
        showError({ title: "Selection failed", cause: result.error, fix: "Try again, or pick a different option." });
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Selection failed:", error);
      showError({ title: "Something went wrong", cause: error.message || "We couldn't save your choice.", fix: "Try again, or refresh the page." });
      setLoading(false);
    }
  };

  const options = [
    {
      role: "STUDENT" as const,
      icon: Users,
      title: "I'm a student",
      description: "Find tutors and study partners, get notes and past papers, and track how you're doing.",
    },
    {
      role: "TUTOR" as const,
      icon: GraduationCap,
      title: "I'm a tutor",
      description: "Teach subjects you know, set your own schedule and rates, and get paid through M-Pesa. Tutors are verified before going live.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-2xl space-y-10">
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src="/image.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-xl font-black tracking-tight text-foreground">Edyfra</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            How will you use Edyfra?
          </h1>
          <p className="text-muted-foreground">
            Pick one to set up your account.
          </p>
        </div>

        {checking ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading">
            {[0, 1].map((i) => (
              <div key={i} className="h-44 rounded-2xl border border-border bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
            {options.map(({ role, icon: Icon, title, description }) => {
              const selected = choice === role;
              return (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={loading}
                  onClick={() => setChoice(role)}
                  className={cn(
                    "text-left rounded-2xl border-2 p-6 transition-colors disabled:opacity-60",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2",
                        selected ? "border-primary bg-primary" : "border-border"
                      )}
                      aria-hidden="true"
                    >
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-foreground">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </button>
              );
            })}
          </div>
        )}

        <Button
          onClick={() => choice && selectRole(choice)}
          disabled={!choice || loading || checking}
          className="w-full h-14 rounded-full text-sm font-bold"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
