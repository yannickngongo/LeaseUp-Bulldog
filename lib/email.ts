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

export async function sendWaitlistConfirmationEmail({
  to, firstName,
}: {
  to: string; firstName: string;
}) {
  await sendEmail(
    to,
    "You're on the LeaseUp Bulldog waitlist",
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#C8102E;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">LeaseUp<span style="opacity:0.85">Bulldog</span></h1>
      </div>
      <div style="background:#f9f9f9;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:16px;margin-top:0">Hey ${firstName},</p>
        <p style="font-size:15px;color:#444">You're on the list. We review every application personally and reach out within 48 hours.</p>
        <p style="font-size:15px;color:#444">Here's what happens next:</p>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:14px"><span style="color:#C8102E;font-weight:700">01 —</span> <strong>We review your application</strong><br><span style="color:#666">We look at your portfolio size and make sure LeaseUp Bulldog is the right fit for where you're at.</span></p>
          <p style="margin:0 0 12px;font-size:14px"><span style="color:#C8102E;font-weight:700">02 —</span> <strong>You'll get a call from our team</strong><br><span style="color:#666">We'll walk through your properties, configure your AI agent, and answer any questions.</span></p>
          <p style="margin:0;font-size:14px"><span style="color:#C8102E;font-weight:700">03 —</span> <strong>Your pilot goes live</strong><br><span style="color:#666">Within 24 hours of your call, your AI agent is responding to leads. No setup headaches.</span></p>
        </div>
        <p style="font-size:14px;color:#555">In the meantime, if you have any questions just reply to this email — we read every one.</p>
        <p style="font-size:13px;color:#888;margin-top:24px;margin-bottom:0">Talk soon,<br><strong>— The LeaseUp Bulldog Team</strong></p>
      </div>
      <p style="font-size:11px;color:#bbb;text-align:center;margin-top:16px">LeaseUp Bulldog · AI-powered leasing for multifamily operators</p>
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
