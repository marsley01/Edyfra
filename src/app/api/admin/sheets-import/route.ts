import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isFounderEmail } from "@/utils/admin-guard";
import { z } from "zod";
import Papa from "papaparse";

const studentSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
});

const tutorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  subjects: z.string().optional(),
  hourly_rate: z.coerce.number().optional(),
});

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: dbUser } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isDbAdmin = dbUser?.role === "ADMIN" || dbUser?.role === "FOUNDER";
    const isFounder = isFounderEmail(user.email);

    if (!isFounder && !isDbAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { sheets_url, import_type } = await req.json();

    if (!sheets_url || !import_type) {
      return NextResponse.json({ error: "Missing sheets_url or import_type" }, { status: 400 });
    }

    // Extract Sheet ID
    const match = sheets_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid Google Sheets URL." }, { status: 400 });
    }
    const sheetId = match[1];

    if (!/^[a-zA-Z0-9_-]{10,120}$/.test(sheetId)) {
      return NextResponse.json({ error: "Invalid Google Sheets URL." }, { status: 400 });
    }

    const csvUrl = new URL("https://docs.google.com/spreadsheets/d/" + sheetId + "/export");
    csvUrl.searchParams.set("format", "csv");
    const response = await fetch(csvUrl);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch sheet. Make sure it is shared to 'Anyone with the link - Viewer'." }, { status: 400 });
    }

    const csvText = await response.text();

    if (csvText.includes("<html")) {
      return NextResponse.json({ error: "Google returned HTML instead of CSV. Please check sharing permissions." }, { status: 400 });
    }

    // Parse CSV
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: "Failed to parse CSV." }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const row: any = parsed.data[i];
      const rowNum = i + 2;

      try {
        if (import_type === "students") {
          const validRow = studentSchema.parse(row);
          
          const { data: upsertedUser, error: uErr } = await adminSupabase
            .from("users")
            .upsert({
              email: validRow.email,
              name: validRow.name,
              phone: validRow.phone || null,
              role: "STUDENT",
              county: "Imported",
            }, { onConflict: "email" })
            .select("id")
            .single();

          if (uErr) throw uErr;

          if (upsertedUser) {
            await adminSupabase
              .from("student_profiles")
              .upsert({
                user_id: upsertedUser.id,
                subjects: [],
                weak_topics: [],
                study_style: "Visual",
                preferred_times: {},
                goals: [],
              }, { onConflict: "user_id" });
          }

          imported++;

        } else if (import_type === "tutors") {
          const validRow = tutorSchema.parse(row);
          
          const { data: upsertedUser, error: uErr } = await adminSupabase
            .from("users")
            .upsert({
              email: validRow.email,
              name: validRow.name,
              phone: validRow.phone || null,
              role: "TUTOR",
              county: "Imported",
            }, { onConflict: "email" })
            .select("id")
            .single();

          if (uErr) throw uErr;

          const subjectsArr = validRow.subjects ? validRow.subjects.split(",").map(s => s.trim()) : [];

          if (upsertedUser) {
            await adminSupabase
              .from("tutor_profiles")
              .upsert({
                user_id: upsertedUser.id,
                subjects: subjectsArr,
                levels_taught: [],
                verification_path: "GRADES",
                hourly_rate: validRow.hourly_rate || 200,
                bio: "Tutor imported from Google Sheets",
                availability: {},
              }, { onConflict: "user_id" });
          }
          imported++;

        } else if (import_type === "subjects") {
          const validRow = subjectSchema.parse(row);
          
          const { error: cErr } = await adminSupabase
            .from("curriculum_topics")
            .insert({
              subject: validRow.id,
              topic_name: validRow.name,
              description: validRow.description || null,
              level: "HIGH_SCHOOL",
            });

          if (cErr) throw cErr;
          imported++;
        }
      } catch (err: any) {
        skipped++;
        let errMsg = "Unknown error";
        if (err instanceof z.ZodError) {
          errMsg = err.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", ");
        } else if (err.message) {
          errMsg = err.message;
        }
        errors.push(`Row ${rowNum}: ${errMsg}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });

  } catch (err: any) {
    console.error("[Sheets Import Error]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
