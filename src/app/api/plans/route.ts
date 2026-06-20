import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface PlanFeatures {
  description?: string;
  list?: string[];
  popular?: boolean;
  buttonText?: string;
}

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" },
    });

    const transformed = plans.map((plan) => {
      const features = plan.features as PlanFeatures;
      return {
        name: plan.name,
        price: plan.monthlyPrice.toString(),
        yearlyPrice: (plan.yearlyPrice || plan.monthlyPrice * 10).toString(),
        description: features?.description || "",
        features: features?.list || [],
        popular: features?.popular || false,
        current: false,
        buttonText: features?.buttonText || "Select Plan",
      };
    });

    return NextResponse.json({ plans: transformed });
  } catch (error) {
    console.error("[Plans API] Error:", error);
    return NextResponse.json({ plans: [] });
  }
}
