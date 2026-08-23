/**
 * BubbleBackground — decorative floating circles for the landing page and
 * student dashboard header area.
 *
 * Rules (per design spec):
 * - 8 circles, fixed positions (no runtime randomisation)
 * - CSS keyframe animation only (no Framer Motion)
 * - prefers-reduced-motion: no animation, static render only
 * - No blur, no shadow, no border on the circles
 * - pointer-events: none, z-index: 0
 * - Parent MUST have position: relative
 *
 * Usage:
 *   <div className="relative">
 *     <BubbleBackground />
 *     <div className="relative z-10">...content...</div>
 *   </div>
 */

export function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Bubble 1 — large violet, top-left */}
      <span
        className="bubble"
        style={{
          width: 180,
          height: 180,
          backgroundColor: "#FF9500",
          opacity: 0.07,
          top: "8%",
          left: "6%",
          animationDuration: "18s",
          animationDelay: "0s",
        }}
      />

      {/* Bubble 2 — medium coral, top-right */}
      <span
        className="bubble"
        style={{
          width: 120,
          height: 120,
          backgroundColor: "#FF9500",
          opacity: 0.09,
          top: "12%",
          right: "10%",
          animationDuration: "14s",
          animationDelay: "-4s",
        }}
      />

      {/* Bubble 3 — small mint, mid-left */}
      <span
        className="bubble"
        style={{
          width: 90,
          height: 90,
          backgroundColor: "#10B981",
          opacity: 0.08,
          top: "45%",
          left: "3%",
          animationDuration: "20s",
          animationDelay: "-7s",
        }}
      />

      {/* Bubble 4 — large solar, mid-right */}
      <span
        className="bubble"
        style={{
          width: 140,
          height: 140,
          backgroundColor: "#FFC107",
          opacity: 0.10,
          top: "38%",
          right: "5%",
          animationDuration: "16s",
          animationDelay: "-2s",
        }}
      />

      {/* Bubble 5 — small bubblegum, lower-left */}
      <span
        className="bubble"
        style={{
          width: 70,
          height: 70,
          backgroundColor: "#B8A6E0",
          opacity: 0.09,
          bottom: "20%",
          left: "15%",
          animationDuration: "12s",
          animationDelay: "-9s",
        }}
      />

      {/* Bubble 6 — large violet, lower-right */}
      <span
        className="bubble"
        style={{
          width: 160,
          height: 160,
          backgroundColor: "#FF9500",
          opacity: 0.05,
          bottom: "10%",
          right: "18%",
          animationDuration: "22s",
          animationDelay: "-5s",
        }}
      />

      {/* Bubble 7 — medium coral, centre-bottom */}
      <span
        className="bubble"
        style={{
          width: 100,
          height: 100,
          backgroundColor: "#FF9500",
          opacity: 0.07,
          bottom: "28%",
          left: "42%",
          animationDuration: "15s",
          animationDelay: "-1s",
        }}
      />

      {/* Bubble 8 — small solar, upper-centre */}
      <span
        className="bubble"
        style={{
          width: 80,
          height: 80,
          backgroundColor: "#FFC107",
          opacity: 0.08,
          top: "22%",
          left: "55%",
          animationDuration: "19s",
          animationDelay: "-8s",
        }}
      />
    </div>
  );
}
