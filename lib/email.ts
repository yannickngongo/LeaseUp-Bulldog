// Resend email helpers for LeaseUp Bulldog notifications.
// All functions are fire-and-forget safe — they log errors but never throw.

// Set RESEND_FROM_EMAIL in Vercel env once your sending domain is verified in Resend.
// Until then, the resend.dev sandbox address works for test recipients only.
const FROM = process.env.RESEND_FROM_EMAIL ?? "LeaseUp Bulldog <notifications@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping:", subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
  }
}

// ─── Transactional notifications ─────────────────────────────────────────────

export async function sendInviteEmail({
  to, inviteUrl, orgName, role, invitedBy,
}: {
  to: string; inviteUrl: string; orgName: string; role: string; invitedBy: string;
}) {
  const roleLabel = role.replace(/_/g, " ");
  // Sanitize orgName — if it looks like an email, use just the local part
  const displayName = orgName.includes("@") ? orgName.split("@")[0] : orgName;

  await sendEmail(
    to,
    `You've been invited to join LeaseUp Bulldog`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hi there,</p>
        <p style="font-size:15px;color:#444">
          <strong>${invitedBy}</strong> has invited you to join their team on <strong>LeaseUp Bulldog</strong> as a <strong>${roleLabel}</strong>.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;margin:24px 0;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">Accept Invitation →</a>
        <p style="font-size:13px;color:#888">This invitation expires in 7 days. If you didn't expect this, you can ignore this email.</p>
        <p style="font-size:12px;color:#bbb;margin-bottom:0">Or copy this link: ${inviteUrl}</p>
      </div>
    </div>`
  );
}

export async function sendHotLeadAlert({
  to, leadName, leadPhone, propertyName, propertyId, leadId, messagePreview,
}: {
  to: string; leadName: string; leadPhone: string; propertyName: string;
  propertyId: string; leadId: string; messagePreview: string;
}) {
  const leadsUrl = `${APP_URL}/leads?property=${propertyId}&lead=${leadId}`;
  await sendEmail(
    to,
    `🔥 Hot Lead at ${propertyName} — ${leadName} just replied`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Hot Lead Alert</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0"><strong>${leadName}</strong> replied to your AI agent at <strong>${propertyName}</strong>.</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin:20px 0">
          <p style="font-size:12px;color:#888;margin:0 0 6px">Their message:</p>
          <p style="font-size:15px;color:#111;margin:0;font-style:italic">"${messagePreview}"</p>
        </div>
        <p style="font-size:14px;color:#555">Phone: <a href="tel:${leadPhone}" style="color:#C8102E">${leadPhone}</a></p>
        <a href="${leadsUrl}" style="display:inline-block;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">View Conversation →</a>
        <p style="font-size:12px;color:#aaa;margin-top:24px">The AI is handling the conversation. Jump in any time from your dashboard.</p>
      </div>
    </div>`
  );
}

