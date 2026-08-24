"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Rotating 3D subject constellation — nodes float in a sphere, labels track
 * them in screen space, and random subjects "light up" in brand orange every
 * few seconds. Ported from the Edyfra blob-preview reference.
 */

const SUBJECTS = [
  // Secondary / KCSE
  "Mathematics", "Biology", "Physics", "Chemistry",
  "English", "Kiswahili", "History", "Geography",
  "Business Studies", "Computer Studies", "Agriculture", "RE",
  // Campus / university
  "Calculus", "Economics", "Accounting", "Computer Science",
  "Data Science", "Law", "Medicine", "Nursing",
  "Engineering", "Architecture", "Psychology", "Actuarial Sci.",
];

const DARK_BASE_COLOR = new THREE.Color(0x4A3A8A);
const LIGHT_BASE_COLOR = new THREE.Color(0xB9AEE6);
const ACTIVE_COLOR = new THREE.Color(0xFF9500);
const LINE_BASE = 0x4A3A8A;

export function SubjectGraph({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 500);
    camera.position.set(-2, 0, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    const labelLayer = document.createElement("div");
    Object.assign(labelLayer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    wrap.appendChild(labelLayer);

    const sizeTo = () => {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      return { w, h };
    };
    let { w, h } = sizeTo();

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const keyLight = new THREE.DirectionalLight(0xFF9500, 1.0);
    keyLight.position.set(5, 10, 8);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x4A3A8A, 1.6, 70);
    fillLight.position.set(-10, -5, -4);
    scene.add(fillLight);

    // Fibonacci sphere layout
    const PHI = Math.PI * (3 - Math.sqrt(5));
    const RADIUS = Math.min(10.5, Math.max(7.2, w / 90));
    const base: THREE.Vector3[] = SUBJECTS.map((_, i) => {
      const y = 1 - (i / (SUBJECTS.length - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = PHI * i;
      return new THREE.Vector3(Math.cos(theta) * r * RADIUS, y * RADIUS * 0.85, Math.sin(theta) * r * RADIUS);
    });

    const nodeGroup = new THREE.Group();
    const lineGroup = new THREE.Group();
    scene.add(nodeGroup, lineGroup);

    const nodes = SUBJECTS.map((_, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 22, 22),
        new THREE.MeshStandardMaterial({
          color: DARK_BASE_COLOR.clone(),
          emissive: new THREE.Color(0x1A1240),
          emissiveIntensity: 0.4,
          roughness: 0.22,
          metalness: 0.2,
        })
      );
      mesh.position.copy(base[i]);
      mesh.userData = { fp: Math.random() * Math.PI * 2, fs: 0.42 + Math.random() * 0.28, dp: Math.random() * Math.PI * 2 };
      nodeGroup.add(mesh);
      return mesh;
    });

    // Cycle-highlighted subjects (shared with the theme handler)
    const active = new Set<number>();
    const isDark = () => document.documentElement.classList.contains("dark");

    // Theme-aware node materials — softer pastel spheres in light mode
    const refreshMaterials = () => {
      const dark = isDark();
      const baseColor = dark ? DARK_BASE_COLOR : LIGHT_BASE_COLOR;
      nodes.forEach((mesh, i) => {
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (!active.has(i)) {
          m.color.copy(baseColor);
          m.emissive.set(dark ? 0x1A1240 : 0xE8E4F5);
          m.emissiveIntensity = dark ? 0.4 : 0.25;
        }
      });
      connections.forEach(({ mat }) => {
        mat.opacity = dark ? 0.25 : 0.14;
      });
    };

    // Apply theme to labels + materials; re-runs when the site theme toggles
    const applyTheme = () => {
      const dark = isDark();
      labels.forEach((el) => {
        el.style.background = dark ? "rgba(15,5,39,0.82)" : "rgba(255,255,255,0.9)";
        el.style.border = dark ? "1px solid rgba(255,149,0,0.18)" : "1px solid rgba(15,5,39,0.10)";
        el.style.color = dark ? "#A09CB8" : "#5B5675";
        el.style.boxShadow = dark ? "none" : "0 2px 8px rgba(15,5,39,0.08)";
      });
      active.forEach((i) => {
        labels[i].style.color = "#FF9500";
        labels[i].style.borderColor = "rgba(255,149,0,0.55)";
      });
      refreshMaterials();
    };

    const labels = SUBJECTS.map((s) => {
      const el = document.createElement("div");
      el.textContent = s;
      Object.assign(el.style, {
        position: "absolute",
        left: "0",
        top: "0",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: "10px",
        fontWeight: "600",
        color: "#A09CB8",
        background: "rgba(15,5,39,0.82)",
        border: "1px solid rgba(255,149,0,0.18)",
        padding: "2px 8px",
        borderRadius: "5px",
        whiteSpace: "nowrap",
        transform: "translate3d(-100px,-100px,0) translate(-50%,-130%)",
        opacity: "0",
        willChange: "transform, opacity",
        transition: "opacity 0.4s, color 0.4s, border-color 0.4s",
        pointerEvents: "none",
      } satisfies Partial<CSSStyleDeclaration>);
      labelLayer.appendChild(el);
      return el;
    });

    // Connect each node to its 2–3 nearest neighbours
    const connections: { line: THREE.Line; mat: THREE.LineBasicMaterial; a: number; b: number }[] = [];
    SUBJECTS.forEach((_, i) => {
      const nearest = SUBJECTS
        .map((_, j) => ({ j, d: base[i].distanceTo(base[j]) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d);
      nearest.slice(0, 2 + (i % 2)).forEach(({ j }) => {
        if (j > i) {
          const geom = new THREE.BufferGeometry().setFromPoints([base[i].clone(), base[j].clone()]);
          const mat = new THREE.LineBasicMaterial({ color: LINE_BASE, transparent: true, opacity: 0.25 });
          const line = new THREE.Line(geom, mat);
          lineGroup.add(line);
          connections.push({ line, mat, a: i, b: j });
        }
      });
    });

    // Cycle highlighted subjects
    const highlightCycle = () => {
      const dark = isDark();
      active.forEach((i) => {
        const m = nodes[i].material as THREE.MeshStandardMaterial;
        m.color.copy(dark ? DARK_BASE_COLOR : LIGHT_BASE_COLOR);
        m.emissive.set(dark ? 0x1A1240 : 0xE8E4F5);
        m.emissiveIntensity = dark ? 0.4 : 0.25;
        labels[i].style.color = "";
        labels[i].style.borderColor = dark ? "rgba(255,149,0,0.18)" : "rgba(15,5,39,0.10)";
      });
      active.clear();
      const pool = SUBJECTS.map((_, i) => i);
      for (let n = 0; n < 2 + Math.floor(Math.random() * 2); n++) {
        const idx = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        active.add(idx);
        const m = nodes[idx].material as THREE.MeshStandardMaterial;
        m.color.copy(ACTIVE_COLOR);
        m.emissiveIntensity = 0.9;
        labels[idx].style.color = "#FF9500";
        labels[idx].style.borderColor = "rgba(255,149,0,0.55)";
      }
      connections.forEach(({ mat, a, b }) => {
        const hot = active.has(a) || active.has(b);
        mat.color.setHex(hot ? 0xFF9500 : LINE_BASE);
        mat.opacity = hot ? 0.75 : dark ? 0.25 : 0.14;
      });
    };
    highlightCycle();
    const cycleTimer = window.setInterval(highlightCycle, 2800);

    // Re-apply theme when the site toggles light/dark
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    applyTheme();

    const projected = new THREE.Vector3();
    const projectLabels = () => {
      const hw = w / 2;
      const hh = h / 2;
      nodes.forEach((mesh, i) => {
        projected.setFromMatrixPosition(mesh.matrixWorld).project(camera);
        if (projected.z >= 1) {
          labels[i].style.opacity = "0";
          return;
        }
        const depth = 1 - (projected.z * 0.5 + 0.5);
        // transform-only positioning — never touches layout
        labels[i].style.transform =
          `translate3d(${(projected.x * hw + hw).toFixed(1)}px, ${(-projected.y * hh + hh - 20).toFixed(1)}px, 0) translate(-50%,-130%)`;
        labels[i].style.opacity = String(Math.min(1, 0.25 + depth * 0.75));
      });
    };

    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const animate = () => {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      nodeGroup.rotation.y += 0.0013;
      lineGroup.rotation.y += 0.0013;
      nodes.forEach((mesh, i) => {
        const { fp, fs, dp } = mesh.userData;
        mesh.position.y = base[i].y + Math.sin(t * fs + fp) * 0.24;
        mesh.position.x = base[i].x + Math.cos(t * fs * 0.55 + dp) * 0.12;
      });
      connections.forEach(({ line, a, b }) => {
        const arr = line.geometry.attributes.position.array as Float32Array;
        arr[0] = nodes[a].position.x; arr[1] = nodes[a].position.y; arr[2] = nodes[a].position.z;
        arr[3] = nodes[b].position.x; arr[4] = nodes[b].position.y; arr[5] = nodes[b].position.z;
        line.geometry.attributes.position.needsUpdate = true;
      });
      projectLabels();
      renderer.render(scene, camera);
    };

    // Pause when off-screen so the hero never burns GPU needlessly
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !running) {
            running = true;
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

    const onResize = () => {
      ({ w, h } = sizeTo());
    };
    window.addEventListener("resize", onResize);

    animate();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearInterval(cycleTimer);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      renderer.dispose();
      nodes.forEach((n) => n.geometry.dispose());
      connections.forEach((c) => c.line.geometry.dispose());
      if (renderer.domElement.parentNode === wrap) wrap.removeChild(renderer.domElement);
      if (labelLayer.parentNode === wrap) wrap.removeChild(labelLayer);
    };
  }, []);

  return <div ref={wrapRef} className={className} aria-hidden="true" />;
}
