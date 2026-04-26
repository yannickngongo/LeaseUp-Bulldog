import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendWaitlistConfirmationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  properties: z.enum(["1-3", "4-10", "11-25", "25+"]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Please check all fields." }, { status: 400 });
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
        { status: 409 }
      );
    }
    console.error("[waitlist] insert error:", error);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  const firstName = parsed.data.name.split(" ")[0];
  await sendWaitlistConfirmationEmail({ to: parsed.data.email, firstName });

  return NextResponse.json({ ok: true });
}
