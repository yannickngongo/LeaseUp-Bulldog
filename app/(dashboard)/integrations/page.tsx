"use client";

import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";
const FB_VERIFY_TOKEN = "leaseup_bulldog_fb_verify";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property { id: string; name: string; city: string; state: string; }

type IntegrationId = "zillow" | "apartments" | "facebook" | "rentcom" | "hotpads" | "craigslist" | "website" | "google" | "hubspot" | "salesforce";

interface Integration {
  id: IntegrationId;
  name: string;
  logo: string;
  description: string;
  category: "listing" | "social" | "crm" | "website";
  status: "live" | "available" | "coming_soon";
  leads_received?: number;
  last_sync?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "zillow",      name: "Zillow Rental Manager", logo: "Z",  category: "listing", status: "available",    description: "Auto-import leads from Zillow, Trulia & HotPads listings directly into your LUB pipeline." },
  { id: "apartments",  name: "Apartments.com",         logo: "A",  category: "listing", status: "available",    description: "Route inquiries from Apartments.com listings straight to AI follow-up." },
  { id: "facebook",    name: "Facebook Lead Ads",      logo: "f",  category: "social",  status: "available",    description: "Capture Facebook & Instagram lead ad submissions in real time." },
  { id: "rentcom",     name: "Rent.com",               logo: "R",  category: "listing", status: "available",    description: "Forward Rent.com leads directly into your LUB pipeline." },
  { id: "craigslist",  name: "Craigslist",             logo: "CL", category: "listing", status: "available",    description: "Forward Craigslist email inquiries into your lead pipeline via webhook." },
  { id: "website",     name: "Website Lead Form",      logo: "W",  category: "website", status: "live",         leads_received: 47, last_sync: "2 minutes ago", description: "Embed the LUB lead widget on your property website." },
  { id: "google",      name: "Google My Business",     logo: "G",  category: "social",  status: "coming_soon",  description: "Capture leads from Google property inquiries and messages." },
  { id: "hubspot",     name: "HubSpot CRM",            logo: "HS", category: "crm",     status: "coming_soon",  description: "Sync LUB contacts and conversations to HubSpot." },
  { id: "salesforce",  name: "Salesforce",             logo: "SF", category: "crm",     status: "coming_soon",  description: "Push qualified leads and lease outcomes to Salesforce." },
];

const CATEGORY_LABELS: Record<Integration["category"], string> = {
  listing: "Listing Platforms",
  social:  "Social & Search",
  website: "Website & Widgets",
  crm:     "CRM & Data",
};

