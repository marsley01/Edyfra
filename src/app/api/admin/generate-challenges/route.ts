import { NextRequest, NextResponse } from "next/server";
import { generateChallenges } from "@/app/actions/challenge-ai";
import { getUserData } from "@/app/actions/user";
import { Role } from "@/generated/client";

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const user = await getUserData();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { level, subject, topic, count = 1 } = body;

    // Validate required fields
    if (!level || !["HIGH_SCHOOL", "UNIVERSITY"].includes(level)) {
      return NextResponse.json(
        { error: "Invalid level. Must be HIGH_SCHOOL or UNIVERSITY" },
        { status: 400 }
      );
    }

    // Generate challenges using AI
    const challenges = await generateChallenges({
      level,
      subject,
      topic,
      count: Math.min(count, 10) // Limit to 10 at a time
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${challenges.length} challenge(s)`,
      challenges
    });

  } catch (error) {
    console.error("Error generating challenges:", error);
    
    // Send error notification to admin
    try {
      const { sendErrorNotification } = await import("@/app/actions/admin-notifications");
      await sendErrorNotification({
        type: "AI_CHALLENGE_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Failed to generate challenges",
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: "/api/admin/generate-challenges"
      });
    } catch (notifyError) {
      console.error("Failed to send error notification:", notifyError);
    }

    return NextResponse.json(
      { 
        error: "Failed to generate challenges",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}