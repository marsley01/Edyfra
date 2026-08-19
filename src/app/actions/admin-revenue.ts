"use server";

import prisma from "@/lib/prisma";
import { checkAdminStatus } from "@/app/actions/admin";

export async function markAllPayoutsPaid() {
  try {
    const isAdmin = await checkAdminStatus();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await prisma.sessionPayment.updateMany({
      where: {
        refundedAt: null,
        paidAt: null,
      },
      data: {
        paidAt: new Date(),
      },
    });

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error("Error marking payouts as paid:", error);
    return { success: false, error: "Failed to mark payouts as paid" };
  }
}