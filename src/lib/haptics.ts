type HapticPattern = number | number[];

/**
 * Lightweight haptic feedback. iOS Safari has no navigator.vibrate,
 * so callers don't need to gate on platform — failures are swallowed.
 * On supported devices (mostly Android Chrome / Edge) this gives a
 * subtle physical confirmation of important taps.
 */
export function haptic(pattern: HapticPattern = 10) {
  if (typeof window === "undefined") return;
  try {
    const nav = window.navigator as Navigator & { vibrate?: (p: HapticPattern) => boolean };
    if (typeof nav.vibrate === "function") {
      nav.vibrate(pattern);
    }
  } catch {
    // iOS throws on some older WebViews — silent fallback is correct.
  }
}

export const haptics = {
  tap: () => haptic(10),
  success: () => haptic([50, 30, 50]),
  error: () => haptic([100, 50, 100]),
};
