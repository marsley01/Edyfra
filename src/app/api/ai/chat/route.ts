import { generateAIResponse } from "@/utils/openrouter";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";
import { checkFeatureAccess, incrementDailyAICount } from "@/lib/feature-gates";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;
const STREAM_SECRET = process.env.STREAM_SECRET!;

function extractMessage(body: any): string {
  if (typeof body.message === "string") return body.message;
  if (body.message?.text) return body.message.text;
  if (body.message?.content) return body.message.content;
  return String(body.message || "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, subject, topic, userId } = body;
    const messageText = extractMessage(body);

    // Feature Gate Check
    const access = await checkFeatureAccess("mash_ai");
    if (!access.allowed) {
      return NextResponse.json({ 
        error: "MASH_LIMIT_REACHED", 
        message: "You've reached your daily limit for Mash AI. Upgrade to Edyfra Plus for unlimited help!" 
      }, { status: 403 });
    }

    // Get session context
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { subject: true, topic: true },
    });

    const aiSubject = subject || session?.subject || "general";
    const aiTopic = topic || session?.topic;

    const aiMessage = await generateAIResponse(messageText, aiSubject, aiTopic || undefined);

    // Increment AI count for free users
    const dbUser = await prisma.user.findUnique({ where: { id: userId || body.user_id }, select: { plan: true } });
    if (dbUser?.plan !== "plus") {
      await incrementDailyAICount(userId || body.user_id);
    }

    // Save to Prisma for history
    await prisma.message.create({
      data: {
        sessionId,
        content: aiMessage,
        isMash: true,
      },
    });

    // Post AI message to Stream Chat channel
    try {
      const streamClient = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
      await streamClient.upsertUser({ id: "mash-ai", name: "Mash AI" });
      const channel = streamClient.channel("messaging", sessionId);
      await channel.sendMessage({ text: aiMessage, user_id: "mash-ai" });
    } catch (streamErr) {
      console.error("Failed to post AI message to Stream:", streamErr);
    }

    // Notify online tutors
    try {
      const onlineTutors = await prisma.tutorProfile.findMany({
        where: { availability: { path: ["isOnline"], equals: true } },
        select: { userId: true },
      });

      if (onlineTutors.length > 0) {
        await prisma.notification.createMany({
          data: onlineTutors.map((t) => ({
            userId: t.userId,
            type: "MATCH_FOUND",
            title: "Expert Needed!",
            body: `Mash AI is assisting a student with ${aiSubject}. Join now to provide human expertise!`,
            actionUrl: `/study-room/${sessionId}`,
          })),
        });
      }
    } catch (notifyError) {
      console.error("Failed to notify tutors:", notifyError);
    }

    return NextResponse.json({ success: true, message: aiMessage });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Mash is taking a break — try again in a moment." }, { status: 500 });
  }
}
