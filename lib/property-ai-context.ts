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

  // ── Special offer ──────────────────────────────────────────────────────────
  if (config.leasing_special_title) {
    lines.push(`\nCurrent Special: ${config.leasing_special_title}`);
    if (config.leasing_special_description) {
      lines.push(`Special Details: ${config.leasing_special_description}`);
    }
  } else {
    lines.push("\nCurrent Special: NONE — do not mention or imply any special offer.");
  }

  // ── Unit mix & pricing — the most important context block ─────────────────
  const mix = config.unit_mix ?? [];
  if (mix.length > 0) {
    lines.push("\nAvailable Unit Types:");
    for (const u of mix) {
      const size = u.sq_ft_min && u.sq_ft_max
        ? ` | ${u.sq_ft_min}–${u.sq_ft_max} sq ft`
        : u.sq_ft_min ? ` | ${u.sq_ft_min}+ sq ft` : "";
      const rent = u.rent_min && u.rent_max
        ? `$${u.rent_min.toLocaleString()}–$${u.rent_max.toLocaleString()}/mo`
        : u.rent_min ? `from $${u.rent_min.toLocaleString()}/mo`
        : u.rent_max ? `up to $${u.rent_max.toLocaleString()}/mo`
        : "Pricing not listed";
      const baths = u.bathrooms === 1 ? "1 bath" : `${u.bathrooms} baths`;
      const avail = u.available === 0 ? "waitlist only" : `${u.available} available`;
      lines.push(`  • ${u.label} (${u.bedrooms === 0 ? "Studio" : `${u.bedrooms}BR`} / ${baths}${size}): ${rent} — ${avail} of ${u.total} total`);
    }
    lines.push("When a lead asks about pricing or availability, use these exact figures. Do not round or approximate.");
  } else if (config.pricing_notes) {
    lines.push(`\nPricing: ${config.pricing_notes}`);
  } else {
    lines.push("\nPricing: Not provided — do not quote any prices or availability.");
  }

  if (config.pricing_notes && mix.length > 0) {
    lines.push(`Pricing Notes: ${config.pricing_notes}`);
  }

  // ── Property details ───────────────────────────────────────────────────────
  const amenities = config.amenities ?? [];
  if (amenities.length > 0) {
    lines.push(`\nAmenities: ${amenities.join(", ")}`);
    lines.push("You may mention amenities when relevant to a lead's question or to add value — do not list all of them unprompted.");
  }

  if (config.pet_policy) {
    lines.push(`\nPet Policy: ${config.pet_policy}`);
    lines.push("Give this exact answer when asked about pets — do not guess or say 'it depends'.");
  } else {
    lines.push("\nPet Policy: Not confirmed — if asked, say you'll check and follow up.");
  }

  if (config.parking_info) {
    lines.push(`\nParking: ${config.parking_info}`);
  } else {
    lines.push("\nParking: Not confirmed — if asked, say you'll find out.");
  }

  if (config.laundry_info) {
    lines.push(`\nLaundry: ${config.laundry_info}`);
  }

  if (config.utilities_included) {
    lines.push(`\nUtilities Included: ${config.utilities_included}`);
  } else {
    lines.push("\nUtilities: Not confirmed — do not state what is or isn't included.");
  }

  // ── Leasing process ────────────────────────────────────────────────────────
  if (config.tour_instructions) {
    lines.push(`\nTour Scheduling: ${config.tour_instructions}`);
  }

  if (config.office_hours) {
    lines.push(`Office Hours: ${config.office_hours}`);
  }

  if (config.application_link) {
    lines.push(`Application Link: ${config.application_link}`);
  }

  // ── Approved Q&A ──────────────────────────────────────────────────────────
  if (config.approved_faqs?.length > 0) {
    lines.push("\nApproved Q&A (use these exact answers when the question matches):");
    for (const faq of config.approved_faqs) {
      lines.push(`  Q: ${faq.question}`);
      lines.push(`  A: ${faq.answer}`);
    }
  }

  // ── AI behavior controls ───────────────────────────────────────────────────
  if (config.objection_handling_notes) {
    lines.push(`\nObjection Handling Notes: ${config.objection_handling_notes}`);
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
  lines.push("You must not claim, imply, or promise anything not listed above. When in doubt, say you'll find out.");

  return lines.join("\n");
}
