// POST /api/properties/[id]/parse-rent-roll
// Accepts a PDF or CSV file upload, extracts unit data using Claude, returns parsed units.
// Tenant-scoped: only the operator who owns the property can upload.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeProperty } from "@/lib/authz";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizeProperty(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");

  if (!isPdf && !isCsv) {
    return NextResponse.json({ error: "Only PDF or CSV files are supported" }, { status: 400 });
  }

  const client = new Anthropic();

  if (isPdf) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract every unit from this rent roll PDF. Return a JSON array only — no explanation, no markdown.

Columns: Unit Number→unit_name, Unit Type→unit_type, BD/BA→bedrooms (number before slash), Tenant→current_resident, Status→status, Sqft→sq_ft, Rent→monthly_rent (use actual Rent not Market Rent), Lease From→lease_start, Lease To→lease_end.

Each object: { unit_name, status, unit_type, bedrooms, sq_ft, current_resident, lease_start, lease_end, monthly_rent }
- unit_type: "studio"|"1br"|"2br"|"3br"|"4br"|null
- status: "occupied"|"vacant"|"notice"|"unavailable"
- Dates: YYYY-MM-DD or ""
- Numbers: digits only, no $ or commas, null if missing
- Include ALL units including vacant. Output: [ ... ] only.`,
            },
          ],
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();

    let units;
    try {
      // Strip markdown code fences (```json ... ``` or ``` ... ```)
      let clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      // If Claude wrapped in an object like {"units": [...]} extract the array
      if (clean.startsWith("{")) {
        const obj = JSON.parse(clean);
        clean = JSON.stringify(obj.units ?? obj.data ?? Object.values(obj)[0]);
      }

      // If there's leading/trailing prose, extract the first [...] array
      if (!clean.startsWith("[")) {
        const match = clean.match(/\[[\s\S]*\]/);
        if (!match) throw new Error("No JSON array found");
        clean = match[0];
      }

      units = JSON.parse(clean);
    } catch {
      console.error("Claude raw response:", text);
      return NextResponse.json({ error: "Failed to parse Claude response — try a different PDF or contact support", raw: text.slice(0, 500) }, { status: 500 });
    }

    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json({ error: "No units found in PDF. Make sure it contains a rent roll table." }, { status: 422 });
    }

    return NextResponse.json({ ok: true, units, source: "pdf" });
  }

  // CSV fallback — parse on server too for consistency
  const text = await file.text();
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
  }

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/"/g, "") : "";
  };

  const units = lines.slice(1).map(line => {
    const row = line.split(",");
    const unit_name = col(row, "unit");
    if (!unit_name) return null;
    const sr = col(row, "status").toLowerCase();
    const status = sr.includes("occup") ? "occupied" : sr.includes("notice") ? "notice" : sr.includes("unavail") ? "unavailable" : "vacant";
    const tr = col(row, "type").toLowerCase();
    const unit_type = tr.includes("studio") ? "studio" : tr.includes("4") ? "4br" : tr.includes("3") ? "3br" : tr.includes("2") ? "2br" : tr.includes("1") ? "1br" : null;
    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    return {
      unit_name,
      status,
      unit_type,
      bedrooms: parseInt(col(row, "bed")) || null,
      sq_ft: sqftRaw ? parseInt(sqftRaw.replace(/\D/g, "")) || null : null,
      current_resident: col(row, "resident") || col(row, "tenant") || col(row, "name") || "",
      lease_end: col(row, "lease end") || col(row, "end date") || col(row, "move out") || "",
      monthly_rent: rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, "")) || null : null,
    };
  }).filter(Boolean);

  return NextResponse.json({ ok: true, units, source: "csv" });
}
