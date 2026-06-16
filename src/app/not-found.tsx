import Link from "next/link";
import { Compass, ArrowLeft, MessageCircle, Search, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden bg-background">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-10 text-center">
        {/* Floating Icon */}
        <div className="mx-auto relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/80 to-primary text-white shadow-2xl border border-white/10 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Compass className="h-10 w-10" />
            <Sparkles className="absolute -top-3 -right-3 h-6 w-6 text-primary animate-bounce" />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-primary drop-shadow-sm">
            Error 404
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[1.1]">
            Lost in the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Stacks.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-lg mx-auto">
            The page you're looking for has been moved, deleted, or possibly never existed. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="group flex items-center justify-center gap-3 h-14 rounded-full bg-primary text-white hover:bg-primary/90 px-8 font-black text-sm tracking-widest uppercase shadow-xl hover:shadow-primary/25 transition-all hover:-translate-y-1 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Return Home
          </Link>
          <Link
            href="/dashboard/search"
            className="group flex items-center justify-center gap-3 h-14 rounded-full border-2 border-border bg-background/50 backdrop-blur-md hover:border-primary/30 hover:bg-secondary/50 px-8 font-black text-sm tracking-widest uppercase text-foreground transition-all hover:-translate-y-1 active:scale-95"
          >
            <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
            Search Library
          </Link>
        </div>

        <div className="pt-10">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Report a broken link
          </Link>
        </div>
      </div>
    </div>
  );
}
