"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type Tier = "free" | "pro" | "institution";

interface PlanState {
  tier: Tier;
  limits: {
    maxSearches: number;
    maxMessages: number;
  };
  currentUsage: {
    searches: number;
    messages: number;
  };
  isLoading: boolean;
}

const TIER_LIMITS = {
  free: { maxSearches: 20, maxMessages: 5 },
  pro: { maxSearches: Infinity, maxMessages: Infinity },
  institution: { maxSearches: Infinity, maxMessages: Infinity },
};

export function usePlan() {
  const [state, setState] = useState<PlanState>({
    tier: "free",
    limits: TIER_LIMITS.free,
    currentUsage: { searches: 0, messages: 0 },
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const { data, error } = await supabase
        .from("User")
        .select("subscription_tier, daily_search_count, daily_message_count")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        const tier = (data.subscription_tier as Tier) || "free";
        setState({
          tier,
          limits: TIER_LIMITS[tier],
          currentUsage: {
            searches: data.daily_search_count || 0,
            messages: data.daily_message_count || 0,
          },
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchPlan();
  }, []);

  const canSearch = state.tier !== "free" || state.currentUsage.searches < state.limits.maxSearches;
  const canMessage = state.tier !== "free" || state.currentUsage.messages < state.limits.maxMessages;

  return { ...state, canSearch, canMessage };
}
