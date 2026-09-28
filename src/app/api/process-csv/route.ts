import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: Request) {
  // Simple auth for cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch one pending job
    const { data: job } = await supabase
      .from("processing_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ message: "No pending jobs" });
    }

    // 2. Mark as processing
    await supabase
      .from("processing_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);

    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("institution-uploads")
      .download(job.file_path);

    if (downloadError || !fileData) {
      await updateJobFailed(job.id, "Failed to download file from storage.");
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }

    // 4. Parse CSV
    const text = await fileData.text();
    const rows = text.split("\n").filter(r => r.trim());
    const studentCount = rows.length > 1 ? rows.length - 1 : 0;

    // 5. Mark as completed
    await supabase
      .from("processing_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job.id);

    // 6. Create in-app notification for institution admins
    const { data: admins } = await supabase
      .from("institution_members")
      .select("user_id")
      .eq("institution_id", job.institution_id)
      .eq("role", "INSTITUTION_ADMIN");

    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          type: "SYSTEM",
          title: "CSV Processing Complete",
          body: `Your results have been processed. ${studentCount} students analyzed.`,
        });
      }
    }

    return NextResponse.json({ message: "Job processed successfully", jobId: job.id });
  } catch (error: any) {
    console.error("Error processing CSV:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function updateJobFailed(jobId: string, errorMsg: string) {
  const supabase = createAdminClient();
  await supabase
    .from("processing_jobs")
    .update({ status: "failed", error: errorMsg, completed_at: new Date().toISOString() })
    .eq("id", jobId);
}
