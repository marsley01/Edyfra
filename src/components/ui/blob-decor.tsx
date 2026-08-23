import { cn } from "@/lib/utils";

type DecorVariant = "blobs" | "geometric" | "mesh" | "mixed";

interface BlobDecorProps {
  /** Which decoration style to render */
  variant?: DecorVariant;
  className?: string;
}

/**
 * Solid, colorful decorative backgrounds — zero blur, zero glassmorphism.
 * Big organic shapes in solid brand colors that slowly drift and morph.
 *
 *  - "blobs":     large morphing organic shapes
 *  - "geometric": soft circles, rings, squares and plus-signs
 *  - "mesh":      layered radial-gradient orbs (mesh gradient feel)
 *  - "mixed":     a bit of everything (default for hero sections)
 */
export function BlobDecor({ variant = "mixed", className }: BlobDecorProps) {
  const base = cn("pointer-events-none absolute inset-0 overflow-hidden", className);

  if (variant === "mesh") {
    return (
      <div aria-hidden className={base}>
        <div className="blob-anim-a absolute -top-28 -left-20 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,#FF9500_0%,rgba(255,149,0,0.35)_55%,transparent_84%)] opacity-70 dark:opacity-60 [border-radius:63%_37%_54%_46%/55%_48%_52%_45%]" />
        <div className="blob-anim-b absolute top-1/4 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#E8521B_0%,rgba(232,82,27,0.3)_55%,transparent_84%)] opacity-65 dark:opacity-55 [border-radius:40%_60%_58%_42%/44%_68%_32%_56%]" />
        <div className="blob-anim-c absolute -bottom-28 left-1/4 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,#06B6D4_0%,rgba(6,182,212,0.3)_55%,transparent_84%)] opacity-60 dark:opacity-50 [border-radius:52%_48%_65%_35%/48%_58%_42%_52%]" />
        <div className="blob-anim-b absolute top-10 right-1/3 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,#F5C842_0%,rgba(245,200,66,0.25)_55%,transparent_84%)] opacity-55 dark:opacity-45 [border-radius:67%_33%_47%_53%/49%_57%_43%_51%]" />
        <div className="blob-anim-c absolute bottom-1/4 right-[8%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,#7C3AED_0%,rgba(124,58,237,0.28)_55%,transparent_84%)] opacity-55 dark:opacity-45 [border-radius:36%_64%_54%_46%/60%_38%_62%_40%]" />
      </div>
    );
  }

  if (variant === "geometric") {
    return (
      <div aria-hidden className={base}>
        <div className="absolute top-6 left-[12%] h-16 w-16 rounded-2xl bg-primary/25 rotate-12" />
        <div className="absolute bottom-10 right-[18%] h-12 w-12 rounded-full bg-coral/35" />
        <div className="absolute top-1/2 left-[4%] h-28 w-28 rounded-full border-8 border-brand-orange/30" />
        <div className="absolute bottom-6 left-[38%] h-10 w-10 rounded-lg bg-yellow-400/45 rotate-45" />
        <div className="absolute top-[14%] right-[30%] h-14 w-14 rounded-xl bg-emerald-400/30 -rotate-6" />
        <div className="absolute top-[18%] right-[8%] text-coral/50 text-4xl font-black select-none">+</div>
        <div className="absolute bottom-[22%] right-[42%] text-primary/40 text-5xl font-black select-none">+</div>
      </div>
    );
  }

  if (variant === "blobs") {
    return (
      <div aria-hidden className={base}>
        {/* Amber — top-left, largest */}
        <div className="blob-anim-a blob-morph absolute -top-32 -left-24 h-[34rem] w-[34rem] bg-[radial-gradient(ellipse_at_center,#FF9500_0%,#E8521B_45%,transparent_84%)] opacity-75 dark:opacity-60" />
        {/* Violet — top-right */}
        <div className="blob-anim-b blob-morph absolute -top-24 -right-28 h-[32rem] w-[32rem] bg-[radial-gradient(ellipse_at_center,#7C3AED_0%,#4C1D95_50%,transparent_85%)] opacity-60 dark:opacity-50" />
        {/* Coral — bottom-right */}
        <div className="blob-anim-c blob-morph absolute -bottom-28 right-[4%] h-[26rem] w-[26rem] bg-[radial-gradient(ellipse_at_center,#E8521B_0%,#B93A10_52%,transparent_85%)] opacity-60 dark:opacity-50" />
        {/* Indigo — bottom-left */}
        <div className="blob-anim-b blob-morph absolute -bottom-24 -left-20 h-[28rem] w-[28rem] bg-[radial-gradient(ellipse_at_center,#2563EB_0%,#1E3A8A_55%,transparent_85%)] opacity-55 dark:opacity-45" />
        {/* Yellow — small bright accent */}
        <div className="blob-anim-c blob-morph absolute top-[30%] left-[26%] h-72 w-72 bg-[radial-gradient(ellipse_at_center,#F5C842_0%,#D69E05_50%,transparent_84%)] opacity-50 dark:opacity-40" />
        {/* Emerald — small accent */}
        <div className="blob-anim-a blob-morph absolute bottom-[28%] right-[30%] h-56 w-56 bg-[radial-gradient(ellipse_at_center,#10B981_0%,#047857_52%,transparent_84%)] opacity-45 dark:opacity-35" />
      </div>
    );
  }

  // mixed — hero treatment
  return (
    <div aria-hidden className={base}>
      {/* Organic blobs */}
      <div className="blob-anim-a blob-morph absolute -top-36 -left-28 h-[36rem] w-[36rem] bg-[radial-gradient(ellipse_at_center,#FF9500_0%,#E8521B_48%,transparent_84%)] opacity-80 dark:opacity-65" />
      <div className="blob-anim-b blob-morph absolute -bottom-40 -right-28 h-[38rem] w-[38rem] bg-[radial-gradient(ellipse_at_center,#06B6D4_0%,#4C1D95_55%,transparent_85%)] opacity-65 dark:opacity-55" />
      <div className="blob-anim-c blob-morph absolute top-[36%] -left-16 h-80 w-80 bg-[radial-gradient(ellipse_at_center,#EC4899_0%,#BE185D_52%,transparent_85%)] opacity-55 dark:opacity-45" />

      {/* Soft geometric accents */}
      <div className="absolute top-10 right-[22%] h-14 w-14 rounded-xl bg-yellow-400/40 rotate-12" />
      <div className="absolute bottom-14 left-[26%] h-11 w-11 rounded-full bg-emerald-400/40" />
      <div className="absolute top-[30%] right-[6%] h-24 w-24 rounded-full border-8 border-coral/30" />
      <div className="absolute bottom-[30%] right-[38%] text-brand-orange/45 text-5xl font-black select-none">+</div>
    </div>
  );
}
