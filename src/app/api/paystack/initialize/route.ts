import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { paystack } from "@/lib/paystack";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, type, id, email } = await req.json();

    if (!amount || !type || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reference = `edyfra_${type}_${id}_${Date.now()}`;
    
    // Initialize Paystack transaction
    const response = await paystack.initializeTransaction({
      email: email || user.email!,
      amount,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/verify`,
      metadata: {
        userId: user.id,
        paymentType: type,
        targetId: id,
        planType: type === "subscription" ? id : null,
      },
    });

    if (!response.status) {
      throw new Error(response.message);
    }

    // Log the pending payment in our DB
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        phone: "paystack", // Paystack handles the actual phone/card
        paymentType: type.toLowerCase(),
        status: "pending",
        planType: type === "subscription" ? id : null,
        targetId: type !== "subscription" ? id : null,
        checkoutRequestId: reference, // Using reference as checkout ID for tracking
      },
    });

    return NextResponse.json({ 
      success: true, 
      authorization_url: response.data.authorization_url,
      reference: response.data.reference
    });

  } catch (error: any) {
    console.error("[Paystack Initialize API] Error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to initialize payment" }, { status: 500 });
  }
}
