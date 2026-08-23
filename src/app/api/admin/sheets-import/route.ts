import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isFounderEmail } from "@/utils/admin-guard";
import prisma from "@/lib/prisma";
import { Role, EduLevel, VerifPath } from "@/generated/client";
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

    const prismaUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const isDbAdmin = prismaUser?.role === Role.ADMIN || prismaUser?.role === Role.FOUNDER;
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

    // Sheet IDs are opaque tokens of [a-zA-Z0-9-_]; anything else is rejected
    // so user input can never alter the request host or path structure.
    if (!/^[a-zA-Z0-9_-]{10,120}$/.test(sheetId)) {
      return NextResponse.json({ error: "Invalid Google Sheets URL." }, { status: 400 });
    }

    // Fetch CSV — host is a server-controlled constant
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
      const rowNum = i + 2; // 1-based + header

      try {
        if (import_type === "students") {
          const validRow = studentSchema.parse(row);
          
          await prisma.user.upsert({
            where: { email: validRow.email },
            create: {
              email: validRow.email,
              name: validRow.name,
              phone: validRow.phone || null,
              role: Role.STUDENT,
              county: "Imported",
              studentProfile: {
                create: {
                  subjects: [],
                  weakTopics: [],
                  studyStyle: "Visual",
                  preferredTimes: {},
                  goals: []
                }
              }
            },
            update: {
              name: validRow.name,
              phone: validRow.phone || undefined,
            },
          });
          imported++;

        } else if (import_type === "tutors") {
          const validRow = tutorSchema.parse(row);
          
          const user = await prisma.user.upsert({
            where: { email: validRow.email },
            create: {
              email: validRow.email,
              name: validRow.name,
              phone: validRow.phone || null,
              role: Role.TUTOR,
              county: "Imported",
            },
            update: {
              name: validRow.name,
              phone: validRow.phone || undefined,
              role: Role.TUTOR, // ensure role is tutor
            },
          });

          const subjectsArr = validRow.subjects ? validRow.subjects.split(",").map(s => s.trim()) : [];

          await prisma.tutorProfile.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              subjects: subjectsArr,
              levelsTaught: [],
              verificationPath: VerifPath.GRADES,
              hourlyRate: validRow.hourly_rate || 200,
              bio: "Tutor imported from Google Sheets",
              availability: {},
            },
            update: {
              subjects: subjectsArr.length > 0 ? subjectsArr : undefined,
              hourlyRate: validRow.hourly_rate !== undefined ? validRow.hourly_rate : undefined,
            }
          });
          imported++;

        } else if (import_type === "subjects") {
          const validRow = subjectSchema.parse(row);
          
          await prisma.curriculumTopic.create({
            data: {
              subject: validRow.id,
              topicName: validRow.name,
              description: validRow.description || null,
              level: EduLevel.HIGH_SCHOOL
            }
          });
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
