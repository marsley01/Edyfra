import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// We need a service role key to bypass RLS when called by cron
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Simple auth for cron (optional, but good practice)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch one pending job
    const job = await prisma.processingJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    // 2. Mark as processing
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date() },
    });

    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from("institution-uploads")
      .download(job.filePath);

    if (downloadError || !fileData) {
      await updateJobFailed(job.id, "Failed to download file from storage.");
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }

    // 4. Parse CSV (Simplified dummy logic for illustration)
    const text = await fileData.text();
    const rows = text.split("\n").filter(r => r.trim());
    const studentCount = rows.length > 1 ? rows.length - 1 : 0; // assuming header

    // 5. Simulate processing student data
    // Here we would normally parse the CSV and insert into StudentResult table
    // For now, we'll assume it succeeds

    // 6. Mark as completed
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "completed", completedAt: new Date() },
    });

    // 7. Create an in-app notification for the institution admin
    // Assuming we find the admin of the institution
    const admins = await prisma.institutionMember.findMany({
      where: { institutionId: job.institutionId, role: "INSTITUTION_ADMIN" },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: "SYSTEM",
          title: "CSV Processing Complete",
          body: `Your results have been processed. ${studentCount} students analyzed.`,
        },
      });
    }

    return NextResponse.json({ message: "Job processed successfully", jobId: job.id });
  } catch (error: any) {
    console.error("Error processing CSV:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function updateJobFailed(jobId: string, errorMsg: string) {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "failed", error: errorMsg, completedAt: new Date() },
  });
}
