import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" },
    });

    const transformed = plans.map((plan) => ({
      name: plan.name,
      price: plan.monthlyPrice.toString(),
      yearlyPrice: (plan.yearlyPrice || plan.monthlyPrice * 10).toString(),
      description: (plan.features as any)?.description || "",
      features: (plan.features as any)?.list || [],
      popular: (plan.features as any)?.popular || false,
      current: false,
      buttonText: (plan.features as any)?.buttonText || "Select Plan",
    }));

    return NextResponse.json({ plans: transformed });
  } catch (error) {
    console.error("[Plans API] Error:", error);
    return NextResponse.json({ plans: [] });
  }
}
