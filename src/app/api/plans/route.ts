import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cache, TTL } from "@/lib/cache";
import { captureApiError } from "@/lib/sentry";

interface PlanFeatures {
  description?: string;
  list?: string[];
  popular?: boolean;
  buttonText?: string;
}

export async function GET() {
  try {
    // Serve from cache when available (plans rarely change)
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" },
      });
    }

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

    const payload = { plans: transformed };
    cache.set(CACHE_KEY, payload, TTL.PLANS);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" },
    });
  } catch (error) {
    captureApiError(error, request, { context: "plans GET" });
    return NextResponse.json({ plans: [] });
  }
}
