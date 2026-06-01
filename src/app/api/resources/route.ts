import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const subject = searchParams.get("subject") || "";
    const level = searchParams.get("level") || "";
    const type = searchParams.get("type") || "";
    const topic = searchParams.get("topic") || "";
    const price = searchParams.get("price") || ""; // free or paid
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: "approved",
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (subject) {
      where.subject = { contains: subject, mode: "insensitive" };
    }

    if (level) {
      where.educationLevel = level;
    }

    if (type) {
      where.resourceType = type;
    }

    if (topic) {
      where.topic = { contains: topic, mode: "insensitive" };
    }

    if (price) {
      if (price === "free") {
        where.price = 0;
      } else if (price === "paid") {
        where.price = { gt: 0 };
      }
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    return NextResponse.json({
      resources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Resources API] Error:", error.message);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { title, subject, education_level, resource_type, topic, description, price, file_path } = body;

    if (!title || !subject || !education_level || !resource_type || !file_path) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        sellerId: user.id,
        title,
        subject,
        educationLevel: education_level,
        resourceType: resource_type,
        topic: topic || null,
        description: description || null,
        price: price || 0,
        filePath: file_path,
        status: "pending",
      },
    });

    return NextResponse.json({ success: true, resource });
  } catch (error: any) {
    console.error("[Resources API POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create resource" }, { status: 500 });
  }
}