export async function sendHumanTakeoverAlert({
  to, leadName, leadPhone, propertyName, propertyId, leadId, reason, lastMessage,
}: {
  to: string; leadName: string; leadPhone: string; propertyName: string;
  propertyId: string; leadId: string; reason: string; lastMessage: string;
}) {
  const leadsUrl = `${APP_URL}/leads?property=${propertyId}&lead=${leadId}`;
  await sendEmail(
    to,
    `⚡ Action Needed — ${leadName} at ${propertyName} needs a human`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#1a1a2e;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px">Human Takeover Required</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:14px;color:#856404;margin:0"><strong>Why the AI handed off:</strong> ${reason}</p>
        </div>
        <p style="font-size:15px;margin-top:0"><strong>${leadName}</strong> at <strong>${propertyName}</strong> needs your attention.</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin:20px 0">
          <p style="font-size:12px;color:#888;margin:0 0 6px">Their last message:</p>
          <p style="font-size:15px;color:#111;margin:0;font-style:italic">"${lastMessage}"</p>
        </div>
        <p style="font-size:14px;color:#555">Phone: <a href="tel:${leadPhone}" style="color:#C8102E">${leadPhone}</a></p>
        <a href="${leadsUrl}" style="display:inline-block;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">Take Over Conversation →</a>
        <p style="font-size:12px;color:#aaa;margin-top:24px">The AI has stopped replying for this lead until you resume it.</p>
      </div>
    </div>`
  );
}

export async function sendTourRequestedAlert({
  to, leadName, leadPhone, propertyName, propertyId, leadId, messagePreview,
}: {
  to: string; leadName: string; leadPhone: string; propertyName: string;
  propertyId: string; leadId: string; messagePreview: string;
}) {
  const leadsUrl = `${APP_URL}/leads?property=${propertyId}&lead=${leadId}`;
  await sendEmail(
    to,
    `📅 Tour Request — ${leadName} wants to see ${propertyName}`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#16a34a;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Tour Request</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0"><strong>${leadName}</strong> asked about scheduling a tour at <strong>${propertyName}</strong>.</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin:20px 0">
          <p style="font-size:12px;color:#888;margin:0 0 6px">Their message:</p>
          <p style="font-size:15px;color:#111;margin:0;font-style:italic">"${messagePreview}"</p>
        </div>
        <p style="font-size:14px;color:#555">Phone: <a href="tel:${leadPhone}" style="color:#C8102E">${leadPhone}</a></p>
        <a href="${leadsUrl}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">View Conversation →</a>
      </div>
    </div>`
  );
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export async function sendWaitlistWelcomeEmail({
  to, firstName,
}: {
  to: string; firstName: string;
}) {
  await sendEmail(
    to,
    "You're in — Founding Member #confirmed 🐾",
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#111118;padding:28px 32px;border-radius:12px 12px 0 0">
        <p style="color:rgba(255,255,255,0.5);margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">Founding 100</p>
        <h1 style="color:white;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.02em">LeaseUp<span style="color:#C8102E">Bulldog</span></h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444;line-height:1.65;">Your spot is locked. You just claimed one of the 100 founding member positions for LeaseUp Bulldog &mdash; and your rate is set for life.</p>

        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;margin:24px 0;">
          <div style="background:#C8102E;padding:12px 20px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Your Founding Member Terms</p>
          </div>
          <div style="padding:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:14px;color:#888;">Monthly rate</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#111;text-align:right;"><span style="text-decoration:line-through;color:#ccc;font-weight:400;margin-right:8px;">$1,500</span><span style="color:#C8102E;">$999/mo — locked forever</span></td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:14px;color:#888;">Performance fee</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#111;text-align:right;">$0 for first 90 days</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:14px;color:#888;">First month</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#111;text-align:right;">Free — no card needed</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#888;">Guarantee</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#111;text-align:right;">30-day money back</td>
              </tr>
            </table>
          </div>
        </div>

        <p style="font-size:15px;color:#444;line-height:1.65;">We&apos;re onboarding founding members personally. Expect a message from us within 48 hours &mdash; call, text, or email, whatever works for you &mdash; to get you set up.</p>
        <p style="font-size:15px;color:#444;line-height:1.65;">Can&apos;t wait to show you what Bulldog does to a lead pipeline.</p>

        <p style="font-size:13px;color:#888;margin-top:28px;margin-bottom:4px;">Talk soon,</p>
        <p style="font-size:14px;color:#111;margin:0;font-weight:700;">Yannick &mdash; LeaseUp Bulldog</p>
        <p style="font-size:12px;color:#C8102E;margin-top:8px;font-style:italic;">No lead left behind. 🐶</p>
      </div>
      <p style="font-size:11px;color:#bbb;text-align:center;margin-top:16px;">LeaseUp Bulldog &middot; AI-powered leasing for multifamily operators</p>
    </div>`
  );
}

export async function sendWaitlistEnrollEmail({
  to, firstName,
}: {
  to: string; firstName: string;
}) {
  const signupUrl = `${APP_URL}/signup?ref=founding`;
  await sendEmail(
    to,
    "🐶 Bulldog is ready for you — create your account",
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp<span style="opacity:0.85">Bulldog</span></h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px">Get Enrolled &mdash; Your Account Is Ready</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">🐶 Bulldog is ready for you. Time to get your account set up.</p>
        <a href="${signupUrl}" style="display:block;background:#C8102E;color:white;text-decoration:none;padding:16px 28px;border-radius:10px;font-size:16px;font-weight:700;text-align:center;margin:24px 0">
          Create Your Account &mdash; It&apos;s Free &rarr;
        </a>
        <p style="font-size:14px;color:#555;margin-bottom:20px">Once you&apos;re in, here&apos;s what to do:</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;margin-bottom:20px">
          <div style="padding:16px 20px;border-bottom:1px solid #f0f0f0">
            <p style="margin:0 0 4px;font-size:13px"><span style="color:#C8102E;font-weight:700">01 &mdash;</span> <strong>Add your first property</strong></p>
            <p style="margin:0;font-size:13px;color:#666">Name, address, unit count. Bulldog gets assigned a dedicated SMS number instantly &mdash; that&apos;s the number your leads will text and Bulldog will respond from.</p>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid #f0f0f0">
            <p style="margin:0 0 4px;font-size:13px"><span style="color:#C8102E;font-weight:700">02 &mdash;</span> <strong>Connect your lead sources</strong></p>
            <p style="margin:0;font-size:13px;color:#666">Point Zillow, Apartments.com, or your website form to your property&apos;s webhook URL. Every lead that hits that URL gets an AI reply in under 60 seconds.</p>
          </div>
          <div style="padding:16px 20px;border-bottom:1px solid #f0f0f0">
            <p style="margin:0 0 4px;font-size:13px"><span style="color:#C8102E;font-weight:700">03 &mdash;</span> <strong>Configure your AI</strong></p>
            <p style="margin:0;font-size:13px;color:#666">Set your unit types, price range, and any active specials. This is what makes Bulldog sound like YOUR leasing agent &mdash; not a robot.</p>
          </div>
          <div style="padding:16px 20px">
            <p style="margin:0 0 4px;font-size:13px"><span style="color:#C8102E;font-weight:700">04 &mdash;</span> <strong>Send a test text</strong></p>
            <p style="margin:0;font-size:13px;color:#666">Text your property&apos;s number from your own phone. Watch Bulldog reply in under 60 seconds. That&apos;s when it clicks.</p>
          </div>
        </div>
        <div style="background:#fff8f8;border:1px solid #ffd5d5;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#444">You have <strong style="color:#C8102E">30 days free</strong> to put Bulldog to work. After that, it&apos;s the normal plan &mdash; but by then you&apos;ll have seen exactly what it can do.</p>
        </div>
        <p style="font-size:14px;color:#555">Any questions? Reply here or call or text us directly &mdash; we&apos;ll walk you through it live.</p>
        <p style="font-size:13px;color:#888;margin-top:28px;margin-bottom:4px">Talk soon,</p>
        <p style="font-size:13px;color:#555;margin:0"><strong>&mdash; The LeaseUp Bulldog Team</strong></p>
        <p style="font-size:12px;color:#C8102E;margin-top:8px;font-style:italic">Bark. Qualify. Close. 🐾</p>
      </div>
      <p style="font-size:11px;color:#bbb;text-align:center;margin-top:16px">LeaseUp Bulldog &middot; AI-powered leasing for multifamily operators</p>
    </div>`
  );
}

// ─── Onboarding drip emails ───────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, firstName }: { to: string; firstName: string }) {
  const dashUrl = `${APP_URL}/dashboard`;
  await sendEmail(
    to,
    "Welcome to LeaseUp Bulldog — let's get your AI agent live",
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">Your account is ready. Here's how to get your AI agent responding to leads in the next 15 minutes:</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#C8102E">Step 1 — Add your property</p>
          <p style="margin:0;font-size:14px;color:#555">Go to Properties → New Property. Add the name, address, and unit count. We'll assign a dedicated SMS number instantly.</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#C8102E">Step 2 — Send a test text</p>
          <p style="margin:0;font-size:14px;color:#555">Text your new property number from your own phone. Watch Bulldog reply in under 60 seconds.</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#C8102E">Step 3 — Connect your lead sources</p>
          <p style="margin:0;font-size:14px;color:#555">Point Zillow, Apartments.com, or your website form to your webhook URL. Setup guide is in your dashboard.</p>
        </div>
        <a href="${dashUrl}" style="display:inline-block;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">Go to Dashboard →</a>
        <p style="font-size:13px;color:#888;margin-top:24px">Any questions? Reply to this email — I read every one.<br><strong>— Yannick, LeaseUp Bulldog</strong></p>
      </div>
    </div>`
  );
}

export async function sendDay3Email({ to, firstName }: { to: string; firstName: string }) {
  const dashUrl = `${APP_URL}/leads`;
  await sendEmail(
    to,
    `${firstName}, how's Bulldog working for you?`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">It's day 3 of your pilot. How's the AI handling your leads?</p>
        <p style="font-size:15px;color:#444">A few things worth checking in your dashboard:</p>
        <ul style="font-size:14px;color:#555;line-height:1.8">
          <li>Did you connect your lead sources (Zillow, ILS, website)?</li>
          <li>Have any leads replied? Check the Conversations tab.</li>
          <li>Any leads asking about tours? The AI will handle it — but you can always jump in.</li>
        </ul>
        <a href="${dashUrl}" style="display:inline-block;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">Check Your Leads →</a>
        <p style="font-size:13px;color:#888;margin-top:24px">Hit reply if anything is off — I'll fix it same day.<br><strong>— Yannick</strong></p>
      </div>
    </div>`
  );
}

export async function sendDay7Email({ to, firstName }: { to: string; firstName: string }) {
  await sendEmail(
    to,
    `One week in — here's what Bulldog does at night`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">One week in. While you're sleeping, Bulldog is still working:</p>
        <div style="background:#fff;border-left:4px solid #C8102E;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:14px;color:#444"><strong>Follow-up cadence:</strong> Leads who haven't replied yet are getting automatic follow-ups — first at 24h, then 3 days, 7 days, 14 days. Then monthly forever until they opt out or tour.</p>
        </div>
        <div style="background:#fff;border-left:4px solid #C8102E;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:14px;color:#444"><strong>No lead dies:</strong> The only way a lead stops receiving messages is if they reply STOP — or if you manually close them. Otherwise Bulldog keeps going.</p>
        </div>
        <p style="font-size:14px;color:#555">Tip: Add an active special in your property settings if you're running a concession. Bulldog will mention it naturally in the right moment.</p>
        <p style="font-size:13px;color:#888;margin-top:24px">7 days left in your pilot. Let me know if you want to talk about converting to a full plan.<br><strong>— Yannick</strong></p>
      </div>
    </div>`
  );
}

export async function sendDay14Email({ to, firstName }: { to: string; firstName: string }) {
  const billingUrl = `${APP_URL}/billing`;
  await sendEmail(
    to,
    `${firstName}, your trial ends tomorrow — here's what happens next`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Trial Ending Soon</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">Your 14-day free trial ends <strong>tomorrow</strong>. Here's what happens:</p>
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:14px;color:#856404"><strong>If you don't subscribe:</strong> Your AI agent will stop responding to new leads at midnight. Existing conversations will be paused. Your data stays safe — you can reactivate any time.</p>
        </div>
        <div style="background:#d4edda;border:1px solid #28a745;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:14px;color:#155724"><strong>If you subscribe today:</strong> Zero interruption. Bulldog keeps running 24/7. Your leads keep getting replies while you sleep.</p>
        </div>
        <p style="font-size:15px;color:#444">Most operators on the Starter plan recover the monthly fee in the first week from a single lease. The math works.</p>
        <a href="${billingUrl}" style="display:inline-block;margin:24px 0;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">Subscribe Now →</a>
        <p style="font-size:13px;color:#888;margin-top:0">Questions? Just reply to this email.<br><strong>— Yannick, LeaseUp Bulldog</strong></p>
      </div>
    </div>`
  );
}

export async function sendDay30Email({ to, firstName }: { to: string; firstName: string }) {
  const insightsUrl = `${APP_URL}/insights`;
  await sendEmail(
    to,
    `${firstName} — your 30-day Bulldog report`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#1a1a2e;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp Bulldog</h1>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px">30-Day Summary</p>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">You've been running LeaseUp Bulldog for 30 days. A few things worth knowing:</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">What Bulldog has been doing</p>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#444;line-height:2">
            <li>Replying to every inbound SMS within 60 seconds — even at 2am</li>
            <li>Following up with every ghost lead on a 24h → 3d → 7d → 14d cadence</li>
            <li>Booking tours automatically when leads ask</li>
            <li>Tracking your pipeline from "New" to "Won"</li>
          </ul>
        </div>
        <p style="font-size:15px;color:#444">Check your Insights tab to see your conversion funnel, response rates, and which lead sources are converting best.</p>
        <a href="${insightsUrl}" style="display:inline-block;margin:24px 0;background:#C8102E;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">View Your 30-Day Insights →</a>
        <p style="font-size:14px;color:#555">If you're on the Starter plan and your occupancy is climbing — consider the Pro plan for multi-property portfolio tools, automation rules, and competitor rent tracking.</p>
        <p style="font-size:13px;color:#888;margin-top:24px">Reply with any questions or feedback. We read everything.<br><strong>— Yannick, LeaseUp Bulldog</strong></p>
      </div>
    </div>`
  );
}
