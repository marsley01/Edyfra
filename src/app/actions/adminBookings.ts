import { Role } from "@/generated/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Fetch all booking sessions for admin overview */
export async function getAllBookings() {
  try {
    // Return all sessions regardless of status, include tutor and student info
    const sessions = await prisma.session.findMany({
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        partner: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { id: "desc" },
    });
    return sessions;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
}

/** Admin can update booking status (e.g., confirm or cancel) */
export async function updateBookingStatus(sessionId: string, status: "ACTIVE" | "CANCELLED" | "COMPLETED") {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status },
    });
    // Revalidate admin pages that list bookings
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return { success: false, error: "Failed to update" };
  }
}
