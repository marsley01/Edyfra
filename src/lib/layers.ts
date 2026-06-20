/**
 * Single source of truth for layer ordering across the app.
 *
 * Two rules:
 *   1. NEVER hardcode `z-[9999]` / `z-50` / `z-index: 9999` in components.
 *      Always import `Z` from this module (or use the matching CSS var).
 *   2. If you need a new layer, ADD it here in the right tier — don't pick a
 *      random number.
 *
 * The numeric values are intentionally spaced so future layers can slot in
 * without renumbering.
 */
export const Z = {
  /** Behind everything — page background, decorative gradients. */
  BASE: 0,
  /** Page content (default `z-0`). */
  CONTENT: 1,
  /** Sticky headers / nav bars that scroll with the page. */
  STICKY: 10,
  /** In-page floating surfaces (dropdowns, popovers, tooltips). */
  POPOVER: 20,
  /** Sticky/floating UI (Eddy Chat, Feedback button, Dynamic Island compact). */
  FLOATING: 30,
  /** A persistent FAB-style UI (Eddy Chat open, expanded Dynamic Island). */
  FAB: 40,
  /** Modals and dialogs. */
  MODAL: 50,
  /** Ringing/incoming call UI — must be above the chat but below toasts. */
  RINGING: 60,
  /** Toast notifications. Highest. */
  TOAST: 70,
  /** Full-screen takeover (loading screens, fatal errors). Use sparingly. */
  FULLSCREEN: 100,
} as const;

export type LayerKey = keyof typeof Z;

/**
 * CSS variable name for a given layer. Pair with the var in globals.css.
 *
 * Usage in inline style:
 *   style={{ zIndex: Z.DYNAMIC_ISLAND, position: 'fixed' }}
 *
 * Usage in CSS / Tailwind:
 *   className="z-[var(--edyfra-z-floating)]"
 */
export function zVar(layer: LayerKey): string {
  return `var(--edyfra-z-${kebab(layer)})`;
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
