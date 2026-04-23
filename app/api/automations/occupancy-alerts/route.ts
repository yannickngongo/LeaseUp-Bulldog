// POST /api/automations/occupancy-alerts
// Called daily at 8am by Vercel cron. Alerts operators when pipeline is thin
// (no new leads in 7 days, or fewer than 3 active leads per property).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

interface PropertyRow {
  id: string;
  name: string;
  operator_id: string;
  operators: { email: string; name: string } | null;
}

interface LeadRow {
  status: string;
  created_at: string;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db  = getSupabaseAdmin();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  let alertsFired = 0;

  const { data: properties, error } = await db
    .from("properties")
    .select("id, name, operator_id, operators(email, name)");

  if (error || !properties) {
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }

  for (const property of properties as unknown as PropertyRow[]) {
    const { data: leads } = await db
      .from("leads")
      .select("status, created_at")
      .eq("property_id", property.id);

    if (!leads) continue;
    const rows = leads as LeadRow[];

    const activeLeads = rows.filter(l => !["won", "lost"].includes(l.status));
    const recentLeads = rows.filter(l => l.created_at >= sevenDaysAgo);

    const alerts: string[] = [];
    if (activeLeads.length < 3)     alerts.push(`thin_pipeline:active=${activeLeads.length}`);
    if (recentLeads.length === 0)   alerts.push("no_new_leads_7d");

    for (const alertType of alerts) {
      // Deduplicate: skip if same alert fired within last 24h
      const { count } = await db
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "occupancy_alert")
        .eq("property_id", property.id)
        .gte("created_at", new Date(now.getTime() - 86400000).toISOString())
        .contains("metadata", { alert_type: alertType });

      if ((count ?? 0) > 0) continue;

      await db.from("activity_logs").insert({
        action:      "occupancy_alert",
        actor:       "system",
        property_id: property.id,
        metadata: {
          alert_type:      alertType,
          active_leads:    activeLeads.length,
          recent_leads_7d: recentLeads.length,
          property_name:   property.name,
          operator_id:     property.operator_id,
        },
      });
      alertsFired++;
    }
  }

  return NextResponse.json({ ok: true, alertsFired });
}
