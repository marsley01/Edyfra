import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyManyUsers } from "@/app/actions/notifications";

// processing_jobs is @@map'ped but its columns are NOT (they are camelCase:
// "filePath", "createdAt", ...), and InstitutionMember is the unmapped
// "InstitutionMember" table — so the previous supabase-js queries using
// snake_case names never found or updated a job. Use Prisma for DB access and
// the service-role client only for Storage.
export async function GET(request: Request) {
  // Cron auth. Fail closed when CRON_SECRET is unset — otherwise the literal
  // header "Bearer undefined" was accepted.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobId: string | null = null;
  try {
    // 1. Fetch one pending job
    const job = await prisma.processingJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return NextResponse.json({ message: "No pending jobs" });
    }
    jobId = job.id;

    // 2. Mark as processing
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date() },
    });

    // 3. Download the file from Supabase Storage
    const supabase = createAdminClient();
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("institution-uploads")
      .download(job.filePath);

    if (downloadError || !fileData) {
      await updateJobFailed(job.id, "Failed to download file from storage.");
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }

    // 4. Parse CSV
    const text = await fileData.text();
    const rows = text.split("\n").filter(r => r.trim());
    const studentCount = rows.length > 1 ? rows.length - 1 : 0;

    // 5. Mark as completed
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "completed", completedAt: new Date() },
    });

    // 6. Create in-app notification for institution admins
    const admins = await prisma.institutionMember.findMany({
      where: { institutionId: job.institutionId, role: "INSTITUTION_ADMIN" },
      select: { userId: true },
    });

    if (admins.length > 0) {
      await notifyManyUsers(
        admins.map((a) => a.userId),
        {
          type: "SYSTEM",
          title: "CSV Processing Complete",
          body: `Your results have been processed. ${studentCount} students analyzed.`,
        }
      );
    }

    return NextResponse.json({ message: "Job processed successfully", jobId: job.id });
  } catch (error: any) {
    console.error("Error processing CSV:", error);
    // Don't leave the job stuck in "processing" forever.
    if (jobId) {
      await updateJobFailed(jobId, "Unexpected error while processing.").catch(() => {});
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function updateJobFailed(jobId: string, errorMsg: string) {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "failed", error: errorMsg, completedAt: new Date() },
  });
}
