/**
 * Branded per-source placeholder for news cards.
 *
 * Google News items carry no enclosure, media:content, media:thumbnail or
 * inline <img> at all, so every one of them fell through to the same
 * /og-image.png. A single image repeated down the grid reads as a bug even
 * though it is only a missing thumbnail.
 *
 * This builds a data-URI SVG instead: a monogram plus the publisher name,
 * coloured deterministically from the source name, so the same publisher always
 * looks the same and different publishers are easy to tell apart.
 *
 * next/image rejects SVG unless dangerouslyAllowSVG is enabled, so callers
 * detect this via isBrandedPlaceholder() and render a plain <img> for it.
 *
 * Pure module - no "use server", so both the server action and the client card
 * can import from it. ("use server" modules may only export async functions.)
 */

export const BRANDED_PLACEHOLDER_PREFIX = "data:image/svg+xml;base64,";

const SOURCE_COLORS = [
  { from: "#1e293b", to: "#334155" },
  { from: "#0f766e", to: "#115e59" },
  { from: "#7c2d12", to: "#9a3412" },
  { from: "#1e3a8a", to: "#1e40af" },
  { from: "#4c1d95", to: "#5b21b6" },
  { from: "#831843", to: "#9d174d" },
  { from: "#134e4a", to: "#0f766e" },
  { from: "#3f3f46", to: "#52525b" },
  { from: "#164e63", to: "#155e75" },
  { from: "#3f6212", to: "#4d7c0f" },
  { from: "#7f1d1d", to: "#991b1b" },
  { from: "#5b21b6", to: "#6d28d9" },
  { from: "#0c4a6e", to: "#075985" },
  { from: "#78350f", to: "#92400e" },
  { from: "#4a044e", to: "#701a75" },
  { from: "#065f46", to: "#047857" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isBrandedPlaceholder(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith(BRANDED_PLACEHOLDER_PREFIX);
}

export function buildBrandedPlaceholder(source?: string, category?: string): string {
  const name = (source || "Edyfra").trim();
  const initial = escapeXml(name.slice(0, 1).toUpperCase() || "E");
  const label = escapeXml(name.length > 20 ? `${name.slice(0, 19)}…` : name);
  const caption = escapeXml(category || "News");
  const { from, to } = SOURCE_COLORS[hashString(name) % SOURCE_COLORS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="400" cy="205" r="86" fill="rgba(255,255,255,0.1)"/><text x="400" y="243" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text><text x="400" y="368" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="rgba(255,255,255,0.95)" text-anchor="middle">${label}</text><text x="400" y="410" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="4" fill="rgba(255,255,255,0.55)" text-anchor="middle">${caption.toUpperCase()}</text></svg>`;

  return BRANDED_PLACEHOLDER_PREFIX + Buffer.from(svg, "utf8").toString("base64");
}
