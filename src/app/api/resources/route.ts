import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  education_level: z.string().min(1).max(50),
  resource_type: z.string().min(1).max(50),
  topic: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).optional(),
  file_path: z.string().min(1).max(500),
});

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
    const parsed = resourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { title, subject, education_level, resource_type, topic, description, price, file_path } = parsed.data;

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
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}