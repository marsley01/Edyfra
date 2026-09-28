import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyUser } from "@/app/actions/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Mpesa Callback] Received:", JSON.stringify(body, null, 2));

    // Verify the request originates from Safaricom.
    // IMPORTANT: this block only activates when MPESA_ALLOWED_IPS is set in Vercel env vars.
    // Current Safaricom egress IPs: 196.201.214.200, 196.201.214.206 (verify with your
    // Daraja portal — add them to MPESA_ALLOWED_IPS as a comma-separated list).
    const SAFARICOM_IPS = (process.env.MPESA_ALLOWED_IPS || "").split(",").filter(Boolean);
    const forwarded = req.headers.get("x-forwarded-for") || "";
    const clientIp = forwarded.split(",")[0]?.trim() || "";
    if (SAFARICOM_IPS.length > 0 && !SAFARICOM_IPS.includes(clientIp)) {
      console.warn(`M-Pesa callback rejected from IP: ${clientIp}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback payload" });
    }

    const { 
      MerchantRequestID, 
      CheckoutRequestID, 
      ResultCode, 
      ResultDesc, 
      CallbackMetadata 
    } = stkCallback;

    const supabase = createAdminClient();

    // Find the pending payment
    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (pErr || !payment) {
      console.warn("[Mpesa Callback] Payment not found for CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Cross-validate amount
    const callbackAmount = Number(body?.Body?.stkCallback?.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === "Amount"
    )?.Value);
    if (payment && callbackAmount && Math.abs(callbackAmount - Number(payment.amount)) > 1) {
      console.error(`Amount mismatch for payment ${payment.id}: expected ${payment.amount}, got ${callbackAmount}`);
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Amount mismatch" });
    }

    if (ResultCode === 0) {
      // Prevent replay: check if payment was already completed
      if (payment.status === "completed") {
        console.warn(`[Mpesa Callback] Duplicate callback for already-completed payment: ${CheckoutRequestID}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      // Success
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceipt = metadata.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;

      // Update payment
      await supabase
        .from("payments")
        .update({
          status: "completed",
          mpesa_receipt_number: mpesaReceipt,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      const paymentType = payment.payment_type;
      const userId = payment.user_id;

      // Handle specific payment types
      if (paymentType === "subscription") {
        const planType = payment.plan_type;
        const durationDays = planType === "plus_yearly" ? 365 : 30;
        const billingCycle = planType === "plus_yearly" ? "yearly" : "monthly";

        await supabase
          .from("users")
          .update({
            plan: "plus",
            plan_started_at: new Date().toISOString(),
            plan_expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
            plan_billing_cycle: billingCycle,
          })
          .eq("id", userId);

        // Notify user (In-app notification)
        await notifyUser(userId, {
          type: "SYSTEM",
          title: "Welcome to Edyfra Plus!",
          body: `Your account has been upgraded to Edyfra Plus. Enjoy unlimited Mash AI and more!`,
        });
      } else if (paymentType === "session") {
        // Handle Session Payment
        const { data: session } = await supabase
          .from("sessions")
          .select("*, student:users!student_id ( name ), partner:users!partner_id ( name )")
          .eq("id", payment.target_id)
          .single();

        if (session) {
          const gross = Number(payment.amount);
          const platformFee = Math.round(gross * 0.20);
          const tutorPayout = gross - platformFee;

          await supabase
            .from("sessions")
            .update({ status: "ACTIVE", payment_status: "HELD" })
            .eq("id", session.id);

          await supabase
            .from("session_payments")
            .insert({
              session_id: session.id,
              student_id: session.student_id,
              tutor_id: session.partner_id,
              gross_amount: gross,
              platform_fee: platformFee,
              tutor_payout: tutorPayout,
              mpesa_receipt: mpesaReceipt,
              paid_at: new Date().toISOString(),
            });

          if (session.partner_id) {
            await notifyUser(session.partner_id, {
              type: "SESSION",
              title: "Session Paid",
              body: `${session.student?.name || "A student"} has paid for your ${session.subject} session. You can now start the call.`,
              actionUrl: `/study-room/${session.id}`,
            });
          }

          await notifyUser(session.student_id, {
            type: "SESSION",
            title: "Payment Confirmed",
            body: `Your payment of KES ${gross} has been received. Your tutor has been notified.`,
            actionUrl: `/study-room/${session.id}`,
          });
        }
      } else if (paymentType === "resource") {
        // Handle Resource Payment
        const { data: resource } = await supabase
          .from("resources")
          .select("*")
          .eq("id", payment.target_id)
          .single();

        if (resource) {
          const gross = Number(payment.amount);
          const platformFee = Math.round(gross * 0.30);
          const sellerPayout = gross - platformFee;

          await supabase
            .from("resource_purchases")
            .insert({
              user_id: userId,
              resource_id: resource.id,
              amount: gross,
              platform_fee: platformFee,
              seller_payout: sellerPayout,
              mpesa_receipt: mpesaReceipt,
              paid_at: new Date().toISOString(),
            });

          await notifyUser(userId, {
            type: "MARKETPLACE",
            title: "Resource Purchased",
            body: `You have successfully purchased "${resource.title}". You can now download it from the marketplace.`,
            actionUrl: `/dashboard/resources`,
          });
        }
      }
      
      console.log(`[Mpesa Callback] Payment SUCCESS: ${CheckoutRequestID} (${paymentType})`);
    } else {
      // Failure
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);

      console.log(`[Mpesa Callback] Payment FAILED: ${CheckoutRequestID} - ${ResultDesc}`);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error("[Mpesa Callback] Error processing:", error.message);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
