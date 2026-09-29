import { Resend } from "resend";

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not defined. Please check your environment variables.");
  }
  return key;
}

/**
 * Default sender for transactional mail.
 *
 * Keep this in sync with the verified sending domain in the Resend dashboard.
 * `src/lib/email.ts` uses its own per-campaign from-addresses; this is the
 * shared default for auth and other system email.
 */
export const FROM_EMAIL = "Edyfra <welcome@edyfra.com>";

export function getResend(): Resend {
  return new Resend(getResendApiKey());
}
