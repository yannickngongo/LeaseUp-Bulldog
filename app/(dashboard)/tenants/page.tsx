"use client";

import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

interface Tenant {
  id: string;
  unit_name: string;
  unit_type: string | null;
  monthly_rent: number | null;
  lease_end: string | null;
  days_left: number;
  current_resident: string | null;
  property_id: string;
  property_name: string;
  satisfaction: "happy" | "neutral" | "at_risk";
  last_contact_days: number;
  open_maintenance: number;
}

type Tab = "all" | "at_risk" | "maintenance" | "upcoming_renewal";
type CampaignType = "renewal" | "checkin" | "maintenance" | "appreciation";

const CAMPAIGN_TEMPLATES: Record<CampaignType, { label: string; icon: string; prompt: string }> = {
  renewal:      { label: "Renewal Offer",       icon: "🔄", prompt: "Send a personalized renewal offer" },
  checkin:      { label: "Satisfaction Check-In",icon: "💬", prompt: "Check in on how they're enjoying their home" },
  maintenance:  { label: "Maintenance Follow-Up",icon: "🔧", prompt: "Follow up on open maintenance requests" },
  appreciation: { label: "Resident Appreciation",icon: "🎁", prompt: "Send a thank-you message for being a great resident" },
};

function satisfactionColor(s: Tenant["satisfaction"]) {
  if (s === "happy")   return { badge: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", dot: "bg-green-500", label: "Happy" };
  if (s === "neutral") return { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",    dot: "bg-blue-400",  label: "Neutral" };
  return                      { badge: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",         dot: "bg-red-500",   label: "At Risk" };
}

function deriveSatisfaction(t: Omit<Tenant, "satisfaction" | "last_contact_days" | "open_maintenance">): Tenant["satisfaction"] {
  if (t.days_left <= 30) return "at_risk";
  if (t.days_left <= 60) return "neutral";
  return "happy";
}

function TenantCard({ tenant, onMessage }: { tenant: Tenant; onMessage: (t: Tenant, type: CampaignType) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sc = satisfactionColor(tenant.satisfaction);
  const leaseDate = tenant.lease_end
    ? new Date(tenant.lease_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className={`rounded-xl border bg-white dark:bg-[#1C1F2E] shadow-sm transition-all ${
      tenant.satisfaction === "at_risk" ? "border-red-200 dark:border-red-900/40" :
      tenant.satisfaction === "neutral" ? "border-amber-100 dark:border-amber-900/20" :
      "border-gray-100 dark:border-white/5"
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {tenant.current_resident || "Resident"} — {tenant.unit_name}
              </p>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {tenant.open_maintenance > 0 && (
                <span className="rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 text-[10px] font-bold">
                  {tenant.open_maintenance} open request{tenant.open_maintenance > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{tenant.property_name}</span>
              {tenant.unit_type && <span>{tenant.unit_type.toUpperCase()}</span>}
              {tenant.monthly_rent && <span>${tenant.monthly_rent.toLocaleString()}/mo</span>}
              <span>Lease ends {leaseDate}</span>
              <span>Last contact {tenant.last_contact_days === 0 ? "today" : `${tenant.last_contact_days}d ago`}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            {expanded ? "Close" : "Actions"}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(CAMPAIGN_TEMPLATES) as [CampaignType, typeof CAMPAIGN_TEMPLATES[CampaignType]][]).map(([type, tmpl]) => (
              <button
                key={type}
                onClick={() => onMessage(tenant, type)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-3 text-center hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5 transition-all"
              >
                <span className="text-xl">{tmpl.icon}</span>
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{tmpl.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageModal({
  tenant, type, onClose,
}: {
  tenant: Tenant; type: CampaignType; onClose: () => void;
}) {
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const tmpl = CAMPAIGN_TEMPLATES[type];

  useEffect(() => {
    setLoading(true);
    const prompts: Record<CampaignType, string> = {
      renewal: `Write a warm, personalized renewal offer SMS for ${tenant.current_resident || "the resident"} in unit ${tenant.unit_name} at ${tenant.property_name}. Their lease ends in ${tenant.days_left} days. Rent is $${tenant.monthly_rent}/mo. Keep it friendly, under 3 sentences, no links.`,
      checkin: `Write a brief satisfaction check-in SMS for ${tenant.current_resident || "the resident"} in unit ${tenant.unit_name} at ${tenant.property_name}. Ask how they're enjoying their home and if there's anything we can improve. Keep it warm, under 2 sentences.`,
      maintenance: `Write a follow-up SMS for ${tenant.current_resident || "the resident"} checking on their ${tenant.open_maintenance} open maintenance request(s) at ${tenant.property_name}, unit ${tenant.unit_name}. Be proactive and apologetic for any delay. Under 2 sentences.`,
      appreciation: `Write a resident appreciation SMS for ${tenant.current_resident || "the resident"} in unit ${tenant.unit_name} at ${tenant.property_name}. Thank them for being a valued resident. Keep it genuine and warm, under 2 sentences.`,
    };

    fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prompts[type], operator_id: "" }),
    })
      .then(r => r.json())
      .then(d => setMessage(d.answer ?? ""))
      .catch(() => setMessage(`Hi ${tenant.current_resident || "there"}! This is your property management team reaching out. ${tmpl.prompt}.`))
      .finally(() => setLoading(false));
  }, [tenant, type, tmpl]);

  function handleSend() {
    setSent(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1F2E] border border-gray-100 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-5 py-4">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">{tmpl.icon} {tmpl.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">To: {tenant.current_resident || "Resident"} · {tenant.unit_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8102E]/20 border-t-[#C8102E]" />
              <p className="text-sm text-gray-500">AI is crafting your message…</p>
            </div>
          ) : sent ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl dark:bg-green-900/30 dark:text-green-400">✓</div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Message Sent!</p>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:border-[#C8102E] mb-3"
              />
              <p className="text-xs text-gray-400 mb-4">{message.length} characters · Sent via SMS</p>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
                <button onClick={handleSend} disabled={!message.trim()} className="flex-1 rounded-lg bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40">Send Message</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("all");
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<{ tenant: Tenant; type: CampaignType } | null>(null);

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) { setLoading(false); return; }
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => {
          const opId = d.operator?.id;
          if (!opId) { setLoading(false); return; }
          return fetch(`/api/tenants?operator_id=${opId}`);
        })
        .then(r => r?.json())
        .then(d => {
          if (d?.tenants) setTenants(d.tenants);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const filtered = tenants
    .filter(t => {
      if (tab === "at_risk")         return t.satisfaction === "at_risk";
      if (tab === "maintenance")     return t.open_maintenance > 0;
      if (tab === "upcoming_renewal") return t.days_left <= 90;
      return true;
    })
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (t.current_resident ?? "").toLowerCase().includes(q) ||
        t.unit_name.toLowerCase().includes(q) ||
        t.property_name.toLowerCase().includes(q);
    });

  const stats = {
    total:       tenants.length,
    atRisk:      tenants.filter(t => t.satisfaction === "at_risk").length,
    maintenance: tenants.filter(t => t.open_maintenance > 0).length,
    renewal90:   tenants.filter(t => t.days_left <= 90).length,
  };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all",              label: "All Tenants",       count: stats.total },
    { key: "at_risk",          label: "At Risk",           count: stats.atRisk },
    { key: "maintenance",      label: "Open Maintenance",  count: stats.maintenance },
    { key: "upcoming_renewal", label: "Renewing in 90d",  count: stats.renewal90 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0E1017]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Tenant Retention</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Keep residents happy, reduce turnover, and protect occupancy</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#C8102E]/10 border border-[#C8102E]/20 px-4 py-2.5">
            <span className="text-[#C8102E] font-black text-lg">{stats.total > 0 ? Math.round(((stats.total - stats.atRisk) / stats.total) * 100) : 0}%</span>
            <span className="text-xs text-[#C8102E] font-semibold">Retention Rate</span>
          </div>
        </div>

        {/* KPI row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Tenants",       value: stats.total,       color: "text-gray-900 dark:text-gray-100" },
            { label: "At Risk",             value: stats.atRisk,      color: "text-red-600 dark:text-red-400" },
            { label: "Open Maintenance",    value: stats.maintenance, color: "text-orange-600 dark:text-orange-400" },
            { label: "Renewing in 90 days", value: stats.renewal90,   color: "text-amber-600 dark:text-amber-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] p-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.key
                    ? "bg-[#C8102E] text-white"
                    : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-500"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search tenants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:ml-auto w-full sm:w-52 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] py-16 text-center">
            <p className="text-4xl mb-3">🏠</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No tenants found</p>
            <p className="text-sm text-gray-400 mt-1">
              {tenants.length === 0 ? "Add occupied units to your properties to see tenants here." : "Try a different filter or search."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <TenantCard key={t.id} tenant={t} onMessage={(tenant, type) => setModal({ tenant, type })} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <MessageModal tenant={modal.tenant} type={modal.type} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
