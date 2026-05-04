// Anthropic client and lead reply generator.
// All Claude calls go through generateLeadReply() — never call the SDK inline.
// System prompt lives in prompts/lead-qualification.md and is loaded once at runtime.

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// Sonnet for leasing conversations — the quality difference closes more leases than Haiku saves in cost
const MODEL = "claude-sonnet-4-6";
// SMS replies are 1-3 short sentences. 120 tokens is enough for ~25-35 words. Forces the model
// to stay tight rather than producing essays. Raised slightly only for objection-heavy paths
// is unnecessary — the prompt itself enforces brevity.
const MAX_TOKENS = 120;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateLeadReplyInput {
  propertyName: string;
  propertyAddress?: string;    // full address — share when lead asks for location/directions
  activeSpecial?: string;      // only passed if one exists — never invent one
  tourBookingUrl?: string;     // self-service tour scheduling link
  leadName: string;
  leadEmail?: string;          // current email on file, if any
  needsName?: boolean;         // true if lead's name is unknown/placeholder — AI must ask
  needsEmail?: boolean;        // true if lead has no email on file — AI must ask
  moveInDate?: string;         // ISO date or undefined
  bedrooms?: number;           // 0 = studio
  budgetMin?: number;
  budgetMax?: number;
  trigger: "new_lead" | "inbound_sms" | "follow_up" | "post_tour" | "application_nudge";
  tourScheduledAt?: string;   // ISO datetime — passed for post_tour / application_nudge
  applicationLink?: string;   // passed for application_nudge
  conversationHistory: string; // pre-formatted prior messages, oldest first
  propertyContext?: string;    // formatted output of formatPropertyAIContext()
  attemptNumber?: number;      // total outbound attempts so far (1 = first contact)
  followUpPhase?: "burst" | "nurture"; // burst = active qualification, nurture = long-term check-ins
}

export interface GenerateLeadReplyOutput {
  message: string;          // plain SMS text, ready to send (tags stripped)
  tourBookingAt?: string;   // ISO datetime string if the AI confirmed a tour, else undefined
  applicationCompleted?: boolean; // true if AI detected the lead said they finished applying
  parsedName?: string;      // [LEAD_NAME:...]
  parsedEmail?: string;     // [LEAD_EMAIL:...]
  parsedMoveInDate?: string;     // [LEAD_MOVE_IN:YYYY-MM-DD]
  parsedBudgetMin?: number;      // [LEAD_BUDGET_MIN:1000]
  parsedBudgetMax?: number;      // [LEAD_BUDGET_MAX:1500]
  parsedBedrooms?: number;       // [LEAD_BEDROOMS:2] — 0 means studio
  parsedPets?: boolean;          // [LEAD_PETS:yes|no]
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

  let triggerInstructions = "";
  if (input.trigger === "post_tour") {
    // Two distinct scenarios depending on how recent the tour was
    const scheduledMs = input.tourScheduledAt ? new Date(input.tourScheduledAt).getTime() : 0;
    const hoursSince = scheduledMs ? (Date.now() - scheduledMs) / 3600000 : 0;
    if (hoursSince < 0.5) {
      // Tour is starting now or just started — confirm they made it
      triggerInstructions =
        "\nTRIGGER: The tour is happening right now (or starting in the next few minutes). " +
        "Send a short message confirming you saw they were scheduled. Ask if they made it onsite ok " +
        "or if they need directions. Do not be pushy. One sentence is enough.\n";
    } else {
      // Tour was earlier today / yesterday — ask how it went and gauge interest
      triggerInstructions =
        "\nTRIGGER: The lead just toured. Ask how the tour went. Then ask, plainly, if they are " +
        "thinking about applying. Be warm but direct. If they say yes, send the application link if " +
        "you have one. If they need a beat, leave the door open without pressure. Two short sentences.\n";
    }
  } else if (input.trigger === "application_nudge") {
    const appLink = input.applicationLink ? ` Application link: ${input.applicationLink}` : "";
    triggerInstructions =
      "\nTRIGGER: The lead toured yesterday and hasn't submitted an application yet. Check in: " +
      "ask if they have any questions and gently nudge them toward starting the application. " +
      "If they reply that they applied, finished it, or sent it in, append [APPLICATION_COMPLETE] " +
      "at the very end of your next reply on its own line." + appLink + "\n";
  }

