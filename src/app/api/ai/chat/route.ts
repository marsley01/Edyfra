import { AIService } from "@/utils/ai-service";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { sessionId, message, subject, topic } = await req.json();

    // 1. Check for Dynamic API Key from Admin Settings
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: { settings: true }
    });

    const dynamicSettings = adminUser?.settings as any;
    const googleAiKey = dynamicSettings?.googleAiKey || process.env.GOOGLE_AI_KEY;

    if (!googleAiKey) {
      console.error("AI Error: Google AI Key is missing in .env or Admin Settings.");
      return NextResponse.json({ error: "AI key not configured. Please add GOOGLE_AI_KEY to your .env file or Admin Settings." }, { status: 500 });
    }
    


    const ai = new AIService({
      provider: "google",
      apiKey: googleAiKey,
      systemPrompt: `You are Mash AI, a friendly and expert Kenyan tutor on the Edyfra platform. 
          You are helping a student with ${subject}${topic ? ` - Topic: ${topic}` : ""}. 
          Be encouraging, clear, and use Kenyan context/examples where appropriate. 
          Focus on providing scholarly, accurate, and high-performance guidance.
          Keep your responses concise and helpful.`,
    });

    const aiMessage = await ai.generateResponse(message);

    const savedMessage = await prisma.message.create({
      data: {
        sessionId,
        content: aiMessage,
        isMash: true,
      },
    });



    // 2. Notify Online Tutors that an AI session needs human intervention
    try {
      const onlineTutors = await prisma.tutorProfile.findMany({
        where: { availability: { path: ["isOnline"], equals: true } },
        select: { userId: true }
      });

      if (onlineTutors.length > 0) {
        await prisma.notification.createMany({
          data: onlineTutors.map(t => ({
            userId: t.userId,
            type: "MATCH_FOUND",
            title: "Expert Needed!",
            body: `Mash AI is assisting a student with ${subject}. Join now to provide human expertise!`,
            actionUrl: `/study-room/${sessionId}`,
          }))
        });
      }
    } catch (notifyError) {
      console.error("Failed to notify tutors:", notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}
