import { NextResponse } from "next/server";
import { AIService } from "@/utils/ai-service";
import prisma from "@/lib/prisma";
import { StreamChat } from "stream-chat";
import { notifyUser } from "@/app/actions/notifications";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Ensure this is an UPDATE event and status changed to COMPLETED
    if (payload.type !== "UPDATE" || payload.table !== "Session") {
      return NextResponse.json({ success: true, message: "Ignored" });
    }

    const { record, old_record } = payload;

    if (record.status !== "COMPLETED" || old_record.status === "COMPLETED") {
      return NextResponse.json({ success: true, message: "Not a completion event" });
    }

    const sessionId = record.id;
    const roomId = record.roomId;
    const studentId = record.studentId;

    if (!roomId || !studentId) {
      return NextResponse.json({ success: false, error: "Missing roomId or studentId" }, { status: 400 });
    }

    // 1. Fetch Chat Transcript from Stream
    const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
    const STREAM_SECRET = process.env.STREAM_SECRET!;
    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    const channel = client.channel("messaging", roomId);
    const messages = await channel.query({ messages: { limit: 100 } });

    if (!messages.messages || messages.messages.length === 0) {
      return NextResponse.json({ success: true, message: "No messages to summarize" });
    }

    const transcript = messages.messages.map(m => `${m.user?.name || 'User'}: ${m.text}`).join("\n");

    // 2. Generate Summary via OpenRouter
    const prompt = `
      You are an expert tutor. Summarize the following study session transcript.
      Extract the key learning points, any areas of struggle, and actionable next steps for the student.
      Keep it brief and encouraging.
      
      Transcript:
      ${transcript}
    `;

    const summary = await AIService.generateCompletion(prompt);

    // 3. Send Notification to Student
    await notifyUser(studentId, {
      type: "SESSION_SUMMARY",
      title: "Session Summary Ready",
      body: summary,
      actionUrl: `/dashboard/sessions/${sessionId}`,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Session Summarizer Webhook Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
