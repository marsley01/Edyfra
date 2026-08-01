import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkAdminAccess } from "@/app/actions/admin-auth";
import { createApiKey } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.string().min(1).max(100),
  scopes: z.array(z.enum(["resources", "tutors", "stats"])).optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
  expiresAt: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkAdminAccess();
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const keys = await prisma.apiKey.findMany({
    where: { createdBy: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      platform: true,
      keyPrefix: true,
      scopes: true,
      enabled: true,
      rateLimit: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkAdminAccess();
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { rawKey, record } = await createApiKey({
    name: parsed.data.name,
    platform: parsed.data.platform,
    createdBy: user.id,
    scopes: parsed.data.scopes,
    rateLimit: parsed.data.rateLimit,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  });

  return NextResponse.json({
    success: true,
    key: {
      id: record.id,
      name: record.name,
      platform: record.platform,
      key: rawKey, // shown only once
      scopes: record.scopes,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkAdminAccess();
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing key id" }, { status: 400 });

  await prisma.apiKey.delete({ where: { id, createdBy: user.id } });
  return NextResponse.json({ success: true });
}
