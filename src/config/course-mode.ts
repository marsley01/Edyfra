/**
 * Course mode: temporarily turns the marketing homepage into the
 * ML & Data Science course landing page.
 *
 * To go back to the normal marketing site, set NEXT_PUBLIC_COURSE_MODE=off
 * (or flip COURSE_MODE_DEFAULT to false) and redeploy. Nothing else was
 * removed — the original homepage sections still render when this is off.
 */
const COURSE_MODE_DEFAULT = true;

export const COURSE_MODE_ENABLED =
  process.env.NEXT_PUBLIC_COURSE_MODE === "off"
    ? false
    : process.env.NEXT_PUBLIC_COURSE_MODE === "on"
      ? true
      : COURSE_MODE_DEFAULT;

export const COURSE = {
  name: "Machine Learning & Data Science",
  duration: "2 months",
  priceKes: 35000,
  studentsTrusted: "1,000+",
  enrollHref: "https://wa.me/254758335592?text=Hi%20Edyfra%2C%20I%20want%20to%20enrol%20in%20the%20ML%20%26%20Data%20Science%20course",
} as const;
