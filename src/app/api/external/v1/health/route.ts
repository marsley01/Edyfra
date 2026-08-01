import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "Edyfra Public API",
    version: "v1",
    status: "ok",
    endpoints: [
      "GET /api/external/v1/health",
      "GET /api/external/v1/stats",
      "GET /api/external/v1/resources",
      "GET /api/external/v1/tutors",
    ],
    auth: 'Send your key as "Authorization: Bearer edyfra_..."',
  });
}