  // Always-on application detection rule
  triggerInstructions +=
    "\nAPPLICATION COMPLETION DETECTION: At any point in the conversation, if the lead clearly " +
    "states they have finished, submitted, sent, or completed the application (examples: 'I just " +
    "applied', 'application is in', 'I submitted it', 'just sent the application'), append the tag " +
    "[APPLICATION_COMPLETE] on its own line at the very end of your reply. The system uses this to " +
    "alert the leasing team. Do not append it for half-statements like 'I will apply tonight' or " +
    "'I started filling it out' — only when they confirm it is done.\n";

  // Identification block: if name/email is missing, the AI MUST ask before answering anything else.
  if (input.needsName || input.needsEmail) {
    const missingPieces: string[] = [];
    if (input.needsName)  missingPieces.push("full name");
    if (input.needsEmail) missingPieces.push("email");
    const piecesLabel = missingPieces.join(" and ");

    triggerInstructions +=
      `\nIDENTIFICATION REQUIRED: We do not have this lead's ${piecesLabel} on file yet. ` +
      `Your top priority for this reply is to get the missing info. Be warm and brief: thank them ` +
      `for reaching out, then ask for their ${piecesLabel} so the leasing team can keep track. ` +
      `Do NOT answer pricing, tour, or unit questions in detail until they share that. A short ` +
      `acknowledgment is fine ("Definitely happy to help with that — first, mind sharing your ${piecesLabel}? ` +
      `Just so I can keep your file straight.").\n` +
      `\nWhen the lead provides their info in this message or any future message, capture it with tags ` +
      `at the very end of your reply, each on its own line:\n` +
      `  [LEAD_NAME:Their Full Name]\n` +
      `  [LEAD_EMAIL:their.email@example.com]\n` +
      `Only include the tag for fields they actually provided. Do not invent values or guess. ` +
      `Use the exact spelling and casing they used. After tagging, continue the conversation normally — ` +
      `acknowledge them by their first name and move forward with qualification.\n`;
  } else {
    // Always-on rule even when name/email are present — leads sometimes update them mid-thread.
    triggerInstructions +=
      `\nLEAD INFO UPDATE DETECTION: If the lead corrects their name (e.g. "Actually it's Sarah, not ` +
      `Sara") or shares a new/updated email at any point, capture it with [LEAD_NAME:...] or ` +
      `[LEAD_EMAIL:...] tags on their own lines at the end of your reply. Don't tag info we already have.\n`;
  }

  // Always-on qualification capture — applies to every reply.
  triggerInstructions +=
    `\nQUALIFICATION CAPTURE: When the lead shares any of the following, append the matching tag(s) ` +
    `on their own lines at the very end of your reply. Tags are stripped before sending — the lead ` +
    `never sees them. Do NOT tag info that's already on file (see "Known info" above) unless the ` +
    `lead corrected it. Do NOT guess. If they're vague ("sometime in spring"), don't tag it.\n` +
    `  [LEAD_MOVE_IN:YYYY-MM-DD] — exact target move-in date the lead committed to. Resolve relative ` +
    `dates against today's date (e.g. "next month" → first of that month). Only tag if they gave a ` +
    `concrete date or month they're locked on. Convert "May 1st" to that year's date.\n` +
    `  [LEAD_BUDGET_MIN:1200] — bottom of their stated monthly rent range, in whole dollars (no $/comma).\n` +
    `  [LEAD_BUDGET_MAX:1500] — top of their stated monthly rent range. If they gave a single number ` +
    `("$1500"), set both MIN and MAX to that value.\n` +
    `  [LEAD_BEDROOMS:2] — bedroom count. Use 0 for studio.\n` +
    `  [LEAD_PETS:yes] or [LEAD_PETS:no] — only when they clearly state if they have pets.\n`;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in server local time

