import { headers } from "next/headers";

import { getAppUrl } from "@/lib/app-url";

const CALLBACK_PATH = "/api/calendar/callback";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * The `redirect_uri` handed to Google has to match a value registered in the
 * Google Cloud console byte-for-byte, and it has to be the origin the user is
 * actually browsing.
 *
 * This used to be read straight out of `GOOGLE_OAUTH_CALLBACK_URL`, which is
 * pinned to the production host. Connecting a calendar from localhost therefore
 * sent the browser to the deployed site, so the state row written by
 * `getGoogleCalendarAuthUrl` was never read by the route that received the
 * code — the flow failed with "expired" for reasons that looked like a Google
 * problem.
 *
 * The request host is only trusted for loopback. Echoing an arbitrary `Host`
 * header into `redirect_uri` would let a caller plant a state row aimed at a
 * host we do not control, so every non-local request falls back to the
 * configured app URL. Both `http://localhost:3000/api/calendar/callback` and
 * the production URL must be registered in Google Cloud Console.
 */
export async function getCalendarCallbackUrl(): Promise<string> {
  const headerStore = await headers();
  const host = (
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    ""
  )
    .split(",")[0]
    .trim();

  if (LOCAL_HOST.test(host)) {
    return `http://${host}${CALLBACK_PATH}`;
  }

  return `${getAppUrl()}${CALLBACK_PATH}`;
}
