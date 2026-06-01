import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Convert KES to kobo (Paystack uses smallest currency unit)
    // 1 KES = 100 kobo
    const amountInKobo = amount * 100;

    // Initialize Paystack transaction for credit purchase
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email!,
        amount: amountInKobo,
        reference: `edyfra-credits-${user.id}-${Date.now()}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.space"}/api/paystack/webhook`,
        metadata: {
          user_id: user.id,
          type: "credit_purchase",
          amount_in_kes: amount,
        },
      }),
    });

    const data = await res.json();

    if (data.status && data.data?.authorization_url) {
      // Create a pending payment record
      await prisma.payment.create({
        data: {
          userId: user.id,
          amount: amount,
          phone: "", // Will be filled from Paystack
          mpesaReceiptNumber: null,
          planType: null,
          paymentType: "credit",
          status: "pending",
          checkoutRequestId: data.data.reference,
          targetId: null,
        },
      });

      return NextResponse.json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
      });
    } else {
      return NextResponse.json(
        { error: data.message || "Failed to initialize payment" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Paystack Credits API] Error:", error.message);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}