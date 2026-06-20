"use client";

import { useEffect, useRef } from "react";

/**
 * A fullscreen canvas that plays a celebration: fireworks + falling ribbons.
 * No external dependency — pure HTML5 Canvas. Honors `prefers-reduced-motion`.
 *
 * Usage:
 *   <Fireworks active intensity="high" durationMs={5000} />
 *     - `active` toggles playback
 *     - `intensity` = "low" | "medium" | "high"
 *     - `durationMs` = total time before auto-cleanup
 */
export function Fireworks({
  active,
  intensity = "high",
  durationMs = 6000,
  onComplete,
}: {
  active: boolean;
  intensity?: "low" | "medium" | "high";
  durationMs?: number;
  onComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ribbonsRef = useRef<Ribbon[]>([]);
  const startRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced motion
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onComplete?.();
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      "#FFD700", // gold
      "#FF6B6B", // coral
      "#06B6D4", // cyan
      "#8B5CF6", // violet
      "#F472B6", // pink
      "#34D399", // emerald
      "#FB923C", // orange
      "#60A5FA", // blue
    ];

    const intensityToCount = {
      low: 1,
      medium: 2,
      high: 4,
    } as const;

    const intensityToRibbons = {
      low: 8,
      medium: 25,
      high: 50,
    } as const;

    const startTime = performance.now();
    startRef.current = startTime;
    lastSpawnRef.current = startTime;

    // Initial ribbon shower
    for (let i = 0; i < intensityToRibbons[intensity]; i++) {
      ribbonsRef.current.push(makeRibbon(colors));
    }

    const tick = (now: number) => {
      // Slight trail fade for smoothness
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Spawn new fireworks periodically
      const elapsed = now - startTime;
      const spawnInterval = intensity === "high" ? 280 : intensity === "medium" ? 480 : 700;
      if (now - lastSpawnRef.current > spawnInterval && elapsed < durationMs * 0.7) {
        for (let i = 0; i < intensityToCount[intensity]; i++) {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight * 0.55;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const count = 60 + Math.floor(Math.random() * 50);
          for (let p = 0; p < count; p++) {
            particlesRef.current.push(makeParticle(x, y, color));
          }
        }
        lastSpawnRef.current = now;
      }

      // Update + draw particles
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.045; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0 || p.y > window.innerHeight + 20) {
          ps.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.rgb}, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // Glitter
        if (Math.random() < 0.2) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.6})`;
          ctx.arc(p.x + (Math.random() - 0.5) * 4, p.y + (Math.random() - 0.5) * 4, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update + draw ribbons
      const rs = ribbonsRef.current;
      for (let i = rs.length - 1; i >= 0; i--) {
        const r = rs[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.04;
        r.rot += r.vrot;
        r.swing += 0.04;
        r.life -= 1;
        if (r.life <= 0 || r.y > window.innerHeight + 60) {
          rs.splice(i, 1);
          // Re-spawn ribbon if still in celebration
          if (elapsed < durationMs * 0.9) {
            rs.push(makeRibbon(colors));
          }
          continue;
        }
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(Math.sin(r.swing) * 0.4 + r.rot);
        const alpha = Math.min(1, r.life / 60);
        ctx.fillStyle = `rgba(${r.rgb}, ${alpha})`;
        ctx.fillRect(-r.w / 2, 0, r.w, r.h);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
        ctx.fillRect(-r.w / 2, 0, r.w, 3);
        ctx.restore();
      }

      // Auto-stop
      if (elapsed >= durationMs && ps.length === 0 && rs.length === 0) {
        cleanup();
        onComplete?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", resize);
      // Clear canvas
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cleanup();
    };
  }, [active, intensity, durationMs, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  );
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  rgb: string;
};

type Ribbon = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  swing: number;
  life: number;
  rgb: string;
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function makeParticle(x: number, y: number, color: string): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 6;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 1.5 + Math.random() * 2.5,
    life: 70 + Math.random() * 40,
    maxLife: 100,
    alpha: 1,
    rgb: hexToRgb(color),
  };
}

function makeRibbon(colors: string[]): Ribbon {
  const color = colors[Math.floor(Math.random() * colors.length)];
  return {
    x: Math.random() * window.innerWidth,
    y: -40 - Math.random() * 60,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 1 + Math.random() * 1.2,
    w: 6 + Math.random() * 6,
    h: 30 + Math.random() * 30,
    rot: 0,
    vrot: (Math.random() - 0.5) * 0.04,
    swing: Math.random() * Math.PI * 2,
    life: 240 + Math.random() * 120,
    rgb: hexToRgb(color),
  };
}
