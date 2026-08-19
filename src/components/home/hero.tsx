"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

// Import HeroCanvas with SSR disabled as it relies on window and WebGL
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false, loading: () => null });

// Three.js is heavy: mount the canvas only after the browser is idle so the
// hero text paints first (keeps the three.js chunk out of the LCP critical path).
function DeferredHeroCanvas() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.requestIdleCallback !== "function") {
      const t = window.setTimeout(() => setReady(true), 300);
      return () => window.clearTimeout(t);
    }
    const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }, []);

  return ready ? <HeroCanvas /> : null;
}

export function HomeHero() {
  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";

  return (
    <section className="relative min-h-screen w-full bg-[#0F0527] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Three.js interactive canvas behind content — deferred until idle */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DeferredHeroCanvas />
      </div>

      {/* Hero text overlay */}
      <div className="relative z-10 max-w-5xl flex flex-col items-center justify-center space-y-10 pt-24 pb-16">
        {/* Heading */}
        <div className="space-y-6">
          <h1 className="text-white font-black leading-[0.9] tracking-tightest text-6xl md:text-8xl lg:text-[100px]">
            Education, <br />
            <span className="text-violet">reimagined.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-[#B8A6E0] font-medium max-w-2xl mx-auto leading-relaxed">
            Your personal study base for school, revision, mentorship, and momentum. Mash AI, verified tutors, and real students help you move from stuck to ready.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="h-16 px-12 rounded-full bg-white text-[#0f0527] hover:bg-white/90 hover:scale-[1.02] font-black text-xs tracking-widest uppercase shadow-2xl transition-all duration-120 cursor-pointer border-none inline-flex items-center justify-center"
          >
            Start Your Study Plan
          </Link>
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-16 px-10 rounded-full border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-black text-xs tracking-widest uppercase transition-all duration-120 flex items-center gap-3 cursor-pointer bg-transparent"
          >
            <MessageCircle className="h-5 w-5" />
            Join Student Updates
          </a>
        </div>
      </div>
    </section>
  );
}