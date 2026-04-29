// POST /api/campaigns/[id]/image
// Accepts multipart/form-data with a "file" field.
// Uploads to Supabase Storage (campaign-images bucket) and returns the public URL.
// Also writes image_url back to the campaigns row.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveCallerContext } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const ctx = await resolveCallerContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Verify ownership
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, properties!inner(operator_id)")
    .eq("id", campaignId)
    .single();

  const prop = campaign?.properties as unknown as { operator_id: string } | null;
  if (!campaign || prop?.operator_id !== ctx.operatorId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Parse multipart body
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });
  }

  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "File must be JPEG, PNG, WebP, or GIF" }, { status: 415 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `campaigns/${campaignId}/property.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await db.storage
    .from("campaign-images")
    .upload(path, arrayBuffer, {
      contentType:  file.type,
      upsert:       true,        // replace if re-uploaded
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: publicUrlData } = db.storage
    .from("campaign-images")
    .getPublicUrl(path);

  const publicUrl = publicUrlData.publicUrl;

  // Write back to campaigns row
  await db.from("campaigns").update({ image_url: publicUrl }).eq("id", campaignId);

  return NextResponse.json({ url: publicUrl });
}
