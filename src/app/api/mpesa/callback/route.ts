import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/server";

export async function POST(req: NextRequest) {
  try {
    // Verify the request originates from Safaricom
    const SAFARICOM_IPS = (process.env.MPESA_ALLOWED_IPS || "").split(",").map((ip) => ip.trim()).filter(Boolean);
    const forwarded = req.headers.get("x-forwarded-for") || "";
    const clientIp = forwarded.split(",")[0]?.trim() || "";
    if (SAFARICOM_IPS.length > 0 && !SAFARICOM_IPS.includes(clientIp)) {
      console.warn(`M-Pesa callback rejected from IP: ${clientIp}`);
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 403 });
    }

    const body = await req.json();
    console.log("[Mpesa Callback] Received:", JSON.stringify(body, null, 2));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback payload" });
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    if (!CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback payload" });
    }

    const supabase = createAdminClient();

    // Find the payment this callback refers to
    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .maybeSingle();

    if (pErr || !payment) {
      console.warn("[Mpesa Callback] Payment not found for CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Idempotency: only a pending payment can transition
    if (payment.status !== "pending") {
      console.warn(`[Mpesa Callback] Duplicate callback for already-processed payment: ${CheckoutRequestID} (${payment.status})`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (Number(ResultCode) !== 0) {
      // Failure / cancelled by user
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");

      console.log(`[Mpesa Callback] Payment FAILED: ${CheckoutRequestID} - ${ResultDesc}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const metadata: Array<{ Name: string; Value?: unknown }> = CallbackMetadata?.Item || [];
    const mpesaReceipt = metadata.find((item) => item.Name === "MpesaReceiptNumber")?.Value as string | undefined;
    const callbackAmount = Number(metadata.find((item) => item.Name === "Amount")?.Value);

    // Cross-validate amount: the amount actually paid must match what we charged
    if (!Number.isFinite(callbackAmount) || Math.round(callbackAmount) !== Number(payment.amount)) {
      console.error(`Amount mismatch for payment ${payment.id}: expected ${payment.amount}, got ${callbackAmount}`);
      await supabase
        .from("payments")
        .update({ status: "failed", mpesa_receipt_number: mpesaReceipt ?? null })
        .eq("id", payment.id)
        .eq("status", "pending");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Atomically claim the pending payment so concurrent or replayed callbacks cannot fulfil twice
    const { data: claimed, error: claimErr } = await supabase
      .from("payments")
      .update({
        status: "completed",
        mpesa_receipt_number: mpesaReceipt ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id");

    if (claimErr) {
      console.error("[Mpesa Callback] Failed to mark payment completed:", claimErr.message);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
    if (!claimed || claimed.length === 0) {
      console.warn(`[Mpesa Callback] Payment ${payment.id} already claimed by another callback`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const paymentType = payment.payment_type;
    const userId = payment.user_id;

    // Handle specific payment types
    if (paymentType === "subscription") {
      const planType = payment.plan_type;
      const durationDays = planType === "plus_yearly" ? 365 : 30;
      const billingCycle = planType === "plus_yearly" ? "yearly" : "monthly";

      // Extend from the current expiry if the plan is still active
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, planExpiresAt: true },
      });
      const base =
        existing?.plan === "plus" && existing.planExpiresAt && existing.planExpiresAt.getTime() > Date.now()
          ? existing.planExpiresAt.getTime()
          : Date.now();

      // The table is "User" (Prisma model), not "users"
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "plus",
          planStartedAt: new Date(),
          planExpiresAt: new Date(base + durationDays * 24 * 60 * 60 * 1000),
          planBillingCycle: billingCycle,
        },
      });

      // Notify user (In-app notification)
      await notifyUser(userId, {
        type: "SYSTEM",
        title: "Welcome to Edyfra Plus!",
        body: `Your account has been upgraded to Edyfra Plus. Enjoy unlimited Mash AI and more!`,
      });
    } else if (paymentType === "session") {
      // Handle Session Payment (table is "Session" with camelCase columns, so use Prisma)
      const session = payment.target_id
        ? await prisma.session.findUnique({
            where: { id: payment.target_id },
            include: { student: { select: { name: true } } },
          })
        : null;

      if (session) {
        const gross = Number(payment.amount);
        const platformFee = Math.round(gross * 0.20);
        const tutorPayout = gross - platformFee;

        await prisma.session.update({
          where: { id: session.id },
          data: { status: "ACTIVE", paymentStatus: "HELD", mpesaRef: mpesaReceipt ?? null },
        });

        if (session.partnerId) {
          const { error: spErr } = await supabase
            .from("session_payments")
            .insert({
              session_id: session.id,
              student_id: session.studentId,
              tutor_id: session.partnerId,
              gross_amount: gross,
              platform_fee: platformFee,
              tutor_payout: tutorPayout,
              mpesa_receipt: mpesaReceipt ?? null,
              paid_at: new Date().toISOString(),
            });
          if (spErr) console.error("[Mpesa Callback] session_payments insert failed:", spErr.message);

          await notifyUser(session.partnerId, {
            type: "SESSION",
            title: "Session Paid",
            body: `${session.student?.name || "A student"} has paid for your ${session.subject} session. You can now start the call.`,
            actionUrl: `/study-room/${session.id}`,
          });
        } else {
          console.error(`[Mpesa Callback] Session ${session.id} paid but has no tutor assigned`);
        }

        await notifyUser(session.studentId, {
          type: "SESSION",
          title: "Payment Confirmed",
          body: `Your payment of KES ${gross} has been received. Your tutor has been notified.`,
          actionUrl: `/study-room/${session.id}`,
        });
      } else {
        console.error(`[Mpesa Callback] Paid session ${payment.target_id} not found (payment ${payment.id})`);
      }
    } else if (paymentType === "resource") {
      // Handle Resource Payment
      const { data: resource } = await supabase
        .from("resources")
        .select("*")
        .eq("id", payment.target_id)
        .maybeSingle();

      if (resource) {
        const gross = Number(payment.amount);
        const platformFee = Math.round(gross * 0.30);
        const sellerPayout = gross - platformFee;

        const { error: rpErr } = await supabase
          .from("resource_purchases")
          .insert({
            user_id: userId,
            resource_id: resource.id,
            amount: gross,
            platform_fee: platformFee,
            seller_payout: sellerPayout,
            mpesa_receipt: mpesaReceipt ?? null,
            paid_at: new Date().toISOString(),
          });
        if (rpErr) console.error("[Mpesa Callback] resource_purchases insert failed:", rpErr.message);

        await notifyUser(userId, {
          type: "MARKETPLACE",
          title: "Resource Purchased",
          body: `You have successfully purchased "${resource.title}". You can now download it from the marketplace.`,
          actionUrl: `/dashboard/resources`,
        });
      } else {
        console.error(`[Mpesa Callback] Paid resource ${payment.target_id} not found (payment ${payment.id})`);
      }
    }

    console.log(`[Mpesa Callback] Payment SUCCESS: ${CheckoutRequestID} (${paymentType})`);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error("[Mpesa Callback] Error processing:", error.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
