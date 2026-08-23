import { cn } from "@/lib/utils";

/**
 * Small solid blob accents designed to live INSIDE cards and sections.
 * Drop into any `relative overflow-hidden` container — they hug the top-right
 * corner and stay subtle enough to sit behind text.
 *
 * <div className="relative overflow-hidden ...">
 *   <MiniBlobs />
 *   ...content
 * </div>
 */

const PALETTES: Array<{ a: string; b: string; c: string }> = [
  // brand orange + coral
  {
    a: "radial-gradient(circle at center, #FF9500 0%, #E8521B 55%, transparent 82%)",
    b: "radial-gradient(circle at center, #F5C842 0%, #E8521B 60%, transparent 80%)",
    c: "#E8521B",
  },
  // cyan + indigo
  {
    a: "radial-gradient(circle at center, #06B6D4 0%, #4C1D95 55%, transparent 82%)",
    b: "radial-gradient(circle at center, #38BDF8 0%, #2563EB 60%, transparent 80%)",
    c: "#2563EB",
  },
  // violet + pink
  {
    a: "radial-gradient(circle at center, #A855F7 0%, #DB2777 55%, transparent 82%)",
    b: "radial-gradient(circle at center, #F472B6 0%, #A855F7 60%, transparent 80%)",
    c: "#DB2777",
  },
  // emerald + teal
  {
    a: "radial-gradient(circle at center, #10B981 0%, #0F766E 55%, transparent 82%)",
    b: "radial-gradient(circle at center, #34D399 0%, #0D9488 60%, transparent 80%)",
    c: "#0F766E",
  },
];

export function MiniBlobs({
  className,
  palette = 0,
}: {
  className?: string;
  /** 0 = orange/coral, 1 = cyan/indigo, 2 = violet/pink, 3 = emerald/teal */
  palette?: 0 | 1 | 2 | 3;
}) {
  const p = PALETTES[palette % PALETTES.length];

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* main organic blob — top-right corner */}
      <div
        className="blob-anim-a absolute -top-8 -right-8 h-28 w-28 opacity-50"
        style={{ background: p.a, borderRadius: "63% 37% 54% 46% / 55% 48% 52% 45%" }}
      />
      {/* small companion blob — bottom-left */}
      <div
        className="blob-anim-c absolute -bottom-5 -left-5 h-16 w-16 opacity-35"
        style={{ background: p.b, borderRadius: "38% 62% 58% 42% / 44% 68% 32% 56%" }}
      />
      {/* tiny solid dot accent */}
      <div
        className="absolute top-4 right-16 h-3 w-3 rounded-full opacity-45"
        style={{ backgroundColor: p.c }}
      />
    </div>
  );
}