const STATUS_STYLE = {
  live:         { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", label: "Live",       dot: "bg-green-500" },
  available:    { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",    label: "Available",  dot: "bg-blue-400" },
  coming_soon:  { badge: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500",        label: "Soon",       dot: "bg-gray-400" },
};

// ─── Setup config per platform ────────────────────────────────────────────────

function getSetupSteps(id: IntegrationId, props: Property[]): {
  title: string;
  intro: string;
  needsProperty: boolean;
  needsToken?: boolean;
  tokenLabel?: string;
  tokenHint?: string;
  verifyToken?: string;
  steps: (propertyId: string, propertyName: string, token: string) => { label: string; value?: string; note?: string }[];
} {
  const base = (pid: string, path: string) =>
    `${APP_URL}/api/leads/${path}?property_id=${pid || "YOUR_PROPERTY_ID"}`;

  switch (id) {
    case "zillow":
      return {
        title: "Connect Zillow Rental Manager",
        intro: "Zillow will POST leads to your LUB endpoint. One URL per property.",
        needsProperty: true,
        steps: (pid, pname) => [
          { label: "Your Zillow webhook URL", value: base(pid, "zillow"), note: `Copy this URL for ${pname || "your property"}` },
          { label: "Step 1", note: "Log in to Zillow Rental Manager → select your listing" },
          { label: "Step 2", note: "Go to Settings → Lead Delivery API" },
          { label: "Step 3", note: "Paste the webhook URL above and save" },
          { label: "Step 4", note: "Zillow will send a test lead — it will appear in your Leads dashboard within 60 seconds" },
        ],
      };

    case "apartments":
      return {
        title: "Connect Apartments.com",
        intro: "Apartments.com (CoStar) POSTs leads to your endpoint. One URL per property.",
        needsProperty: true,
        steps: (pid, pname) => [
          { label: "Your Apartments.com webhook URL", value: base(pid, "apartments"), note: `Copy this URL for ${pname || "your property"}` },
          { label: "Step 1", note: "Log in to Apartments.com partner portal → select your listing" },
          { label: "Step 2", note: "Go to Settings → Lead Delivery or Integrations → API Webhook" },
          { label: "Step 3", note: "Paste the webhook URL above. No auth token required." },
          { label: "Step 4", note: "Submit a test inquiry from the listing to verify delivery" },
        ],
      };

    case "rentcom":
      return {
        title: "Connect Rent.com",
        intro: "Rent.com supports webhook lead delivery. One URL per property.",
        needsProperty: true,
        steps: (pid, pname) => [
          { label: "Your Rent.com webhook URL", value: base(pid, "apartments"), note: `Same endpoint handles Rent.com format for ${pname || "your property"}` },
          { label: "Step 1", note: "Log in to Rent.com / RentPath partner portal" },
          { label: "Step 2", note: "Go to Settings → Lead Delivery → API Endpoint" },
          { label: "Step 3", note: "Paste the URL above and save" },
          { label: "Step 4", note: "Test by submitting an inquiry on your listing" },
        ],
      };

    case "craigslist":
      return {
        title: "Connect Craigslist",
        intro: "Craigslist has no official API — use our generic webhook URL and forward email inquiries through a Zapier/Make automation, or set the reply-to email to trigger a form.",
        needsProperty: true,
        steps: (pid, pname) => [
          { label: "Your generic webhook URL", value: base(pid, "apartments"), note: `Use this in a Zapier/Make automation for ${pname || "your property"}` },
          { label: "Option A — Zapier", note: "Zapier: Gmail trigger (email with craigslist in subject) → Webhooks POST to the URL above" },
          { label: "Option B — Make.com", note: "Make: Email module → HTTP POST to the URL above with name, phone, email fields" },
          { label: "Tip", note: "Include your contact email in posts so renters can reach you directly. Use Zapier to capture those emails and push to LUB." },
        ],
      };

    case "facebook":
      return {
        title: "Connect Facebook Lead Ads",
        intro: "Facebook sends a webhook notification when someone submits a Lead Ad. LUB fetches the full lead from the Graph API using your Page Access Token.",
        needsProperty: true,
        needsToken: true,
        tokenLabel: "Facebook Page Access Token",
        tokenHint: "Meta Business Suite → Leads Access Manager → Generate token. Must have pages_read_engagement + leads_retrieval permissions.",
        verifyToken: FB_VERIFY_TOKEN,
        steps: (pid, pname, token) => [
          { label: "Webhook callback URL", value: `${APP_URL}/api/leads/facebook?property_id=${pid || "YOUR_PROPERTY_ID"}`, note: `For ${pname || "your property"}` },
          { label: "Verify Token", value: FB_VERIFY_TOKEN, note: "Paste this exact string in Meta's webhook verify token field" },
          { label: "Step 1", note: "Go to Meta Business Suite → All tools → Leads Access → Leads Center" },
          { label: "Step 2", note: "Click Webhooks → Add subscription → paste the callback URL and verify token above" },
          { label: "Step 3", note: !token ? "Generate a Page Access Token and paste it above — LUB needs it to fetch lead details" : "Page Access Token saved ✓ — LUB will use it to retrieve leads from Facebook" },
          { label: "Step 4", note: "Subscribe to the leadgen event on your page" },
          { label: "Step 5", note: "Run a test lead through your Lead Ad form to verify delivery" },
        ],
      };

    case "website":
      return {
        title: "Website Lead Form",
        intro: "Embed a lead capture form on any property website page. Leads flow directly into LUB.",
        needsProperty: true,
        steps: (pid) => [
          { label: "Your embed endpoint", value: `${APP_URL}/api/leads/webhook?property_id=${pid || "YOUR_PROPERTY_ID"}`, note: "POST JSON: { firstName, lastName, phone, email, source: 'website' }" },
          { label: "Quick embed snippet", value: "", note: "Use Webflow, Squarespace, or WordPress custom HTML block — POST the form to the URL above" },
        ],
      };

    default:
      return {
        title: `Connect ${id}`,
        intro: "Contact us for setup instructions.",
        needsProperty: false,
        steps: () => [],
      };
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-[#C8102E] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Setup modal ──────────────────────────────────────────────────────────────

function SetupModal({ integration, properties, onClose }: { integration: Integration; properties: Property[]; onClose: () => void }) {
  const [selectedProp, setSelectedProp] = useState(properties[0]?.id ?? "");
  const [token, setToken]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  const prop    = properties.find(p => p.id === selectedProp);
  const config  = getSetupSteps(integration.id, properties);
  const steps   = config.steps(selectedProp, prop?.name ?? "", token);

  const handleSave = async () => {
    if (!config.needsToken || !token || !selectedProp) return;
    setSaving(true);
    // TODO: persist token to DB (properties.facebook_access_token)
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl my-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8102E] text-white text-xs font-black">
              {integration.logo}
            </div>
            <p className="font-bold text-gray-900 dark:text-gray-100">{config.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{config.intro}</p>

          {/* Property selector */}
          {config.needsProperty && properties.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Select Property</label>
              <select
                value={selectedProp}
                onChange={e => setSelectedProp(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#C8102E]"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}, {p.state}</option>
                ))}
              </select>
            </div>
          )}

          {/* Token input */}
          {config.needsToken && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{config.tokenLabel}</label>
              <input
                type="text"
                value={token}
                onChange={e => { setToken(e.target.value); setSaved(false); }}
                placeholder="Paste your access token here…"
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]"
              />
              <p className="mt-1 text-[11px] text-gray-400">{config.tokenHint}</p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i}>
                {s.value !== undefined ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2">
                      <code className="flex-1 text-xs text-gray-700 dark:text-gray-300 font-mono truncate">{s.value || "(no value)"}</code>
                      {s.value && <CopyBtn value={s.value} />}
                    </div>
                    {s.note && <p className="mt-1 text-[11px] text-gray-400">{s.note}</p>}
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/10 text-[9px] font-black text-[#C8102E] mt-0.5">
                      {s.label.startsWith("Step") ? s.label.replace("Step ", "") : s.label.startsWith("Option") ? s.label[7] : "→"}
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{s.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save token + close */}
          <div className="flex gap-2 pt-1">
            {config.needsToken && !saved && (
              <button
                onClick={handleSave}
                disabled={!token.trim() || saving}
                className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save Access Token"}
              </button>
            )}
            {saved && (
              <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-900/20 py-2.5 text-sm font-bold text-green-700 dark:text-green-400 text-center">
                ✓ Token saved
              </div>
            )}
            <button onClick={onClose} className={`${config.needsToken && !saved ? "" : "flex-1"} rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────

function LogoBadge({ letter, live }: { letter: string; live: boolean }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${live ? "bg-[#C8102E]" : "bg-gray-700 dark:bg-white/10"}`}>
      {letter}
    </div>
  );
}

function IntegrationCard({ integration, onSetup }: { integration: Integration; onSetup: (id: IntegrationId) => void }) {
  const ss       = STATUS_STYLE[integration.status];
  const isLive   = integration.status === "live";
  const canSetup = integration.status === "available";

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#1C1F2E] p-5 transition-all ${isLive ? "border-green-200 dark:border-green-900/40 shadow-sm" : "border-gray-100 dark:border-white/5"}`}>
      <div className="flex items-start gap-3 mb-3">
        <LogoBadge letter={integration.logo} live={isLive} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{integration.name}</p>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${ss.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ss.dot}`} />
              {ss.label}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 capitalize mt-0.5">{CATEGORY_LABELS[integration.category]}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{integration.description}</p>

      {isLive && integration.leads_received != null && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-center">
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">{integration.leads_received}</p>
            <p className="text-[9px] text-gray-400">Leads received</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-center">
            <p className="text-sm font-black text-gray-800 dark:text-gray-100">Live</p>
            <p className="text-[9px] text-gray-400">Last sync {integration.last_sync}</p>
          </div>
        </div>
      )}

      {isLive ? (
        <button onClick={() => onSetup(integration.id)} className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          View Setup
        </button>
      ) : canSetup ? (
        <button onClick={() => onSetup(integration.id)} className="w-full rounded-lg bg-[#C8102E] py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors">
          Set Up →
        </button>
      ) : (
        <button disabled className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed">
          Coming Soon
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [opening, setOpening]       = useState<IntegrationId | null>(null);
  const [filter, setFilter]         = useState<Integration["category"] | "all">("all");

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) return;
      fetch(`/api/properties?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => setProperties(d.properties ?? []))
        .catch(() => {});
    });
  }, []);

  const categories = ["all", "listing", "social", "website", "crm"] as const;
  const filtered   = INTEGRATIONS.filter(i => filter === "all" || i.category === filter);
  const live       = INTEGRATIONS.filter(i => i.status === "live").length;

  const activeIntegration = opening ? INTEGRATIONS.find(i => i.id === opening) ?? null : null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Lead Source Integrations</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Connect your listing platforms — leads flow in automatically, AI follows up instantly</p>
            </div>
            <div className="shrink-0 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10 px-4 py-2.5 text-center">
              <p className="text-xl font-black text-green-700 dark:text-green-400">{live}</p>
              <p className="text-[10px] text-green-600 dark:text-green-500 font-semibold">Live</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900/20 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">How integrations work</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              Click "Set Up" on any platform → copy your webhook URL → paste it into that platform's lead delivery settings. Every inquiry instantly creates a lead in LUB and triggers an AI SMS within 60 seconds.
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 flex gap-1 overflow-x-auto">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === c ? "bg-[#C8102E] text-white" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"
              }`}>
              {c === "all" ? "All" : CATEGORY_LABELS[c as Integration["category"]]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(i => (
            <IntegrationCard key={i.id} integration={i} onSetup={setOpening} />
          ))}
        </div>

        {/* Generic webhook */}
        <div className="mt-6 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 font-black text-sm">{"{ }"}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Generic Webhook</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3 leading-relaxed">
                Send leads from any source — website forms, Zapier, Make, custom apps. Accepts JSON or URL-encoded. Add <code className="text-[#C8102E]">?property_id=YOUR_ID</code> to route to the right property.
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                  {APP_URL}/api/leads/webhook?property_id=YOUR_PROPERTY_ID
                </code>
                <CopyBtn value={`${APP_URL}/api/leads/webhook?property_id=YOUR_PROPERTY_ID`} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {activeIntegration && (
        <SetupModal
          integration={activeIntegration}
          properties={properties}
          onClose={() => setOpening(null)}
        />
      )}
    </div>
  );
}
