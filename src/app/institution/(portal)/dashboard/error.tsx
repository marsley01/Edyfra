"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Keeps the portal sidebar on screen when a dashboard page fails, instead of
// falling through to the full-screen institution error page.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const forbidden = /forbidden/i.test(error.message);
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50/40 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <h2 className="mt-3 text-lg font-black text-gray-900">
          {forbidden ? "You don't have access to this" : "This page couldn't load"}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {forbidden
            ? "Only active admins of this institution can view it."
            : "Something went wrong while loading your school's data. Your data is safe."}
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-gray-400">Ref: {error.digest}</p>}
        {!forbidden && (
          <Button onClick={() => retry()} className="mt-5">
            <RotateCcw className="mr-2 h-4 w-4" /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}
