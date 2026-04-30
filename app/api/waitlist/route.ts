import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendWaitlistWelcomeEmail, sendWaitlistEnrollEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  properties: z.enum(["1-3", "4-10", "11-25", "25+"]),
});

export async function POST(req: NextRequest) {
  // Rate limit — public endpoint, prevent spam waitlist signups.
  // 5 per IP per minute is generous for legitimate users, blocks bots.
  if (!rateLimit(`waitlist:${getClientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: CORS });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Please check all fields." }, { status: 400, headers: CORS });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("waitlist_signups").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    property_count: parsed.data.properties,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This email is already on the waitlist. We'll be in touch!" },
        { status: 409, headers: CORS }
      );
    }
    console.error("[waitlist] insert error:", error);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500, headers: CORS });
  }

  const firstName = parsed.data.name.split(" ")[0];
  await sendWaitlistWelcomeEmail({ to: parsed.data.email, firstName });
  await sendWaitlistEnrollEmail({ to: parsed.data.email, firstName });

  return NextResponse.json({ ok: true }, { headers: CORS });
}
