import { getAnthropicClient } from "@/lib/anthropic";
import type { Lead } from "@/lib/types";

export interface QualificationResult {
  score: number; // 1–10
  summary: string;
  move_in_date?: string; // ISO date string e.g. "2025-07-01"
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  pets?: boolean;
}

export async function qualifyLead(
  lead: Pick<Lead, "name" | "phone">,
  conversationHistory: string
): Promise<QualificationResult> {
  const client = getAnthropicClient();

  const prompt = `
You are a leasing assistant AI for a multifamily apartment community.
Analyze the following lead information and conversation history, then return a JSON qualification report.

Lead name: ${lead.name}
Lead phone: ${lead.phone}

Conversation history:
${conversationHistory || "No conversation yet — this is a new inquiry."}

Return ONLY a valid JSON object with these fields (no markdown, no explanation):
{
  "score": <integer 1-10, where 10 = highly qualified, ready to move>,
  "summary": "<2-3 sentence summary of the lead's situation and quality>",
  "move_in_date": "<ISO date string or null>",
  "budget_min": <integer monthly rent or null>,
  "budget_max": <integer monthly rent or null>,
  "bedrooms": <integer or null>,
  "pets": <true | false | null>
}

Scoring guide:
- 8–10: Clear timeline, budget fits, ready to act
- 5–7: Some info missing, follow-up needed
- 1–4: Vague, unlikely to convert, or out of range
`.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const result: QualificationResult = JSON.parse(text);
  return result;
}
