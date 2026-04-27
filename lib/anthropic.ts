// Anthropic client and lead reply generator.
// All Claude calls go through generateLeadReply() — never call the SDK inline.
// System prompt lives in prompts/lead-qualification.md and is loaded once at runtime.

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// Sonnet for leasing conversations — the quality difference closes more leases than Haiku saves in cost
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 350; // SMS replies are short but objection handling needs room to breathe

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateLeadReplyInput {
  propertyName: string;
  propertyAddress?: string;    // full address — share when lead asks for location/directions
  activeSpecial?: string;      // only passed if one exists — never invent one
  tourBookingUrl?: string;     // self-service tour scheduling link
  leadName: string;
  moveInDate?: string;         // ISO date or undefined
  bedrooms?: number;           // 0 = studio
  budgetMin?: number;
  budgetMax?: number;
  trigger: "new_lead" | "inbound_sms" | "follow_up";
  conversationHistory: string; // pre-formatted prior messages, oldest first
  propertyContext?: string;    // formatted output of formatPropertyAIContext()
  attemptNumber?: number;      // total outbound attempts so far (1 = first contact)
  followUpPhase?: "burst" | "nurture"; // burst = active qualification, nurture = long-term check-ins
}

export interface GenerateLeadReplyOutput {
  message: string;      // plain SMS text, ready to send (booking tag stripped)
  tourBookingAt?: string; // ISO datetime string if the AI confirmed a tour, else undefined
  model: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY — check .env.local");
  _client = new Anthropic({ apiKey });
  return _client;
}

// ─── System prompt ────────────────────────────────────────────────────────────

// Loaded once at module init — avoids repeated disk reads on each request.
// The file is treated as a template; variables are injected in buildUserPrompt().
let _systemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (_systemPrompt) return _systemPrompt;
  const filePath = path.join(process.cwd(), "prompts", "lead-qualification.md");
  _systemPrompt = fs.readFileSync(filePath, "utf-8");
  return _systemPrompt;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserPrompt(input: GenerateLeadReplyInput): string {
  const bedroomLabel =
    input.bedrooms === undefined
      ? "Unknown"
      : input.bedrooms === 0
      ? "Studio"
      : `${input.bedrooms}BR`;

  const budgetLabel =
    input.budgetMin && input.budgetMax
      ? `$${input.budgetMin}–$${input.budgetMax}/mo`
      : input.budgetMax
      ? `Up to $${input.budgetMax}/mo`
      : "Unknown";

  const addressLine = input.propertyAddress
    ? `Property address: ${input.propertyAddress} — share this when the lead asks for the location, address, or directions.\n`
    : "";

  const contextBlock = input.propertyContext
    ? `${input.propertyContext}\n${addressLine}`
    : `Active special: ${input.activeSpecial ?? "None — do not mention any specials"}\n${addressLine}`;

  const tourLine = input.tourBookingUrl
    ? `Tour booking link: ${input.tourBookingUrl} — share this link when offering a tour so the lead can self-schedule.\n`
    : `Tour booking: No self-service link available — ask the lead to reply to arrange a tour time.\n`;

  const phaseBlock =
    input.followUpPhase && input.attemptNumber !== undefined
      ? `Follow-up phase: ${input.followUpPhase} (attempt ${input.attemptNumber})\n`
      : "";

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in server local time

  return `
${contextBlock}${tourLine}${phaseBlock}
Today's date: ${today}
Property: ${input.propertyName}
Lead name: ${input.leadName}
Trigger: ${input.trigger}

Known info:
- Move-in date: ${input.moveInDate ?? "Unknown"}
- Unit type: ${bedroomLabel}
- Budget: ${budgetLabel}

Conversation history (oldest first, newest last):
${input.conversationHistory || "No prior messages — this is the first contact."}

Write the next SMS message to ${input.leadName}.
`.trim();
}

// Exported for lower-level use (e.g. JSON extraction calls that aren't SMS replies)
export { getClient as getAnthropicClient };

// ─── generateLeadReply ────────────────────────────────────────────────────────

export async function generateLeadReply(
  input: GenerateLeadReplyInput
): Promise<GenerateLeadReplyOutput> {
  const client = getClient();
  const systemPrompt = getSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Cache the static system prompt — saves time-to-first-token on repeat calls
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude: " + block.type);
  }

  const raw = block.text.trim().replace(/^["']|["']$/g, "");

  // Extract [TOUR_BOOKED:YYYY-MM-DDTHH:MM] tag if present, then strip it from SMS text
  const tourTagMatch = raw.match(/\[TOUR_BOOKED:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\]/);
  const tourBookingAt = tourTagMatch ? `${tourTagMatch[1]}:00` : undefined;
  const message = raw.replace(/\s*\[TOUR_BOOKED:[^\]]+\]\s*/g, "").trim();

  return {
    message,
    tourBookingAt,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
