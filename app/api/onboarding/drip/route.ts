// POST /api/onboarding/drip
// Runs on a daily cron — sends Day 3 and Day 7 onboarding emails to new operators.
// Called by Vercel Cron (see vercel.json).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendDay3Email, sendDay7Email } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const now = new Date();

  const { data: operators, error } = await db
    .from("operators")
    .select("id, email, name, created_at, onboarding_day3_sent, onboarding_day7_sent")
    .not("email", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let day3Count = 0;
  let day7Count = 0;

  for (const op of operators ?? []) {
    if (!op.email || !op.created_at) continue;

    const created = new Date(op.created_at);
    const daysSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    const firstName = (op.name as string)?.split(" ")[0] ?? op.email.split("@")[0];

    // Day 3 email — send between day 3 and 4
    if (daysSince >= 3 && daysSince < 4 && !op.onboarding_day3_sent) {
      try {
        await sendDay3Email({ to: op.email, firstName });
        await db.from("operators").update({ onboarding_day3_sent: true }).eq("id", op.id);
        day3Count++;
      } catch (err) {
        console.error("[onboarding/drip] day3 failed for", op.email, err);
      }
    }

    // Day 7 email — send between day 7 and 8
    if (daysSince >= 7 && daysSince < 8 && !op.onboarding_day7_sent) {
      try {
        await sendDay7Email({ to: op.email, firstName });
        await db.from("operators").update({ onboarding_day7_sent: true }).eq("id", op.id);
        day7Count++;
      } catch (err) {
        console.error("[onboarding/drip] day7 failed for", op.email, err);
      }
    }
  }

  return NextResponse.json({ ok: true, day3Count, day7Count });
}
