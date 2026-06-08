/* ─────────────────────────────────────────────────────────────
 *  Edyfra Social Media Asset & OG Layout Engine
 *  "Digital Campus" Template — 60-30-10 Rule
 * ─────────────────────────────────────────────────────────────
 *
 *  60 %  Soft Neutral Background  (brand.neutral light/dark)
 *  30 %  Primary Brand           (brand.primary deep trust hue)
 *  10 %  Accent Energy           (brand.accent coral/berry punch)
 *
 *  ── Color Palette ───────────────────────────────────────────
 *  brand.primary  →  #1A5276  (Soft Royal Blue)
 *  brand.accent   →  #E07A5F  (Coral CTA)  |  #D81B60  (Berry)
 *  brand.neutral  →  #FDFBF7  (Ivory light) |  #121620  (Navy dark)
 *  text           →  #1C1B1F  (light mode)   |  #EDECF0  (dark mode)
 *
 *  ── Composition Grid ────────────────────────────────────────
 *  +----------------------------------------------------------+
 *  |  [60% neutral background]                                 |
 *  |    +--------------------------------------------------+  |
 *  |    |  [30% primary accent bar / shape layer]           |  |
 *  |    |    • Logo + Platform name (top-left)              |  |
 *  |    |    • Headline (center, large, bold)               |  |
 *  |    |    • Subhead / description (center, medium)       |  |
 *  |    +--------------------------------------------------+  |
 *  |    [10% accent highlight]                                |
 *  |    • CTA text / stat badge (bottom-right, coral)         |
 *  |    • Avatar row with student faces (bottom-left)         |
 *  +----------------------------------------------------------+
 *
 *  ── Asset Composition Guidelines ────────────────────────────
 *
 *  1. NO code blocks, wireframes, or tech vectors.
 *  2. Use real student avatars (circular, with soft shadow).
 *  3. Typography: Inter (sans-serif), bold weights, max 3 lines.
 *  4. CTA buttons use brand.accent (#E07A5F) with white text.
 *  5. Badges / stats use brand.accent with subtle glow.
 *  6. Minimum text contrast ratio: 7:1 (AAA) on all backgrounds.
 *  7. Border radius: 12px (rounded-xl) for cards, 16px (rounded-2xl) for main containers.
 *  8. Drop shadow: soft (0 4px 24px rgba(0,0,0,0.06)) on card layers.
 */

export const OG_BRAND = {
  primary: "#1A5276",
  accent: "#E07A5F",
  accentAlt: "#D81B60",
  neutralLight: "#FDFBF7",
  neutralDark: "#121620",
  textLight: "#1C1B1F",
  textDark: "#EDECF0",
} as const;

export type OGTemplateVariant = "default" | "announcement" | "community" | "achievement" | "event";

export interface OGTemplateConfig {
  /** 1200×630 px (recommended OG standard) */
  width: number;
  height: number;
  /** Background fill — defaults to brand.neutral */
  bgColor: string;
  /** Primary shape bar color */
  barColor: string;
  /** Accent highlight color for CTAs / stats */
  accentColor: string;
  /** Headline text (max 80 chars) */
  headline: string;
  /** Subtitle text (max 160 chars) */
  subtitle?: string;
  /** CTA label shown in accent bar (max 30 chars) */
  cta?: string;
  /** Avatar image URLs to show in the avatar row */
  avatarUrls?: string[];
  /** Platform logo placement */
  showLogo?: boolean;
}

/**
 * Returns recommended OG template configuration for a given variant.
 *
 * Usage (Satori / @vercel/og):
 *   import { getOGTemplate } from "@/lib/og-template";
 *   const config = getOGTemplate("community", { headline: "Join 500+ Kenyan Scholars" });
 */
export function getOGTemplate(
  variant: OGTemplateVariant,
  overrides?: Partial<OGTemplateConfig>,
): OGTemplateConfig {
  const base: OGTemplateConfig = {
    width: 1200,
    height: 630,
    bgColor: OG_BRAND.neutralLight,
    barColor: OG_BRAND.primary,
    accentColor: OG_BRAND.accent,
    headline: "Edyfra — Kenya's Study Platform",
    showLogo: true,
  };

  const variants: Record<OGTemplateVariant, Partial<OGTemplateConfig>> = {
    default: {},
    announcement: {
      accentColor: OG_BRAND.accentAlt,
      subtitle: "New platform update from the Edyfra team",
    },
    community: {
      subtitle: "Real students. Real connections. Real growth.",
      cta: "Join the Community",
      barColor: OG_BRAND.accent,
      accentColor: OG_BRAND.primary,
    },
    achievement: {
      accentColor: OG_BRAND.accent,
      subtitle: "Level up your study game",
      cta: "View Leaderboard",
    },
    event: {
      accentColor: OG_BRAND.accentAlt,
      subtitle: "Mark your calendar",
      cta: "RSVP Now",
    },
  };

  return { ...base, ...variants[variant], ...overrides };
}

/**
 * 60-30-10 pixel helper — returns suggested layer bounding boxes
 * for a 1200×630 canvas.
 */
export function getOGLayerBounds() {
  const W = 1200;
  const H = 630;
  return {
    /** Neutral background — full canvas */
    background: { x: 0, y: 0, w: W, h: H },
    /** Primary bar — 30 % bottom strip (or left accent) */
    primaryBar: { x: 0, y: 380, w: W, h: 150 },
    /** Accent highlight — 10 % floating badge / CTA area */
    accentBadge: { x: 840, y: 420, w: 300, h: 60 },
    /** Student avatar row — bottom-left */
    avatarRow: { x: 60, y: 420, w: 400, h: 60 },
    /** Logo area — top-left */
    logo: { x: 60, y: 40, w: 200, h: 48 },
    /** Headline area — center */
    headline: { x: 60, y: 160, w: 800, h: 120 },
    /** Subtitle area — below headline */
    subtitle: { x: 60, y: 280, w: 700, h: 60 },
  };
}
