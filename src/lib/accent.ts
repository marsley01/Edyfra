/**
 * Per-account accent colour (UserPreferences.accentColor).
 *
 * The brand colour is orange and comes from `--brand-orange` in globals.css.
 * An account only overrides it when its owner picked a colour in settings.
 */

/** Shown first in the settings pickers. Choosing it removes the override. */
export const BRAND_ACCENT = "#FF9500";

/**
 * The UserPreferences column default in the database. It was never one of the
 * picker options, so a row holding it means "nobody chose a colour". Treating
 * it as a real choice is what turned untouched accounts violet.
 */
export const LEGACY_DEFAULT_ACCENT = "#8b5cf6";

/** True when the account should simply use the brand colour. */
export function usesBrandAccent(color: string | null | undefined): boolean {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  return c === LEGACY_DEFAULT_ACCENT || c === BRAND_ACCENT.toLowerCase();
}
