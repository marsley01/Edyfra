"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";

const MilkyWave = dynamic(
  () => import("@/components/three/MilkyWave").then((m) => m.MilkyWave),
  { ssr: false }
);

export function HomeCTA() {
  return (
    <section className="relative flex h-screen max-h-[900px] min-h-[600px] items-center justify-center overflow-hidden">
      {/* ── Image Background ── */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/image.png"
          alt="Study platform background"
          fill
          className="object-cover opacity-80"
          sizes="100vw"
        />
      </div>
      <MilkyWave className="absolute inset-0 z-[1] opacity-90" />

      {/* ── Gradient Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-deep-void/90 via-deep-void/40 to-deep-void/20 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-deep-void/50 via-transparent to-deep-void/30 z-10" />

      {/* ── Subtle Grid Pattern ── */}
      <div
        className="absolute inset-0 z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Floating Decorative Badges ── */}
      <div className="absolute top-[12%] right-[8%] z-20 hidden lg:flex items-center gap-2.5 bg-deep-void/85 border border-glass-stroke rounded-xl px-4 py-2.5 shadow-2xl">
        <div className="w-8 h-8 rounded-xl bg-emerald-energy/20 flex items-center justify-center">
          <Play className="h-4 w-4 text-emerald-energy" />
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">Active Learning</p>
          <p className="text-sm font-bold text-white">1-on-1 sessions</p>
        </div>
      </div>

      <div className="absolute bottom-[18%] left-[6%] z-20 hidden lg:flex items-center gap-2.5 bg-deep-void/85 border border-glass-stroke rounded-xl px-4 py-2.5 shadow-2xl">
        <div className="flex -space-x-2">
          {["#FF9500", "#FF9500", "#4edea3", "#B8A6E0"].map((c, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-black/40 flex items-center justify-center text-[7px] text-white font-bold"
              style={{ backgroundColor: c }}
            >
              {["M", "K", "A", "J"][i]}
            </div>
          ))}
        </div>
        <div className="text-left">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">Verified Support</p>
          <p className="text-sm font-bold text-white">Expert tutors</p>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-5">
        <div className="bg-deep-void/85 border border-glass-stroke rounded-xl p-8 sm:p-12 md:p-16 shadow-[0_0_80px_-20px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="space-y-8 text-center">
            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-on-surface">
              Your study
              <br />
              <span className="bg-gradient-to-r from-brand-orange to-[#ffc107] bg-clip-text text-transparent">
                starts now.
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-on-surface-variant font-medium max-w-xl mx-auto leading-relaxed">
              Mash AI, verified tutors, and a community of Kenyan scholars — all in one place.
              Free to start, built for steady progress.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/signup">
                <Button className="group h-14 px-10 rounded-full bg-brand-orange text-deep-void hover:bg-brand-orange-dark primary-glow-hover transition-smooth font-bold text-base flex items-center gap-2 active:scale-95">
                  Create My Study Space
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="h-14 px-10 rounded-full border-glass-stroke bg-transparent text-on-surface hover:bg-glass-fill hover:text-brand-orange hover:border-brand-orange/50 transition-smooth font-bold text-base flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  See The Mission
                </Button>
              </Link>
            </div>

            {/* Trust indicator */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {["#FF9500", "#FF9500", "#4edea3", "#B8A6E0", "#e68600"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-black/30 flex items-center justify-center text-[8px] text-white font-bold shadow-lg"
                    style={{ backgroundColor: c }}
                  >
                    {["A", "B", "C", "D", "E"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant">
                Join students studying with verified tutors
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom fade for section transition ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
    </section>
  );
}
