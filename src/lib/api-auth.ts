import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const KEY_PREFIX = "edyfra_";

/**
 * Creates a new API key for an external platform.
 * Returns the full plaintext key (shown once) plus the DB record.
 */
export async function createApiKey(input: {
  name: string;
  platform: string;
  createdBy: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: Date;
}) {
  const rawKey = `${KEY_PREFIX}${crypto.randomBytes(24).toString("base64url")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const record = await prisma.apiKey.create({
    data: {
      name: input.name,
      platform: input.platform,
      keyHash,
      keyPrefix,
      scopes: input.scopes ?? ["resources", "tutors", "stats"],
      rateLimit: input.rateLimit ?? 1000,
      expiresAt: input.expiresAt ?? null,
      createdBy: input.createdBy,
    },
  });

  return { rawKey, record };
}

/**
 * Authenticates a request by API key (Authorization: Bearer edyfra_...).
 * Looks up by prefix, verifies the hash, and enforces scope + expiry.
 * Updates lastUsedAt on success.
 */
export async function requireApiKey(
  request: NextRequest,
  scope: string
): Promise<{ ok: true; key: { id: string; name: string; platform: string } } | { ok: false; response: NextResponse }> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token || !token.startsWith(KEY_PREFIX)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing or invalid API key. Send it as: Authorization: Bearer edyfra_..." },
        { status: 401 }
      ),
    };
  }

  const keyPrefix = token.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, name: true, platform: true, keyPrefix: true, scopes: true, enabled: true, expiresAt: true },
  });

  if (!apiKey || apiKey.keyPrefix !== keyPrefix || !apiKey.enabled) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid or disabled API key" }, { status: 401 }),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "API key expired" }, { status: 401 }),
    };
  }

  if (!apiKey.scopes.includes(scope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `This API key does not have the "${scope}" scope` },
        { status: 403 }
      ),
    };
  }

  // Fire-and-forget last-used tracking
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    ok: true,
    key: { id: apiKey.id, name: apiKey.name, platform: apiKey.platform },
  };
}