  return `
${contextBlock}${tourLine}${phaseBlock}${triggerInstructions}
Today's date: ${today}
Property: ${input.propertyName}
Lead name: ${input.leadName}
Trigger: ${input.trigger}

Known info:
- Lead name on file: ${input.leadName}${input.needsName ? " (PLACEHOLDER — ask for real name)" : ""}
- Lead email on file: ${input.leadEmail ?? "(none)"}${input.needsEmail ? " (MISSING — ask for email)" : ""}
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

  // Extract [APPLICATION_COMPLETE] tag if present, then strip from SMS text
  const appCompleteMatch = raw.match(/\[APPLICATION_COMPLETE\]/);
  const applicationCompleted = Boolean(appCompleteMatch);

  // Extract [LEAD_NAME:...] and [LEAD_EMAIL:...] tags. Trim whitespace + drop quotes.
  const nameMatch  = raw.match(/\[LEAD_NAME:([^\]]+)\]/i);
  const emailMatch = raw.match(/\[LEAD_EMAIL:([^\]]+)\]/i);
  const parsedName  = nameMatch  ? nameMatch[1].trim().replace(/^["']|["']$/g, "")  : undefined;
  const parsedEmailRaw = emailMatch ? emailMatch[1].trim().replace(/^["']|["']$/g, "") : undefined;
  // Only accept emails that look valid — don't pollute the DB with malformed strings.
  const parsedEmail = parsedEmailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedEmailRaw)
    ? parsedEmailRaw
    : undefined;

  // Qualification fields — sanitize each so a malformed tag never corrupts the DB.
  const moveInMatch  = raw.match(/\[LEAD_MOVE_IN:(\d{4}-\d{2}-\d{2})\]/i);
  const parsedMoveInDate = moveInMatch ? moveInMatch[1] : undefined;

  const budgetMinMatch = raw.match(/\[LEAD_BUDGET_MIN:(\d+)\]/i);
  const parsedBudgetMin = budgetMinMatch ? parseInt(budgetMinMatch[1], 10) : undefined;

  const budgetMaxMatch = raw.match(/\[LEAD_BUDGET_MAX:(\d+)\]/i);
  const parsedBudgetMax = budgetMaxMatch ? parseInt(budgetMaxMatch[1], 10) : undefined;

  const bedroomsMatch = raw.match(/\[LEAD_BEDROOMS:(\d+)\]/i);
  const parsedBedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined;

  const petsMatch = raw.match(/\[LEAD_PETS:(yes|no|true|false)\]/i);
  const parsedPets = petsMatch ? /^(yes|true)$/i.test(petsMatch[1]) : undefined;

  let message = raw
    .replace(/\s*\[TOUR_BOOKED:[^\]]+\]\s*/g, "")
    .replace(/\s*\[APPLICATION_COMPLETE\]\s*/g, "")
    .replace(/\s*\[LEAD_NAME:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_EMAIL:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_MOVE_IN:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_BUDGET_MIN:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_BUDGET_MAX:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_BEDROOMS:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[LEAD_PETS:[^\]]+\]\s*/gi, "")
    .trim();

  // Safety net: real humans don't write em-dashes in SMS. Replace any that slipped through.
  // Convert " — " (with spaces) into ". " (sentence break) and bare "—"/"–" into ", " or " ".
  message = message
    .replace(/\s+—\s+/g, ". ")
    .replace(/\s+–\s+/g, ". ")
    .replace(/[—–]/g, ", ")
    .replace(/\.\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    message,
    tourBookingAt,
    applicationCompleted,
    parsedName,
    parsedEmail,
    parsedMoveInDate,
    parsedBudgetMin,
    parsedBudgetMax,
    parsedBedrooms,
    parsedPets,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
