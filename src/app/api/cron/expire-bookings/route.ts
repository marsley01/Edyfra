// ============================================
// BOOKING EXPIRY CRON
// Runs every hour to expire pending bookings
// older than 2 hours
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { expirePendingBookings } from "@/app/actions/bookings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await expirePendingBookings();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Booking expiry error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
