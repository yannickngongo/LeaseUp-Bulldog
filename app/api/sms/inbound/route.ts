// Deprecated — this endpoint is no longer active.
// All inbound Twilio webhooks should point to /api/twilio/inbound
// Update your Twilio phone number webhook URL to: https://yourdomain.com/api/twilio/inbound

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.warn("[sms/inbound] deprecated endpoint called — update Twilio webhook to /api/twilio/inbound");
  // Forward to the real handler by rewriting the URL
  const url = new URL(req.url);
  url.pathname = "/api/twilio/inbound";
  return NextResponse.rewrite(url);
}
