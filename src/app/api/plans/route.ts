import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cache, TTL } from "@/lib/cache";
import { captureApiError } from "@/lib/sentry";

const CACHE_KEY = "api:plans";

export async function GET(request: Request) {
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
