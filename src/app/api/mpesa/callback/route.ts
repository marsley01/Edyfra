import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Mpesa Callback] Received:", JSON.stringify(body, null, 2));

    const stkCallback = body.Body.stkCallback;
    const { 
      MerchantRequestID, 
      CheckoutRequestID, 
      ResultCode, 
      ResultDesc, 
      CallbackMetadata 
    } = stkCallback;

    // Find the pending payment
    const payment = await prisma.payment.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!payment) {
      console.warn("[Mpesa Callback] Payment not found for CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (ResultCode === 0) {
      // Prevent replay: check if payment was already completed
      if (payment.status === "completed") {
        console.warn(`[Mpesa Callback] Duplicate callback for already-completed payment: ${CheckoutRequestID}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      // Success
      const metadata = CallbackMetadata.Item;
      const mpesaReceipt = metadata.find((item: any) => item.Name === "MpesaReceiptNumber")?.Value;
      const amount = metadata.find((item: any) => item.Name === "Amount")?.Value;

      // Update payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          mpesaReceiptNumber: mpesaReceipt,
          paidAt: new Date(),
        },
      });

      // Handle specific payment types
      if (payment.paymentType === "subscription") {
        const plan = payment.planType === "plus_yearly" ? "plus" : "plus";
        const durationDays = payment.planType === "plus_yearly" ? 365 : 30;
        const billingCycle = payment.planType === "plus_yearly" ? "yearly" : "monthly";

        await prisma.user.update({
          where: { id: payment.userId },
          data: {
            plan: "plus",
            planStartedAt: new Date(),
            planExpiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
            planBillingCycle: billingCycle,
          },
        });

        // Notify user (In-app notification)
        await notifyUser(payment.userId, {
          type: "SYSTEM",
          title: "Welcome to Edyfra Plus!",
          body: `Your account has been upgraded to Edyfra Plus. Enjoy unlimited Mash AI and more!`,
        });
      } else if (payment.paymentType === "session") {
        // Handle Session Payment
        const session = await prisma.session.findUnique({
          where: { id: payment.targetId! },
          include: { student: true, partner: true }
        });

        if (session) {
          const gross = payment.amount;
          const platformFee = Math.round(gross * 0.20);
          const tutorPayout = gross - platformFee;

          await prisma.session.update({
            where: { id: session.id },
            data: { status: "ACTIVE", paymentStatus: "HELD" }
          });

          await prisma.sessionPayment.create({
            data: {
              sessionId: session.id,
              studentId: session.studentId,
              tutorId: session.partnerId!,
              grossAmount: gross,
              platformFee,
              tutorPayout,
              mpesaReceipt,
              paidAt: new Date(),
            }
          });

          // Notify Tutor
          await notifyUser(session.partnerId!, {
            type: "SESSION",
            title: "Session Paid",
            body: `${session.student.name} has paid for your ${session.subject} session. You can now start the call.`,
            actionUrl: `/study-room/${session.id}`,
          });

          // Notify Student
          await notifyUser(session.studentId, {
            type: "SESSION",
            title: "Payment Confirmed",
            body: `Your payment of KES ${gross} has been received. Your tutor has been notified.`,
            actionUrl: `/study-room/${session.id}`,
          });
        }
      } else if (payment.paymentType === "resource") {
        // Handle Resource Payment
        const resource = await prisma.resource.findUnique({
          where: { id: payment.targetId! }
        });

        if (resource) {
          const gross = payment.amount;
          const platformFee = Math.round(gross * 0.30);
          const sellerPayout = gross - platformFee;

          await prisma.resourcePurchase.create({
            data: {
              userId: payment.userId,
              resourceId: resource.id,
              amount: gross,
              platformFee,
              sellerPayout,
              mpesaReceipt,
              paidAt: new Date(),
            }
          });

          // Notify Buyer
          await notifyUser(payment.userId, {
            type: "MARKETPLACE",
            title: "Resource Purchased",
            body: `You have successfully purchased "${resource.title}". You can now download it from the marketplace.`,
            actionUrl: `/dashboard/resources`,
          });
        }
      }
      
      console.log(`[Mpesa Callback] Payment SUCCESS: ${CheckoutRequestID} (${payment.paymentType})`);
    } else {
      // Failure
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
        },
      });
      console.log(`[Mpesa Callback] Payment FAILED: ${CheckoutRequestID} - ${ResultDesc}`);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error("[Mpesa Callback] Error processing:", error.message);
    // Always return 0 to Safaricom to acknowledge receipt, even if processing failed
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
