import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cache, TTL } from "@/lib/cache";

const CACHE_KEY = "api:plans";

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

    // Use the anon client — RLS policy grants anon SELECT on plans (public pricing data).
    // Service-role must never be used for unauthenticated public routes.
    const supabase = await createClient();
    const { data: plans } = await supabase
      .from("plans")
      .select("*")
      .order("monthly_price", { ascending: true });

    const transformed = (plans || []).map((plan) => {
      const features = plan.features as PlanFeatures;
      const monthlyPrice = Number(plan.monthly_price || 0);
      const yearlyPrice = plan.yearly_price ? Number(plan.yearly_price) : monthlyPrice * 10;
      return {
        name: plan.name,
        price: monthlyPrice.toString(),
        yearlyPrice: yearlyPrice.toString(),
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
    console.error("plans GET error:", error);
    return NextResponse.json({ plans: [] });
  }
}
