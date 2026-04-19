// Fetches and formats property-level AI configuration for injection into prompts.
// The AI is ONLY permitted to reference data that appears in this context block.

import { getSupabaseAdmin } from "@/lib/supabase";
import type { PropertyAIConfig } from "@/lib/types";

export type { PropertyAIConfig };

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getPropertyAIContext(
  propertyId: string
): Promise<PropertyAIConfig | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("property_ai_configs")
    .select("*")
    .eq("property_id", propertyId)
    .single();

  if (error || !data) return null;
  return data as PropertyAIConfig;
}

// ─── Format ───────────────────────────────────────────────────────────────────
// Converts a PropertyAIConfig into a structured prompt block.
// Only includes fields that are explicitly set — never infers or defaults.

export function formatPropertyAIContext(config: PropertyAIConfig): string {
  const lines: string[] = ["=== PROPERTY CONTEXT (use ONLY what is listed here) ==="];

  if (config.leasing_special_title) {
    lines.push(`\nCurrent Special: ${config.leasing_special_title}`);
    if (config.leasing_special_description) {
      lines.push(`Special Details: ${config.leasing_special_description}`);
    }
  } else {
    lines.push("\nCurrent Special: NONE — do not mention or imply any special offer.");
  }

  if (config.pricing_notes) {
    lines.push(`\nPricing: ${config.pricing_notes}`);
  } else {
    lines.push("\nPricing: Not provided — do not quote any prices.");
  }

  if (config.tour_instructions) {
    lines.push(`\nTour Scheduling: ${config.tour_instructions}`);
  }

  if (config.office_hours) {
    lines.push(`Office Hours: ${config.office_hours}`);
  }

  if (config.application_link) {
    lines.push(`Application Link: ${config.application_link}`);
  }

  if (config.approved_faqs?.length > 0) {
    lines.push("\nApproved Q&A (only use these exact answers):");
    for (const faq of config.approved_faqs) {
      lines.push(`  Q: ${faq.question}`);
      lines.push(`  A: ${faq.answer}`);
    }
  }

  if (config.objection_handling_notes) {
    lines.push(`\nObjection Handling: ${config.objection_handling_notes}`);
  }

  if (config.allowed_messaging) {
    lines.push(`\nAllowed Messaging: ${config.allowed_messaging}`);
  }

  if (config.disallowed_claims) {
    lines.push(`\nDO NOT SAY: ${config.disallowed_claims}`);
  }

  if (config.escalation_triggers?.length) {
    lines.push(`\nEscalate to human if lead mentions: ${config.escalation_triggers.join(", ")}`);
  }

  lines.push("\n=== END PROPERTY CONTEXT ===");
  lines.push("You must not claim, imply, or promise anything not listed above.");

  return lines.join("\n");
}
