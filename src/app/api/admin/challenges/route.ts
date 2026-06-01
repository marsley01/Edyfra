import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";
import { getUserData } from "@/app/actions/user";

// List all challenges (for admin)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserData();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const challenges = await prisma.dailyChallenge.findMany({
      orderBy: { date: "desc" },
      take: 100
    });

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}

// Delete a challenge
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserData();
    if (!user || user.role !== Role.ADMIN) {
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