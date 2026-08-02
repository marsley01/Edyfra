import { NextRequest, NextResponse } from "next/server";
import { generateICalFile } from "@/app/actions/calendar";

export async function GET(request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;

  const result = await generateICalFile(bookingId);

  if (result.error || !result.success) {
    return NextResponse.json({ error: result.error || "Failed to generate calendar file" }, { status: 404 });
  }

  const { content, filename } = result;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
