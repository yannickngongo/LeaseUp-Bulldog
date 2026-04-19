// POST /api/campaigns/[id]/approve — approve a campaign (and optionally specific ad variations)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { approveCampaign } from "@/lib/marketing";

const ApproveSchema = z.object({
  approved_by:          z.string().min(1),
  approved_variation_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = ApproveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    await approveCampaign(id, parsed.data.approved_by, parsed.data.approved_variation_ids);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
