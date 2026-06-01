import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/notifications";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.warn("[Paystack Webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("[Paystack Webhook] Received event:", event.event);

    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;
      const metadata = data.metadata;

      // Find the pending payment
      const payment = await prisma.payment.findUnique({
        where: { checkoutRequestId: reference },
      });

      if (!payment) {
        console.warn("[Paystack Webhook] Payment not found for reference:", reference);
        return NextResponse.json({ status: "success" }); // Still return 200 to Paystack
      }

      if (payment.status === "completed") {
        return NextResponse.json({ status: "success" });
      }

      // Update payment to completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          mpesaReceiptNumber: data.id.toString(), // Paystack ID as receipt
          paidAt: new Date(),
        },
      });

// Handle specific payment types
       const { paymentType, userId, planType, targetId } = payment;

       if (paymentType === "subscription") {
         const durationDays = planType === "plus_yearly" ? 365 : 30;
         const billingCycle = planType === "plus_yearly" ? "yearly" : "monthly";

         await prisma.user.update({
           where: { id: userId },
           data: {
             plan: "plus",
             planStartedAt: new Date(),
             planExpiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
             planBillingCycle: billingCycle,
           },
         });

         await notifyUser(userId, {
           type: "SYSTEM",
           title: "Welcome to Edyfra Plus!",
           body: `Your account has been upgraded via Paystack. Enjoy unlimited Mash AI!`,
         });
       } else if (paymentType === "credit") {
         // Handle credit purchase
         const creditsPurchased = payment.amount; // Amount in KES equals credits
         
         await prisma.$transaction(async (tx) => {
           // Add credits to user's balance
           await tx.userCredits.upsert({
             where: { userId },
             update: { balance: { increment: creditsPurchased } },
             create: { userId, balance: creditsPurchased }
           });
           
           // Record transaction
           await tx.creditTransaction.create({
             data: {
               userId,
               amount: creditsPurchased, // Positive for credit
               type: "purchase",
               description: `Purchased ${creditsPurchased} study credits`,
               reference: reference,
             }
           });
         });

         await notifyUser(userId, {
           type: "SYSTEM",
           title: "Credits Added!",
           body: `${creditsPurchased} study credits have been added to your account.`,
         });
       } else if (paymentType === "session") {
         const session = await prisma.session.findUnique({
           where: { id: targetId! },
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
               mpesaReceipt: data.id.toString(),
               paidAt: new Date(),
             }
           });

           // Notifications...
           await notifyUser(session.partnerId!, {
             type: "SESSION",
             title: "Session Paid",
             body: `${session.student.name} has paid for the session. You can now start.`,
           });
         }
       } else if (paymentType === "resource") {
         const resource = await prisma.resource.findUnique({
           where: { id: targetId! }
         });

         if (resource) {
           const gross = payment.amount;
           const platformFee = Math.round(gross * 0.30);
           const sellerPayout = gross - platformFee;

           await prisma.resourcePurchase.create({
             data: {
               userId: userId,
               resourceId: resource.id,
               amount: gross,
               platformFee,
               sellerPayout,
               mpesaReceipt: data.id.toString(),
               paidAt: new Date(),
             }
           });
         }
       }
    }

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("[Paystack Webhook] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
