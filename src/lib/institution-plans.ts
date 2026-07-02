import type { InstitutionPlan } from "@/generated/client";

export interface PlanDefinition {
  tier: InstitutionPlan;
  name: string;
  tagline: string;
  monthlyKsh: number;
  studentCap: number | null;
  features: string[];
  popular?: boolean;
}

export const INSTITUTION_PLANS: PlanDefinition[] = [
  {
    tier: "STARTER",
    name: "Starter",
    tagline: "For small schools getting started",
    monthlyKsh: 5000,
    studentCap: 100,
    features: [
      "Up to 100 students",
      "Unlimited teacher accounts",
      "Holiday coaching system",
      "CSV results upload",
      "Performance analytics",
      "Email support",
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    tagline: "Most chosen by mid-sized schools",
    monthlyKsh: 15000,
    studentCap: 500,
    popular: true,
    features: [
      "Up to 500 students",
      "Everything in Starter",
      "AI-generated student insights",
      "Custom branding",
      "Priority support",
      "Holiday coaching sessions",
    ],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Unlimited scale, custom needs",
    monthlyKsh: 40000,
    studentCap: null,
    features: [
      "Unlimited students",
      "Everything in Growth",
      "Dedicated account manager",
      "Custom onboarding",
      "API access",
      "SLA-backed uptime",
    ],
  },
];

export function getPlan(tier: InstitutionPlan | null | undefined): PlanDefinition {
  return INSTITUTION_PLANS.find((p) => p.tier === tier) ?? INSTITUTION_PLANS[0];
}

// Performance flag thresholds (spec § 4, automatic analysis).
export const FLAG_THRESHOLDS = {
  CRITICAL: 40,
  AT_RISK: 50,
  MONITORING: 60,
  ON_TRACK: 80,
} as const;

export function deriveFlag(marks: number): "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT" {
  if (marks < FLAG_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (marks < FLAG_THRESHOLDS.AT_RISK) return "AT_RISK";
  if (marks < FLAG_THRESHOLDS.MONITORING) return "MONITORING";
  if (marks < FLAG_THRESHOLDS.ON_TRACK) return "ON_TRACK";
  return "EXCELLENT";
}

export function deriveOverallStatus(
  subjects: { flag: "CRITICAL" | "AT_RISK" | "MONITORING" | "ON_TRACK" | "EXCELLENT" }[],
): "RED" | "YELLOW" | "GREEN" {
  const critical = subjects.filter((s) => s.flag === "CRITICAL").length;
  const atRisk = subjects.filter((s) => s.flag === "AT_RISK").length;
  if (critical >= 2) return "RED";
  if (critical >= 1 || atRisk >= 2) return "YELLOW";
  return "GREEN";
}

export function deriveTrend(currentMarks: number, lastTermMarks: number | null | undefined): "IMPROVING" | "DECLINING" | "STABLE" {
  if (lastTermMarks == null) return "STABLE";
  const diff = currentMarks - lastTermMarks;
  if (diff >= 3) return "IMPROVING";
  if (diff <= -3) return "DECLINING";
  return "STABLE";
}
