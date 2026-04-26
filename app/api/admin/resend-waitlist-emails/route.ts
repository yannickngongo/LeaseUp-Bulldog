import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendWaitlistWelcomeEmail, sendWaitlistEnrollEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  secret: z.string(),
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
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (parsed.data.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const firstName = parsed.data.name.split(" ")[0];

  await sendWaitlistWelcomeEmail({ to: parsed.data.email, firstName });
  await sendWaitlistEnrollEmail({ to: parsed.data.email, firstName });

  return NextResponse.json({ ok: true, sent_to: parsed.data.email });
}
