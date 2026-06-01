"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingEntry() {
  const router = useRouter();

  useEffect(() => {
    router.push("/onboarding/choice");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
