"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Admin Panel Error</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Something broke</h1>
        <p className="text-sm text-white/40 font-mono break-all leading-relaxed">
          {error.message || "An unexpected error occurred while rendering the admin dashboard."}
        </p>
        {error.digest && (
          <p className="text-[10px] text-white/20 font-mono">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
