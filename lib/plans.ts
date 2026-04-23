// Single source of truth for plan tiers and access rules.
//
// Tiers (ascending):  starter → pro → portfolio
// Marketing add-on:   available on any tier, stored in billing_subscriptions.marketing_addon
//
// Rule: lower tiers get ALL features upper tiers have.
// The only differences between tiers are property count limits.
// Marketing features are gated by the add-on flag, not by tier.

export type Plan = "starter" | "pro" | "portfolio";

// ── Plan config ────────────────────────────────────────────────────────────────

interface PlanConfig {
  label:         string;
  monthlyPrice:  number;       // dollars
  performanceFee: number;      // dollars per lease
  maxProperties: number | null; // null = unlimited
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  starter: {
    label:          "Starter",
    monthlyPrice:   500,
    performanceFee: 150,
    maxProperties:  3,
  },
  pro: {
    label:          "Pro",
    monthlyPrice:   1500,
    performanceFee: 200,
    maxProperties:  20,
  },
  portfolio: {
    label:          "Portfolio",
    monthlyPrice:   3000,
    performanceFee: 250,
    maxProperties:  null,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIG[plan as Plan] ?? PLAN_CONFIG.starter;
}

export function getPropertyLimit(plan: string): number | null {
  return getPlanConfig(plan).maxProperties;
}

export function canAddProperty(plan: string, currentCount: number): boolean {
  const limit = getPropertyLimit(plan);
  return limit === null || currentCount < limit;
}

export function getPerformanceFee(plan: string): number {
  return getPlanConfig(plan).performanceFee;
}

// Returns the plan label for display
export function getPlanLabel(plan: string): string {
  return getPlanConfig(plan).label;
}

// Normalizes legacy plan slugs from old checkout flow to canonical values
export function normalizePlan(raw: string): Plan {
  const map: Record<string, Plan> = {
    starter:    "starter",
    core:       "starter",
    growth:     "pro",
    pro:        "pro",
    enterprise: "portfolio",
    portfolio:  "portfolio",
  };
  return map[raw] ?? "starter";
}
