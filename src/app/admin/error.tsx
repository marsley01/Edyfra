"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter text-white">System Malfunction</h2>
          <p className="text-muted-foreground text-sm font-medium">
            An unexpected error occurred in the Admin Dashboard.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 p-4 bg-white/5 rounded-xl text-left text-xs text-muted-foreground overflow-auto border border-white/5">
              {error.message}
            </pre>
          )}
        </div>
        <button
          onClick={() => reset()}
          className="w-full h-12 rounded-2xl bg-primary text-white font-bold tracking-widest uppercase text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          Reinitialize System
        </button>
        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">
          If the problem persists, check server logs or database connectivity.
        </p>
      </div>
    </div>
  );
}
