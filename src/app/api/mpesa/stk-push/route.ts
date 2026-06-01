import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initiateStkPush } from "@/lib/mpesa";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, amount, type, id } = await req.json();

    if (!phone || !amount || !type || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate phone format (2547XXXXXXXX or 07XXXXXXXX)
    const phoneRegex = /^(?:254|0)([17]\d{8})$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: "Invalid M-Pesa phone number format" }, { status: 400 });
    }

    const reference = `${type}_${id}_${user.id.slice(0, 8)}`;
    const description = `Edyfra ${type} - ${id}`;

    // Initiate STK Push
    const response = await initiateStkPush({
      phone,
      amount,
      reference,
      description,
    });

    // Log the pending payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        phone,
        paymentType: type.toLowerCase(),
        status: "pending",
        planType: type === "subscription" ? id : null,
        targetId: type !== "subscription" ? id : null,
        checkoutRequestId: response.CheckoutRequestID,
      },
    });

    return NextResponse.json({ 
      success: true, 
      MerchantRequestID: response.MerchantRequestID,
      CheckoutRequestID: response.CheckoutRequestID 
    });

  } catch (error: any) {
    console.error("[STK Push API] Error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to initiate payment" }, { status: 500 });
  }
}
