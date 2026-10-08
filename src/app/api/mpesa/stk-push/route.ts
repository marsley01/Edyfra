import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";

const PAYMENT_TYPES = ["subscription", "session", "resource"] as const;
type PaymentType = (typeof PAYMENT_TYPES)[number];

/**
 * Resolve the amount to charge from the database. The client-supplied amount is
 * never trusted: otherwise a user could pay KES 1 for any product.
 */
async function resolveAmount(type: PaymentType, id: string, userId: string): Promise<number | { error: string }> {
  if (type === "subscription") {
    if (id !== "plus_monthly" && id !== "plus_yearly") return { error: "Invalid plan" };
    const plan = await prisma.plan.findFirst({ where: { name: { equals: "plus", mode: "insensitive" } } });
    if (!plan) return { error: "Plan not found" };
    return id === "plus_yearly" ? (plan.yearlyPrice || plan.monthlyPrice * 10) : plan.monthlyPrice;
  }
  if (type === "session") {
    const session = await prisma.session.findUnique({
      where: { id },
      select: { studentId: true, priceKsh: true, paymentStatus: true, status: true },
    });
    if (!session || session.studentId !== userId) return { error: "Session not found" };
    if (session.paymentStatus !== "NONE") return { error: "Session already paid" };
    if (session.status === "CANCELLED" || session.status === "COMPLETED") return { error: "Session is no longer payable" };
    return session.priceKsh;
  }
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { price: true, status: true, sellerId: true },
  });
  if (!resource || resource.status !== "approved") return { error: "Resource not found" };
  if (resource.sellerId === userId) return { error: "You cannot buy your own resource" };
  const existing = await prisma.resourcePurchase.findFirst({ where: { userId, resourceId: id }, select: { id: true } });
  if (existing) return { error: "You already own this resource" };
  return resource.price;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, type: rawType, id } = await req.json();

    if (!phone || !rawType || !id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const type = String(rawType).toLowerCase() as PaymentType;
    if (!PAYMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    // Validate phone format (2547XXXXXXXX or 07XXXXXXXX)
    const phoneRegex = /^(?:254|0)([17]\d{8})$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: "Invalid M-Pesa phone number format" }, { status: 400 });
    }

    const resolved = await resolveAmount(type, id, user.id);
    if (typeof resolved !== "number") {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const amount = Math.round(resolved);
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: "Nothing to pay for this item" }, { status: 400 });
    }

    const reference = `${type}_${id}_${user.id.slice(0, 8)}`.slice(0, 12);
    const description = `Edyfra ${type}`.slice(0, 13);

    // Initiate STK Push
    const response = await initiateStkPush({
      phone,
      amount,
      reference,
      description,
    });

    if (!response?.CheckoutRequestID) {
      return NextResponse.json({ error: "Failed to initiate payment" }, { status: 502 });
    }

    // Log the pending payment (must succeed, otherwise the callback can't be matched)
    const adminSupabase = createAdminClient();
    const { error: insertError } = await adminSupabase.from("payments").insert({
      user_id: user.id,
      amount,
      phone,
      payment_type: type,
      status: "pending",
      plan_type: type === "subscription" ? id : null,
      target_id: type !== "subscription" ? id : null,
      checkout_request_id: response.CheckoutRequestID,
    });
    if (insertError) {
      console.error("[STK Push API] Failed to record pending payment:", insertError.message);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      MerchantRequestID: response.MerchantRequestID,
      CheckoutRequestID: response.CheckoutRequestID 
    });

  } catch (error: any) {
    console.error("[STK Push API] Error:", error.message);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
