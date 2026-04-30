// Public API documentation. Lists the webhook + integration endpoints LUB
// exposes for external systems (Zillow, Apartments.com, AppFolio, etc.) to
// push leads in or receive events.

import Link from "next/link";

interface Endpoint {
  method:      "GET" | "POST" | "PATCH" | "DELETE";
  path:        string;
  title:       string;
  description: string;
  auth:        string;
  body?:       string;
  response?:   string;
  notes?:      string[];
}

const ENDPOINTS: { section: string; items: Endpoint[] }[] = [
  {
    section: "Lead Intake",
    items: [
      {
        method:      "POST",
        path:        "/api/leads/webhook?property_id={UUID}",
        title:       "Universal lead webhook",
        description: "Accepts leads from any source (Zillow, Apartments.com, your website form, etc.). Field names are flexibly mapped: name/full_name/firstName+lastName, phone/phone_number/mobile, email/email_address, etc.",
        auth:        "Optional X-Webhook-Secret header (configurable per property).",
        body:
`{
  "name":            "Sarah Johnson",
  "phone":           "+17025551234",
  "email":           "sarah@example.com",
  "move_in_date":    "2026-06-01",
  "bedrooms":        2,
  "source":          "zillow",
  "utm_source":      "zillow.com",
  "message":         "Free-form first message — AI will answer immediately"
}`,
        response: `{ "ok": true, "lead_id": "uuid", "duplicate": false }`,
        notes: [
          "Auto-deduplicates by (phone, property_id). A duplicate returns the existing lead with `duplicate: true`.",
          "Triggers immediate AI text within 60 seconds.",
          "Use this URL on every external lead source — Zillow, Apartments.com, AppFolio (via Zapier), Facebook Lead Ads, your website."
        ],
      },
    ],
  },
  {
    section: "Inbound webhooks (you receive)",
    items: [
      {
        method:      "POST",
        path:        "/api/webhooks/meta",
        title:       "Meta (Facebook) Lead Ads",
        description: "Receives leadgen events from Meta. Configure in Facebook App → Webhooks → Page → subscribe to 'leadgen'.",
        auth:        "X-Hub-Signature-256 verified against META_APP_SECRET.",
        notes: [
          "GET handler responds to the verification handshake using META_VERIFY_TOKEN.",
          "POST handler fetches lead details from Meta's Graph API, dedups by lead ID, and ingests into LUB.",
        ],
      },
      {
        method:      "POST",
        path:        "/api/webhooks/google",
        title:       "Google Ads Lead Form",
        description: "Receives lead-form-extension submissions from Google Ads campaigns. Configure in Google Ads → Lead Form → Webhook.",
        auth:        "google_key field in payload verified against GOOGLE_WEBHOOK_KEY.",
      },
      {
        method:      "POST",
        path:        "/api/twilio/inbound",
        title:       "Twilio inbound SMS",
        description: "Receives inbound SMS from leads via Twilio. AI replies within 60 seconds.",
        auth:        "Verified by Twilio request signature.",
      },
    ],
  },
  {
    section: "Operator API (authenticated)",
    items: [
      {
        method:      "POST",
        path:        "/api/leases",
        title:       "Record signed lease",
        description: "Records a lease for a lead and triggers the performance-fee billing flow if the lease is LUB-attributable (within 30-day window from first AI contact).",
        auth:        "Bearer token (Supabase JWT in the Authorization header).",
        body:
`{
  "lead_id":            "uuid",
  "property_id":        "uuid",
  "operator_id":        "uuid",
  "lease_signed_date":  "2026-04-30",
  "rent_amount":        185000,
  "unit_number":        "304",
  "lease_start_date":   "2026-05-15",
  "lease_end_date":     "2027-05-14",
  "attribution_source": "lub",
  "created_by":         "yourname@example.com"
}`,
        response: `{ "lease": { ...full lease record... } }`,
      },
      {
        method:      "GET",
        path:        "/api/analytics/performance?days=30",
        title:       "Performance analytics",
        description: "Lead volume, average AI response time, conversion rate, source breakdown, and lease attribution for a window.",
        auth:        "Bearer token.",
      },
      {
        method:      "GET",
        path:        "/api/activity-log?action=&actor=&page=0",
        title:       "Activity log (audit trail)",
        description: "Paginated audit log of every action taken on the operator's account.",
        auth:        "Bearer token.",
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  POST:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PATCH:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">← Home</Link>
        <h1 className="mt-4 text-4xl font-black mb-2">API Reference</h1>
        <p className="text-gray-400 mb-12 max-w-2xl">
          LeaseUp Bulldog ingests leads from anywhere via webhooks. Use the universal lead webhook for any source, configure platform-specific webhooks for Meta + Google + Twilio, and call the operator API with your Supabase JWT for authenticated actions.
        </p>

        {ENDPOINTS.map(group => (
          <section key={group.section} className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-4">{group.section}</h2>
            <div className="space-y-6">
              {group.items.map(ep => (
                <div key={ep.path} className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                    <code className="flex-1 break-all rounded bg-[#0a0a12] border border-[#1E1E2E] px-2 py-1 text-xs text-green-400 font-mono">
                      {ep.path}
                    </code>
                  </div>
                  <h3 className="font-bold text-white mb-1">{ep.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{ep.description}</p>

                  <div className="grid sm:grid-cols-[80px_1fr] gap-2 text-xs">
                    <span className="font-semibold text-gray-500">Auth:</span>
                    <span className="text-gray-300">{ep.auth}</span>

                    {ep.body && (
                      <>
                        <span className="font-semibold text-gray-500 self-start">Body:</span>
                        <pre className="text-[11px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap bg-[#0a0a12] rounded-lg border border-[#1E1E2E] p-3">{ep.body}</pre>
                      </>
                    )}

                    {ep.response && (
                      <>
                        <span className="font-semibold text-gray-500 self-start">Returns:</span>
                        <pre className="text-[11px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap bg-[#0a0a12] rounded-lg border border-[#1E1E2E] p-3">{ep.response}</pre>
                      </>
                    )}

                    {ep.notes && ep.notes.length > 0 && (
                      <>
                        <span className="font-semibold text-gray-500 self-start">Notes:</span>
                        <ul className="space-y-1 text-gray-300">
                          {ep.notes.map((n, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#C8102E] mt-0.5">·</span>
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-2xl border border-[#C8102E]/20 bg-[#C8102E]/5 p-6 mt-8">
          <p className="font-bold text-white mb-2">Need help?</p>
          <p className="text-sm text-gray-400 mb-4">
            Most operators use the dashboard&apos;s <strong className="text-white">Integrations</strong> tab — it shows your unique webhook URL and walks you through setup for every supported lead source. The API docs above are for technical integrations.
          </p>
          <Link href="/contact" className="inline-block rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
            Contact support →
          </Link>
        </div>
      </div>
    </div>
  );
}
