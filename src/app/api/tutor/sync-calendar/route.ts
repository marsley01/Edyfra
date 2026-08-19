import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserData } from "@/app/actions/user";
import { syncTutorCalendarFromIcal } from "@/lib/calendar/ical-sync";
import { createAdminClient } from "@/utils/supabase/admin";

const bodySchema = z.object({
  ical_url: z.url(),
  tutor_id: z.string().min(1),
});

/**
 * POST /api/tutor/sync-calendar
 *
 * Body: { ical_url: string, tutor_id: string }
 * Auth: the authenticated user must be the tutor themselves or an admin.
 *
 * Fetches the Google Calendar public iCal export, parses VEVENT blocks for the
 * next 30 days, and upserts them as blocked availability slots in
 * `tutor_availability_blocks` (deduplicated by external_uid).
 */
export async function POST(request: NextRequest) {
  const user = await getUserData();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { ical_url, tutor_id } = parsed.data;

  // Tutors may only sync their own calendar; admins may sync anyone's.
  if (user.id !== tutor_id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role !== "TUTOR" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncTutorCalendarFromIcal({ icalUrl: ical_url, tutorId: tutor_id });

    // Persist the URL + last-synced timestamp for the settings UI and auto-sync.
    const supabase = createAdminClient();
    await supabase.from("tutor_calendar_settings").upsert(
      {
        tutor_id,
        ical_url,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tutor_id" },
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync calendar";
    console.error("[sync-calendar] sync failed:", message);
    return NextResponse.json(
      { error: "Sync failed", detail: message },
      { status: 502 },
    );
  }
}