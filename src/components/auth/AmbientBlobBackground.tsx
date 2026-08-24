/**
 * AmbientBlobBackground — slow-drifting, heavily blurred brand-color blobs
 * for the auth screens. Pure CSS keyframes; sits behind the form card.
 */

type Blob = {
  size: number;
  color: string;
  style: React.CSSProperties;
  duration: number;
  variant: "a" | "b" | "c" | "d";
  delay: number;
};

const GREEN = "26, 71, 49"; // #1A4731 forest green
const GOLD = "200, 146, 42"; // #C8922A savanna gold

const BLOBS: Blob[] = [
  {
    size: 260,
    color: `rgba(${GREEN}, 0.13)`,
    style: { top: "-6%", left: "-8%" },
    duration: 35,
    variant: "a",
    delay: -5,
  },
  {
    size: 160,
    color: `rgba(${GOLD}, 0.1)`,
    style: { top: "12%", right: "-5%" },
    duration: 24,
    variant: "b",
    delay: -12,
  },
  {
    size: 80,
    color: `rgba(${GREEN}, 0.12)`,
    style: { bottom: "18%", left: "12%" },
    duration: 18,
    variant: "c",
    delay: -3,
  },
  {
    size: 260,
    color: `rgba(${GOLD}, 0.08)`,
    style: { bottom: "-8%", right: "-6%" },
    duration: 31,
    variant: "d",
    delay: -18,
  },
  {
    size: 160,
    color: `rgba(${GREEN}, 0.11)`,
    style: { top: "38%", left: "-9%" },
    duration: 27,
    variant: "b",
    delay: -8,
  },
  {
    size: 80,
    color: `rgba(${GOLD}, 0.09)`,
    style: { top: "-4%", right: "26%" },
    duration: 22,
    variant: "c",
    delay: -14,
  },
  {
    size: 160,
    color: `rgba(${GREEN}, 0.1)`,
    style: { bottom: "32%", right: "8%" },
    duration: 28,
    variant: "a",
    delay: -21,
  },
];

const RADII = [
  "46% 54% 58% 42% / 52% 44% 56% 48%",
  "58% 42% 46% 54% / 44% 56% 48% 52%",
  "52% 48% 54% 46% / 56% 46% 54% 44%",
];

export function AmbientBlobBackground() {
  return (
    <>
      <style>{`
        @keyframes edyfra-blob-a {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(45px, -35px); }
          66% { transform: translate(-30px, 25px); }
        }
        @keyframes edyfra-blob-b {
          0%, 100% { transform: translate(0, 0); }
          40% { transform: translate(-50px, 30px); }
          70% { transform: translate(35px, -20px); }
        }
        @keyframes edyfra-blob-c {
          0%, 100% { transform: translate(0, 0); }
          30% { transform: translate(30px, 45px); }
          65% { transform: translate(-40px, -25px); }
        }
        @keyframes edyfra-blob-d {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-35px, -45px); }
          80% { transform: translate(25px, 30px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-edyfra-blob] { animation: none !important; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {BLOBS.map((blob, i) => (
          <div
            key={i}
            data-edyfra-blob
            className="absolute"
            style={{
              width: blob.size,
              height: blob.size,
              backgroundColor: blob.color,
              borderRadius: RADII[i % RADII.length],
              filter: "blur(60px)",
              animation: `edyfra-blob-${blob.variant} ${blob.duration}s ease-in-out infinite`,
              animationDelay: `${blob.delay}s`,
              willChange: "transform",
              ...blob.style,
            }}
          />
        ))}
      </div>
    </>
  );
}
