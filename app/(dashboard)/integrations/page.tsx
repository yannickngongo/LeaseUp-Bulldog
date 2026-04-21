"use client";

import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  logo: string;
  description: string;
  category: "listing" | "social" | "crm" | "website";
  status: "connected" | "available" | "coming_soon";
  leads_received?: number;
  last_sync?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "zillow",        name: "Zillow Rental Manager", logo: "Z",  category: "listing", status: "available",    description: "Auto-import leads from Zillow listings directly into your LUB pipeline." },
  { id: "apartments",   name: "Apartments.com",         logo: "A",  category: "listing", status: "available",    description: "Route inquiries from Apartments.com listings straight to AI follow-up." },
  { id: "facebook",     name: "Facebook Lead Ads",      logo: "f",  category: "social",  status: "available",    description: "Capture Facebook & Instagram lead ad submissions in real time." },
  { id: "rentcom",      name: "Rent.com",               logo: "R",  category: "listing", status: "coming_soon",  description: "Import leads from Rent.com property listings automatically." },
  { id: "hotpads",      name: "HotPads",                logo: "H",  category: "listing", status: "coming_soon",  description: "Sync leads from HotPads (a Zillow Group platform) into LUB." },
  { id: "craigslist",   name: "Craigslist",             logo: "CL", category: "listing", status: "available",    description: "Forward Craigslist email inquiries into your lead pipeline." },
  { id: "website",      name: "Website Lead Widget",    logo: "W",  category: "website", status: "connected",    leads_received: 47, last_sync: "2 minutes ago", description: "Embed the LUB chat widget on your property website. Leads flow in automatically." },
  { id: "google",       name: "Google My Business",     logo: "G",  category: "social",  status: "coming_soon",  description: "Capture leads from Google property inquiries and messages." },
  { id: "hubspot",      name: "HubSpot CRM",            logo: "HS", category: "crm",     status: "coming_soon",  description: "Sync LUB contacts and conversations to your HubSpot CRM." },
  { id: "salesforce",   name: "Salesforce",             logo: "SF", category: "crm",     status: "coming_soon",  description: "Push qualified leads and lease outcomes to Salesforce." },
];

const CATEGORY_LABELS: Record<Integration["category"], string> = {
  listing: "Listing Platforms",
  social:  "Social & Search",
  website: "Website & Widgets",
  crm:     "CRM & Data",
};

const STATUS_STYLE = {
  connected:    { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", label: "Connected", dot: "bg-green-500" },
  available:    { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",    label: "Available",  dot: "bg-blue-400" },
  coming_soon:  { badge: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500",        label: "Soon",       dot: "bg-gray-400" },
};

function LogoBadge({ letter, connected }: { letter: string; connected: boolean }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${
      connected ? "bg-[#C8102E]" : "bg-gray-700 dark:bg-white/10"
    }`}>
      {letter}
    </div>
  );
}

function IntegrationCard({ integration, onConnect }: { integration: Integration; onConnect: (id: string) => void }) {
  const ss = STATUS_STYLE[integration.status];
  const isConnected  = integration.status === "connected";
  const isAvailable  = integration.status === "available";

  return (
    <div className={`rounded-2xl border bg-white dark:bg-[#1C1F2E] p-5 transition-all ${
      isConnected ? "border-green-200 dark:border-green-900/40 shadow-sm" : "border-gray-100 dark:border-white/5"
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <LogoBadge letter={integration.logo} connected={isConnected} />
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

      {isConnected && integration.leads_received != null && (
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

      {isConnected ? (
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Configure</button>
          <button className="rounded-lg border border-red-200 dark:border-red-900/40 py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">Disconnect</button>
        </div>
      ) : isAvailable ? (
        <button
          onClick={() => onConnect(integration.id)}
          className="w-full rounded-lg bg-[#C8102E] py-2 text-xs font-bold text-white hover:bg-[#A50D25] transition-colors"
        >
          Connect →
        </button>
      ) : (
        <button disabled className="w-full rounded-lg border border-gray-200 dark:border-white/10 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed">
          Coming Soon
        </button>
      )}
    </div>
  );
}

function ConnectModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [step, setStep]   = useState<"form" | "success">("form");
  const [apiKey, setApiKey] = useState("");

  const fields: Record<string, { label: string; placeholder: string; hint: string }> = {
    zillow:      { label: "Zillow API Key",         placeholder: "zrws_...",              hint: "Found in your Zillow Rental Manager account → API settings" },
    apartments:  { label: "CoStar Group API Key",   placeholder: "csg_...",               hint: "Available in your Apartments.com partner portal" },
    facebook:    { label: "Facebook Page Access Token", placeholder: "EAABs...",          hint: "Create a token in Meta Business Suite → Leads Access Manager" },
    craigslist:  { label: "Forwarding Email",       placeholder: "leads@yourproperty.com", hint: "Set this as your reply-to email in your Craigslist posts" },
    website:     { label: "Website Domain",         placeholder: "yourproperty.com",       hint: "We'll generate an embed script for your website" },
  };

  const field = fields[integration.id] ?? { label: "API Key", placeholder: "Enter your API key", hint: "Contact your platform's support for API access." };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
          <p className="font-bold text-gray-900 dark:text-gray-100">Connect {integration.name}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5">
          {step === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-2xl">✓</div>
              <p className="font-bold text-gray-900 dark:text-gray-100">{integration.name} Connected!</p>
              <p className="text-sm text-gray-500">Leads will now flow automatically into your LUB pipeline. AI follow-up activates instantly on each new inquiry.</p>
              <button onClick={onClose} className="mt-2 rounded-lg bg-[#C8102E] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25]">Done</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{integration.description}</p>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{field.label}</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">{field.hint}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300">Cancel</button>
                <button
                  onClick={() => setStep("success")}
                  disabled={!apiKey.trim()}
                  className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40"
                >
                  Connect
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const [filter, setFilter]         = useState<Integration["category"] | "all">("all");

  const categories = ["all", "listing", "social", "website", "crm"] as const;

  const filtered = INTEGRATIONS.filter(i => filter === "all" || i.category === filter);
  const connected = INTEGRATIONS.filter(i => i.status === "connected").length;

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
              <p className="text-xl font-black text-green-700 dark:text-green-400">{connected}</p>
              <p className="text-[10px] text-green-600 dark:text-green-500 font-semibold">Connected</p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900/20 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">How integrations work</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              Connect a platform → leads are captured automatically → LUB AI sends the first message within 60 seconds → you see everything in your Leads dashboard. No manual copy-paste. No missed inquiries.
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
            <IntegrationCard key={i.id} integration={i} onConnect={() => setConnecting(i)} />
          ))}
        </div>

        {/* Custom webhook */}
        <div className="mt-6 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 font-black text-sm">{"{ }"}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Custom Webhook</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">Send leads from any source — your own website, a custom form, or any platform — to your LUB webhook endpoint. Leads appear instantly in your pipeline.</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 dark:text-gray-400 font-mono truncate">https://leaseupbulldog.com/api/webhook/leads/YOUR_KEY</code>
                <button className="shrink-0 text-[10px] font-bold text-[#C8102E] hover:underline">Copy</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {connecting && (
        <ConnectModal integration={connecting} onClose={() => setConnecting(null)} />
      )}
    </div>
  );
}
