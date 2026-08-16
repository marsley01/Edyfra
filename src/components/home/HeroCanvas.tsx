"use client";
/* eslint-disable react-hooks/exhaustive-deps */

/**
 * HeroCanvas — Lively Three.js animated scene for the landing hero.
 *
 * What makes it pop:
 * - 45 Phong spheres with emissive glow (they actually LIGHT UP)
 * - 3 orbiting coloured PointLights that sweep around the scene
 * - Each sphere independently rotates on a random axis
 * - Scale breathing (spheres pulse in and out rhythmically)
 * - Starfield: 200 tiny white points scattered in the background
 * - Connection lines: thin lines link nearby spheres (constellation effect)
 * - Stronger, more dramatic mouse parallax
 * - Smooth camera Y bob (idle animation when mouse is still)
 * - Fog for depth — far spheres fade into the dark background
 * - All cleanup handled on unmount
 *
 * MUST be dynamically imported with `ssr: false`:
 *   const HeroCanvas = dynamic(() => import('./HeroCanvas'), { ssr: false });
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ── Constants ────────────────────────────────────────────────────────────────
const COLORS    = [0x7c3aed, 0xe8521b, 0x00c07a, 0xffd600, 0xff5dae];
const SPHERE_COUNT  = 45;
const STAR_COUNT    = 200;
const BG_COLOR      = 0x0f0527;
const FOG_COLOR     = 0x0f0527;
const MAX_LINK_DIST = 5;        // spheres closer than this get a connector line
const MAX_LINKS     = 60;       // cap total lines for performance

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    // Cap pixel ratio: 1 on low-end devices, 1.5 otherwise to protect GPU/RAM
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const renderer = new THREE.WebGLRenderer({
      antialias: dpr <= 1,   // disable AA on high-DPR screens (already sharp)
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(BG_COLOR, 1);
    renderer.shadowMap.enabled = false;

    const canvas = renderer.domElement;
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "0",
      willChange: "transform",  // hint compositor to keep canvas on its own layer
    });
    container.appendChild(canvas);

    // ── Scene + Fog ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.045); // exponential depth fade

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 14);

    // ── Ambient light ────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // ── Orbiting coloured point lights ───────────────────────────────────────
    const orbitLights = [
      { light: new THREE.PointLight(0x9b6bff, 6, 20), radius: 8, speed: 0.4, offset: 0 },
      { light: new THREE.PointLight(0xff5dae, 5, 18), radius: 7, speed: 0.28, offset: Math.PI * 0.66 },
      { light: new THREE.PointLight(0x00c07a, 4, 16), radius: 9, speed: 0.19, offset: Math.PI * 1.33 },
    ];
    for (const ol of orbitLights) scene.add(ol.light);

    // ── Starfield ─────────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPositions[i * 3]     = rand(-30, 30);
      starPositions[i * 3 + 1] = rand(-20, 20);
      starPositions[i * 3 + 2] = rand(-25, -8);  // push stars far back
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Spheres ──────────────────────────────────────────────────────────────
    type SphereData = {
      mesh: THREE.Mesh;
      phase: number;
      freq: number;
      freqX: number;
      rotAxis: THREE.Vector3;
      rotSpeed: number;
      baseScale: number;
      pulseFreq: number;
      pulseAmp: number;
    };

    const spheres: SphereData[] = [];

    for (let i = 0; i < SPHERE_COUNT; i++) {
      const radius  = rand(0.15, 1.6);
      const colHex  = COLORS[i % COLORS.length];
      const col     = new THREE.Color(colHex);
      const geometry = new THREE.SphereGeometry(radius, 28, 28);

      const material = new THREE.MeshPhongMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.18,   // subtle self-glow
        shininess: 55,
        transparent: true,
        opacity: rand(0.5, 0.82),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(rand(-13, 13), rand(-9, 9), rand(-7, 0));
      scene.add(mesh);

      spheres.push({
        mesh,
        phase:     rand(0, Math.PI * 2),
        freq:      rand(0.2, 0.55),
        freqX:     rand(0.08, 0.3),
        rotAxis:   new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
        rotSpeed:  rand(0.003, 0.018),
        baseScale: 1,
        pulseFreq: rand(0.3, 0.8),
        pulseAmp:  rand(0.04, 0.12),
      });
    }

    // ── Constellation lines ───────────────────────────────────────────────────
    // Build lines between sphere pairs that start close together
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x9b6bff,
      transparent: true,
      opacity: 0.18,
    });

    type LinkData = { line: THREE.Line; a: number; b: number };
    const links: LinkData[] = [];
    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();

    for (let a = 0; a < spheres.length && links.length < MAX_LINKS; a++) {
      for (let b = a + 1; b < spheres.length && links.length < MAX_LINKS; b++) {
        const dist = spheres[a].mesh.position.distanceTo(spheres[b].mesh.position);
        if (dist < MAX_LINK_DIST) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            spheres[a].mesh.position.clone(),
            spheres[b].mesh.position.clone(),
          ]);
          const line = new THREE.Line(lineGeo, lineMat);
          scene.add(line);
          links.push({ line, a, b });
        }
      }
    }

    // ── Mouse parallax — throttled via dirty flag ─────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let mouseDirty = false;
    const onMouseMove = (e: MouseEvent) => {
      // Only update the values; the loop reads them — no extra work per event
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseDirty = true;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // ── Resize ────────────────────────────────────────────────────────────────
    let resizePending = false;
    const onResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        resizePending = false;
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    // ── Visibility — pause RAF when hero scrolls off screen ─────────────────
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => { isVisible = entries[0].isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(container);

    // ── Animation loop ────────────────────────────────────────────────────────
    let rafId: number;
    let frameCount = 0;
    const clock = new THREE.Clock();
    const quat  = new THREE.Quaternion();

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      // ⚡ Skip rendering entirely when hero is off-screen
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      frameCount++;

      // Orbit the coloured lights around the scene
      for (const ol of orbitLights) {
        const angle = t * ol.speed + ol.offset;
        ol.light.position.set(
          Math.cos(angle) * ol.radius,
          Math.sin(angle * 0.7) * 4,
          Math.sin(angle) * ol.radius * 0.5
        );
      }

      // Animate spheres
      for (const s of spheres) {
        const { mesh, phase, freq, freqX, rotAxis, rotSpeed, pulseFreq, pulseAmp } = s;
        mesh.position.y += Math.sin(t * freq  + phase) * 0.007;
        mesh.position.x += Math.sin(t * freqX + phase) * 0.003;
        quat.setFromAxisAngle(rotAxis, rotSpeed);
        mesh.quaternion.multiply(quat);
        const pulse = 1 + Math.sin(t * pulseFreq + phase) * pulseAmp;
        mesh.scale.setScalar(pulse);
      }

      // ⚡ Update constellation lines only every 3 frames — cuts geometry
      //   attribute uploads by 66% with no visible difference
      if (frameCount % 3 === 0) {
        for (const { line, a, b } of links) {
          posA.copy(spheres[a].mesh.position);
          posB.copy(spheres[b].mesh.position);
          const positions = (line.geometry as THREE.BufferGeometry)
            .attributes.position as THREE.BufferAttribute;
          positions.setXYZ(0, posA.x, posA.y, posA.z);
          positions.setXYZ(1, posB.x, posB.y, posB.z);
          positions.needsUpdate = true;
          const d = posA.distanceTo(posB);
          (line.material as THREE.LineBasicMaterial).opacity =
            Math.max(0, (MAX_LINK_DIST - d) / MAX_LINK_DIST) * 0.3;
        }
      }

      // Camera: mouse parallax + gentle idle Y bob
      // Only recalculate target when mouse actually moved
      const targetX = mouseDirty ? mouseX * 1.2 : camera.position.x;
      const targetY = -mouseY * 0.8 + Math.sin(t * 0.25) * 0.3;
      camera.position.x += (targetX  - camera.position.x) * 0.025;
      camera.position.y += (targetY  - camera.position.y) * 0.025;
      mouseDirty = false;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);

      for (const { mesh } of spheres) {
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshPhongMaterial).dispose();
      }
      for (const { line } of links) {
        line.geometry.dispose();
      }
      starGeo.dispose();
      starMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: 0,
      }}
    />
  );
}
