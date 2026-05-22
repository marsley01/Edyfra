"use client";

import { useEffect, useState } from "react";
import { getUserData } from "@/app/actions/user";

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
    async function fetchPlan() {
      const user = await getUserData();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const tier = ((user.subscriptionTier || user.plan || "free") as Tier);

      setState({
        tier,
        limits: TIER_LIMITS[tier],
        currentUsage: {
          searches: user.dailySearchCount || 0,
          messages: user.dailyMessageCount || 0,
        },
        isLoading: false,
      });
    }

    fetchPlan();
  }, []);

  const canSearch = state.tier !== "free" || state.currentUsage.searches < state.limits.maxSearches;
  const canMessage = state.tier !== "free" || state.currentUsage.messages < state.limits.maxMessages;

  return { ...state, canSearch, canMessage };
}
