// POST /api/properties/[id]/parse-rent-roll
// Accepts a PDF or CSV file upload, extracts unit data using Claude, returns parsed units.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // property id available if needed for validation

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
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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
              text: `Extract all apartment units from this rent roll document and return a JSON array.

Each unit object must have these exact fields:
- unit_name: string (e.g. "101", "2A", "B-304")
- status: one of "occupied", "vacant", "notice", "unavailable"
- unit_type: one of "studio", "1br", "2br", "3br", "4br" or null
- bedrooms: number or null
- sq_ft: number or null
- current_resident: string or "" (full name of current tenant, empty if vacant)
- lease_end: string or "" (date in YYYY-MM-DD format if available)
- monthly_rent: number or null (monthly rent amount in dollars, no symbols)

Rules:
- "occupied" = currently leased
- "notice" = tenant gave notice / month-to-month ending
- "vacant" = empty unit
- "unavailable" = offline/down unit
- If a field is not in the document, use null or ""
- Return ONLY the JSON array, no markdown, no explanation.`,
            },
          ],
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    let units;
    try {
      units = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "Failed to parse Claude response", raw: text }, { status: 500 });
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
