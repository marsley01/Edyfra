// Email normalisation + obvious-typo detection for the institution portal
// (signup, invitations). Pure and dependency-free so it can be unit tested and
// used from both server actions and client forms.

/** Trim + lowercase. Every institution email is stored and compared this way. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Top-level domains that are almost always a mistyped ".com".
const COM_TYPOS = new Set(["cpm", "con", "comm", "cmo", "ocm", "vom", "xom", "copm", "coom", "cim", "coim", "cpom"]);
// Common misspellings of the big webmail providers (domain label before the TLD).
const PROVIDER_TYPOS: Record<string, string> = {
  gmial: "gmail",
  gmai: "gmail",
  gamil: "gmail",
  gmaill: "gmail",
  gnail: "gmail",
  gmal: "gmail",
  gmil: "gmail",
  gmaik: "gmail",
  yaho: "yahoo",
  yahooo: "yahoo",
  yhoo: "yahoo",
  hotmal: "hotmail",
  hotmial: "hotmail",
  hotmai: "hotmail",
  outlok: "outlook",
  outloo: "outlook",
};
// Kenyan second-level domains that get mangled (".co.ek", ".ac.ek").
const KE_TYPOS: Record<string, string> = { "co.ek": "co.ke", "ac.ek": "ac.ke", "go.ek": "go.ke", "or.ek": "or.ke" };

/**
 * Returns a corrected suggestion when the email has an obvious domain typo,
 * or null when it looks fine. Only flags typos that are near-certain; an
 * unusual but valid domain is never rejected.
 */
export function suggestEmailCorrection(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const labels = domain.split(".");
  if (labels.length < 2) return null;

  let changed = false;
  const tld = labels[labels.length - 1];
  if (COM_TYPOS.has(tld)) {
    labels[labels.length - 1] = "com";
    changed = true;
  }
  const lastTwo = labels.slice(-2).join(".");
  if (KE_TYPOS[lastTwo]) {
    labels.splice(-2, 2, ...KE_TYPOS[lastTwo].split("."));
    changed = true;
  }
  const provider = labels[0];
  if (labels.length === 2 && PROVIDER_TYPOS[provider]) {
    labels[0] = PROVIDER_TYPOS[provider];
    changed = true;
  }
  // "gmail.co" is a frequent slip; gmail has no .co domain.
  if (labels.length === 2 && ["gmail", "yahoo", "hotmail", "outlook"].includes(labels[0]) && labels[1] === "co") {
    labels[1] = "com";
    changed = true;
  }
  return changed ? `${local}@${labels.join(".")}` : null;
}

/** Friendly validation message for an email typo, or null when it is fine. */
export function emailTypoMessage(email: string): string | null {
  const suggestion = suggestEmailCorrection(email);
  return suggestion ? `That email looks mistyped. Did you mean ${suggestion}?` : null;
}
