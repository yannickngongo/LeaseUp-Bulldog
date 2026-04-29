// POST /api/follow-up/execute — called by Vercel Cron every 15 minutes
// Claims and executes all pending follow-up tasks that are due.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { executeFollowUp } from "@/lib/follow-up";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Verify this is called by Vercel Cron (or internally)
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  const now = new Date().toISOString();

  // Fetch all pending tasks due now — includes first-time tasks and retry-eligible tasks
  const { data: tasks, error } = await db
    .from("follow_up_tasks")
    .select("id, lead_id, property_id, trigger_reason")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .or(`retry_count.eq.0,retry_at.lte.${now}`)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[follow-up/execute] failed to fetch tasks:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks?.length) {
    return NextResponse.json({ executed: 0 });
  }

  // Execute tasks sequentially to avoid Twilio rate limits
  const results: Array<{ id: string; status: "ok" | "error"; error?: string }> = [];

  for (const task of tasks) {
    try {
      await executeFollowUp(task.id);
      results.push({ id: task.id, status: "ok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[follow-up/execute] task ${task.id} failed:`, msg);
      results.push({ id: task.id, status: "error", error: msg });
    }
  }

  const succeeded = results.filter(r => r.status === "ok").length;
  const failed = results.filter(r => r.status === "error").length;

  console.log(`[follow-up/execute] executed ${succeeded} tasks, ${failed} failed`);

  return NextResponse.json({ executed: succeeded, failed, results });
}
