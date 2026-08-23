/**
 * Pushes environment variables straight to the Vercel project so a key saved
 * in Admin → AI Settings is picked up by future deployments automatically.
 *
 * Requires three env vars (set locally / in Vercel):
 *   VERCEL_API_TOKEN   — token with write access to the project
 *   VERCEL_PROJECT_ID  — project id or name
 *   VERCEL_TEAM_ID     — optional, for team-scoped projects
 *
 * If any are missing the sync is skipped gracefully: the platform still picks
 * up the new key instantly via the database fallback in `getAIConfig()`.
 */

export interface VercelSyncResult {
  synced: boolean;
  skippedReason?: string;
  error?: string;
}

const VERCEL_API = "https://api.vercel.com";

function getVercelConfig() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;
  return { token, projectId, teamId };
}

export function isVercelSyncConfigured(): boolean {
  const { token, projectId } = getVercelConfig();
  return Boolean(token && projectId);
}

/** Upsert env vars on the project (all environments) so future deploys have them. */
export async function syncEnvVarsToVercel(
  vars: Record<string, string>,
): Promise<VercelSyncResult> {
  const { token, projectId, teamId } = getVercelConfig();

  if (!token || !projectId) {
    return {
      synced: false,
      skippedReason:
        "VERCEL_API_TOKEN / VERCEL_PROJECT_ID not set — key still works immediately from the database.",
    };
  }

  const url =
    `${VERCEL_API}/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true` +
    (teamId ? `&teamId=${encodeURIComponent(teamId)}` : "");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        Object.entries(vars).map(([key, value]) => ({
          key,
          value,
          type: "encrypted",
          target: ["production", "preview", "development"],
        })),
      ),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      return { synced: false, error: `Vercel API ${res.status}: ${bodyText.slice(0, 200)}` };
    }

    return { synced: true };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : "Unknown Vercel sync error",
    };
  }
}
