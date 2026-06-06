import Link from "next/link";
import { Compass, ArrowLeft, MessageCircle, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Compass className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            404 · Lost in the stacks
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tightest text-foreground">
            We couldn&apos;t find that page.
          </h1>
        </div>

        <div className="space-y-4 text-left rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
          <Row
            label="What happened"
            value="The page you were looking for isn't here."
          />
          <Row
            label="Why"
            value="The link might be old, the page may have moved, or you typed the address slightly off."
          />
          <Row
            label="What to try"
            value="Head back home, search for what you needed, or tell us where you got the link from so we can fix it."
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 font-black text-xs tracking-widest uppercase shadow-xl transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <Link
            href="/dashboard/search"
            className="inline-flex items-center gap-2 h-12 rounded-full border-2 border-border hover:border-foreground/30 px-6 font-black text-xs tracking-widest uppercase text-foreground transition-all"
          >
            <Search className="h-4 w-4" />
            Try a search
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Tell us about it
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-[110px] text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-0.5">
        {label}
      </span>
      <span className="text-foreground/90 leading-relaxed">{value}</span>
    </div>
  );
}
