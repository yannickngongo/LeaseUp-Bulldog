// SMS helper — all outbound messages go through sendSms().
// Never instantiate the Twilio client inline elsewhere in the codebase.
//
// Required env vars (set in .env.local):
//   TWILIO_ACCOUNT_SID   — from console.twilio.com
//   TWILIO_AUTH_TOKEN    — from console.twilio.com
//   TWILIO_PHONE_NUMBER  — your Twilio number in E.164 format e.g. +17025550100
//
// Safe testing: set TWILIO_TEST_MODE=true to log messages instead of sending them.
// In Twilio's own test environment, use SID=ACtest... and Token=test... credentials.

import twilio, { Twilio } from "twilio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendSmsParams {
  to: string;   // recipient's phone in E.164 format e.g. "+17025550101"
  body: string; // message text (max 1600 chars; over 160 splits into segments)
  from?: string; // override sender — defaults to TWILIO_PHONE_NUMBER env var
}

export interface SmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

let _client: Twilio | null = null;

function getClient(): Twilio {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Missing Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local"
    );
  }

  _client = twilio(accountSid, authToken);
  return _client;
}

// ─── provisionPhoneNumber ─────────────────────────────────────────────────────

/**
 * Searches for an available local US number near the given area code and purchases it.
 * Configures the SMS webhook to point at /api/twilio/inbound.
 * Returns the provisioned E.164 number, or null if none available.
 */
export async function provisionPhoneNumber(
  areaCode: string,
  webhookBaseUrl?: string
): Promise<string | null> {
  const client = getClient();
  const appUrl = webhookBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const smsUrl = `${appUrl}/api/twilio/inbound`;

  try {
    // Search for an available local number with the given area code
    const available = await client
      .availablePhoneNumbers("US")
      .local.list({ areaCode: parseInt(areaCode, 10), limit: 1 });

    if (!available.length) {
      // Fallback: search without area code constraint
      const fallback = await client
        .availablePhoneNumbers("US")
        .local.list({ limit: 1 });
      if (!fallback.length) return null;
      available.push(...fallback);
    }

    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber:     available[0].phoneNumber,
      smsUrl,
      smsMethod:       "POST",
      friendlyName:    "LeaseUp Bulldog",
    });

    return purchased.phoneNumber;
  } catch (err) {
    console.error("[twilio] provisionPhoneNumber failed:", err);
    return null;
  }
}

// ─── sendSms ─────────────────────────────────────────────────────────────────

export async function sendSms({ to, body, from }: SendSmsParams): Promise<SmsResult> {
  const fromNumber = from ?? process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    throw new Error(
      "No sender number provided. Set TWILIO_PHONE_NUMBER in .env.local or pass `from` explicitly."
    );
  }

  // Test mode — log instead of sending. Set TWILIO_TEST_MODE=true in .env.local.
  if (process.env.TWILIO_TEST_MODE === "true") {
    const mock: SmsResult = {
      sid: `MOCK_${Date.now()}`,
      status: "test",
      to,
      from: fromNumber,
      body,
    };
    console.log("[twilio] TEST MODE — message not sent:", mock);
    return mock;
  }

  const client = getClient();

  let message;
  try {
    message = await client.messages.create({ to, from: fromNumber, body });
  } catch (err: unknown) {
    // Twilio errors have a `code` and `message` field
    const twilioErr = err as { code?: number; message?: string };
    throw new Error(
      `Twilio send failed (code ${twilioErr.code ?? "unknown"}): ${twilioErr.message ?? String(err)}`
    );
  }

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
    body: message.body,
  };
}
