import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

// Prisma-backed: the supabase-js version queried non-existent snake_case
// tables ("users", "sessions", "tutor_profiles") and always failed.
export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request, "resources");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 50);

    const where: any = { status: "approved" };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (subject) where.subject = { contains: subject, mode: "insensitive" };
    if (level) where.educationLevel = level;

    const resources = await prisma.resource.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        educationLevel: true,
        resourceType: true,
        topic: true,
        description: true,
        price: true,
        // filePath intentionally omitted: exposing storage paths of paid
        // resources would let API consumers bypass purchase.
        createdAt: true,
        seller: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      resources,
      count: resources.length,
    });
  } catch (error) {
    console.error("[External Resources] Error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}
