"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * MilkyWave — a slowly rotating spiral galaxy of additive-blended star
 * points, ported from the galaxy-portfolio "milky wave" blueprint.
 *
 * Colors run brand-orange at the core → coral → violet/cyan at the arms.
 * Drop it as an absolutely-positioned background layer inside a CTA:
 *
 *   <div className="relative overflow-hidden">
 *     <MilkyWave className="absolute inset-0" />
 *     ...content
 *   </div>
 */

interface MilkyWaveProps {
  className?: string;
  /** Point count — lower on small screens automatically when omitted */
  count?: number;
}

export function MilkyWave({ className, count }: MilkyWaveProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isSmall = wrap.clientWidth < 640;
    const STAR_COUNT = count ?? (isSmall ? 3500 : 8000);

    // ── Soft round sprite so points glow like stars (no external texture) ──
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const starTexture = new THREE.CanvasTexture(spriteCanvas);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 5.5, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

    const sizeTo = () => {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    sizeTo();

    // ── Spiral galaxy point cloud (the "milky wave") ──
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);

    const core = new THREE.Color("#FF9500"); // brand orange
    const mid = new THREE.Color("#E8521B");  // coral
    const armA = new THREE.Color("#7C3AED"); // violet
    const armB = new THREE.Color("#06B6D4"); // cyan
    const tmp = new THREE.Color();

    const BRANCHES = 3;
    const RADIUS = 9;
    const SPIN = 1.35;
    const RANDOMNESS = 0.28;
    const RANDOM_POWER = 2.6;

    let ptr = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      // denser toward the core
      const r = Math.pow(Math.random(), 1.6) * RADIUS;
      const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
      const spinAngle = r * SPIN;

      const randomnessX =
        Math.pow(Math.random(), RANDOM_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;
      const randomnessY =
        Math.pow(Math.random(), RANDOM_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r * 0.45;
      const randomnessZ =
        Math.pow(Math.random(), RANDOM_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;

      positions[ptr] = Math.cos(branchAngle + spinAngle) * r + randomnessX;
      positions[ptr + 1] = randomnessY;
      positions[ptr + 2] = Math.sin(branchAngle + spinAngle) * r + randomnessZ;

      // warm core → coral → alternating violet/cyan arms
      const t = Math.min(1, r / RADIUS);
      if (t < 0.35) {
        tmp.copy(core).lerp(mid, t / 0.35);
      } else {
        tmp.copy(mid).lerp(i % 2 === 0 ? armA : armB, (t - 0.35) / 0.65);
      }
      colors[ptr] = tmp.r;
      colors[ptr + 1] = tmp.g;
      colors[ptr + 2] = tmp.b;
      ptr += 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.075,
      map: starTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const galaxy = new THREE.Points(geometry, material);
    // Tilt so the wave sweeps across the section like the reference
    galaxy.rotation.x = -1.05;
    scene.add(galaxy);

    // ── Bright core glow sprite ──
    const coreSpriteMat = new THREE.SpriteMaterial({
      map: starTexture,
      color: 0xffb347,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });
    const coreSprite = new THREE.Sprite(coreSpriteMat);
    coreSprite.scale.set(3.2, 3.2, 1);
    scene.add(coreSprite);

    // ── Animate: slow rotation + gentle wave breathing ──
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const animate = () => {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      galaxy.rotation.y = t * 0.06;
      const breathe = 1 + Math.sin(t * 0.5) * 0.03;
      galaxy.scale.set(breathe, 1, breathe);
      coreSprite.scale.setScalar(3.2 + Math.sin(t * 0.9) * 0.25);
      renderer.render(scene, camera);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !running) {
            running = true;
            clock.start();
            animate();
          } else if (!entry.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(wrap);

    const onResize = () => sizeTo();
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      starTexture.dispose();
      coreSpriteMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) wrap.removeChild(renderer.domElement);
    };
  }, [count]);

  return <div ref={wrapRef} className={className} aria-hidden="true" />;
}
