import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdminStatus } from "@/app/actions/admin";

// List all challenges (for admin)
export async function GET() {
  try {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const challenges = await prisma.dailyChallenge.findMany({
      orderBy: { date: "desc" },
      take: 100
    });

    return NextResponse.json({
      challenges: challenges.map((challenge) => ({
        ...challenge,
        scheduled: challenge.date > now,
      })),
    });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}

// Create a challenge
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { subject, level, question, options, answer, explanation, date } = body || {};

    if (!subject || !question || !answer || !date) {
      return NextResponse.json({ error: "Subject, question, answer, and date are required" }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: "At least two options are required" }, { status: 400 });
    }

    const challenge = await prisma.dailyChallenge.create({
      data: {
        subject,
        level: level || "HIGH_SCHOOL",
        formYear: body.formYear ?? null,
        question,
        options,
        answer,
        explanation: explanation || "",
        date: new Date(date),
      },
    });

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}

// Update a challenge
export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Challenge ID required" }, { status: 400 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.level !== undefined) data.level = body.level;
    if (body.formYear !== undefined) data.formYear = body.formYear;
    if (body.question !== undefined) data.question = body.question;
    if (body.options !== undefined) {
      if (!Array.isArray(body.options) || body.options.length < 2) {
        return NextResponse.json({ error: "At least two options are required" }, { status: 400 });
      }
      data.options = body.options;
    }
    if (body.answer !== undefined) data.answer = body.answer;
    if (body.explanation !== undefined) data.explanation = body.explanation;
    if (body.date !== undefined) data.date = new Date(body.date);

    const challenge = await prisma.dailyChallenge.update({
      where: { id },
      data,
    });

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 });
  }
}

// Delete a challenge
export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Challenge ID required" }, { status: 400 });
    }

    // Delete related attempts first
    await prisma.dailyChallengeAttempt.deleteMany({
      where: { challengeId: id }
    });

    // Delete the challenge
    await prisma.dailyChallenge.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    return NextResponse.json({ error: "Failed to delete challenge" }, { status: 500 });
  }
}
