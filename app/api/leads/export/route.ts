// GET /api/leads/export?propertyId=...&status=...
// Returns all matching leads as a CSV file download.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

export async function GET(req: NextRequest) {
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const status     = searchParams.get("status");

  const db = getSupabaseAdmin();

  let query = db
    .from("leads")
    .select("id, name, phone, email, status, source, move_in_date, bedrooms, budget_min, budget_max, ai_score, created_at, last_contacted_at, property_id, properties!inner(name, operator_id)")
    .eq("properties.operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  if (propertyId) query = query.eq("property_id", propertyId);
  if (status)     query = query.eq("status", status);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "id", "name", "phone", "email", "status", "source",
    "property", "move_in_date", "bedrooms",
    "budget_min", "budget_max", "ai_score",
    "created_at", "last_contacted_at",
  ];

  const rows = (leads ?? []).map((l: Record<string, unknown>) => rowToCsv([
    l.id,
    l.name,
    l.phone,
    l.email ?? "",
    l.status,
    l.source,
    (l.properties as Record<string, string> | null)?.name ?? "",
    l.move_in_date ?? "",
    l.bedrooms ?? "",
    l.budget_min ?? "",
    l.budget_max ?? "",
    l.ai_score ?? "",
    l.created_at,
    l.last_contacted_at ?? "",
  ]));

  const csv = [headers.join(","), ...rows].join("\r\n");
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
