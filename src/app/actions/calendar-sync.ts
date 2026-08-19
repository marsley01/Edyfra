"use server";

import { getUserData } from "./user";
import { createAdminClient } from "@/utils/supabase/admin";

export interface TutorCalendarSettings {
  icalUrl: string | null;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

/**
 * Reads the current tutor's calendar sync settings (iCal URL, auto-sync
 * preference, last synced timestamp).
 */
export async function getTutorCalendarSettings(): Promise<TutorCalendarSettings | null> {
  const user = await getUserData();
  if (!user) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tutor_calendar_settings")
      .select("ical_url, auto_sync, last_synced_at")
      .eq("tutor_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      icalUrl: data.ical_url ?? null,
      autoSync: data.auto_sync ?? false,
      lastSyncedAt: data.last_synced_at ?? null,
    };
  } catch (error) {
    console.error("Error in getTutorCalendarSettings:", error);
    return null;
  }
}

/**
 * Saves the tutor's calendar sync preference. `icalUrl` may be omitted when
 * only toggling auto-sync; an empty string clears the stored URL.
 */
export async function updateTutorCalendarSettings(input: {
  icalUrl?: string | null;
  autoSync?: boolean;
}) {
  const user = await getUserData();
  if (!user) throw new Error("Unauthorized");

  try {
    const supabase = createAdminClient();
    const patch: Record<string, string | boolean | null> = { updated_at: new Date().toISOString() };
    if (typeof input.icalUrl === "string") patch.ical_url = input.icalUrl || null;
    if (typeof input.autoSync === "boolean") patch.auto_sync = input.autoSync;

    const { error } = await supabase.from("tutor_calendar_settings").upsert(
      { tutor_id: user.id, ...patch },
      { onConflict: "tutor_id" },
    );
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error in updateTutorCalendarSettings:", error);
    throw error;
  }
}