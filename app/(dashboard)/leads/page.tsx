import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROPERTIES: Record<string, string> = {
  "prop-1": "The Monroe",
  "prop-2": "Parkview Commons",
};

const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    created_at: "2025-06-01T10:00:00Z",
    updated_at: "2025-06-01T10:00:00Z",
    property_id: "prop-1",
    name: "Jordan Ellis",
    phone: "+17025550101",
    email: "jordan.ellis@email.com",
    source: "zillow",
    status: "engaged",
    preferred_contact: "sms",
    move_in_date: "2025-08-01",
    ai_score: 8,
  },
  {
    id: "2",
    created_at: "2025-06-03T14:22:00Z",
    updated_at: "2025-06-03T14:22:00Z",
    property_id: "prop-1",
    name: "Maya Thompson",
    phone: "+17025550102",
    email: "maya.t@gmail.com",
    source: "website",
    status: "new",
    preferred_contact: "email",
    move_in_date: "2025-07-15",
    ai_score: 6,
  },
  {
    id: "3",
    created_at: "2025-06-05T09:10:00Z",
    updated_at: "2025-06-05T09:10:00Z",
    property_id: "prop-2",
    name: "Carlos Reyes",
    phone: "+17025550103",
    email: undefined,
    source: "apartments.com",
    status: "tour_scheduled",
    preferred_contact: "sms",
    move_in_date: "2025-09-01",
    ai_score: 9,
  },
  {
    id: "4",
    created_at: "2025-06-07T16:45:00Z",
    updated_at: "2025-06-07T16:45:00Z",
    property_id: "prop-2",
    name: "Aisha Patel",
    phone: "+17025550104",
    email: "aisha.patel@work.com",
    source: "facebook",
    status: "contacted",
    preferred_contact: "call",
    move_in_date: undefined,
    ai_score: 5,
  },
  {
    id: "5",
    created_at: "2025-06-10T11:30:00Z",
    updated_at: "2025-06-10T11:30:00Z",
    property_id: "prop-1",
    name: "Derek Nguyen",
    phone: "+17025550105",
    email: "derek.n@gmail.com",
    source: "manual",
    status: "lost",
    preferred_contact: "sms",
    move_in_date: "2025-07-01",
    ai_score: 2,
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Engaged", value: "engaged" },
  { label: "Tour Scheduled", value: "tour_scheduled" },
  { label: "Applied", value: "applied" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

const STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; bg: string; text: string }> = {
  new:            { label: "New",            dot: "#6366F1", bg: "#EEF2FF", text: "#4338CA" },
  contacted:      { label: "Contacted",      dot: "#0EA5E9", bg: "#E0F2FE", text: "#0369A1" },
  engaged:        { label: "Engaged",        dot: "#8B5CF6", bg: "#F3E8FF", text: "#6D28D9" },
  tour_scheduled: { label: "Tour Scheduled", dot: "#F59E0B", bg: "#FEF3C7", text: "#B45309" },
  applied:        { label: "Applied",        dot: "#F97316", bg: "#FFF7ED", text: "#C2410C" },
  won:            { label: "Won",            dot: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  lost:           { label: "Lost",           dot: "#94A3B8", bg: "#F1F5F9", text: "#475569" },
};

const SOURCE_ICONS: Record<string, string> = {
  zillow: "Z",
  website: "W",
  "apartments.com": "A",
  facebook: "f",
  manual: "M",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#F3E8FF", text: "#6D28D9" },
  { bg: "#FEF3C7", text: "#92400E" },
];

function avatarColor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="flex-1 rounded-2xl bg-white px-6 py-5"
      style={{
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-3xl font-black tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus = statusParam ?? "all";

  const allLeads = MOCK_LEADS;
  const leads =
    activeStatus === "all"
      ? allLeads
      : allLeads.filter((l) => l.status === activeStatus);

  const countByStatus = (s: LeadStatus) => allLeads.filter((l) => l.status === s).length;
  const tourCount = countByStatus("tour_scheduled");
  const wonCount = countByStatus("won");
  const newCount = countByStatus("new");
  const conversionRate = allLeads.length > 0 ? Math.round((wonCount / allLeads.length) * 100) : 0;

  return (
    <div className="min-h-screen px-8 py-8" style={{ background: "#F9F8F7" }}>
      <div className="mx-auto max-w-7xl space-y-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-black tracking-tight text-gray-900"
              style={{ letterSpacing: "-0.03em" }}
            >
              Leads
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {allLeads.length} total lead{allLeads.length !== 1 ? "s" : ""} across all properties
            </p>
          </div>
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{
              background: "#C8102E",
              boxShadow: "0 2px 8px rgba(200,16,46,0.30), 0 0 0 1px rgba(200,16,46,0.15)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Lead
          </Link>
        </div>

        {/* ── Stat cards ── */}
        <div className="flex gap-4">
          <StatCard label="Total Leads" value={allLeads.length} accent="#C8102E" sub="all time" />
          <StatCard label="New" value={newCount} accent="#6366F1" sub="awaiting contact" />
          <StatCard label="Tours Scheduled" value={tourCount} accent="#F59E0B" sub="upcoming" />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} accent="#10B981" sub={`${wonCount} lease${wonCount !== 1 ? "s" : ""} signed`} />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? allLeads.length
                : allLeads.filter((l) => l.status === tab.value).length;
            const active = activeStatus === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.value === "all" ? "/leads" : `/leads?status=${tab.value}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium"
                style={
                  active
                    ? {
                        background: "#C8102E",
                        color: "#fff",
                        boxShadow: "0 1px 4px rgba(200,16,46,0.25)",
                      }
                    : {
                        background: "#fff",
                        color: "#6B7280",
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                      }
                }
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={
                    active
                      ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                      : { background: "#F3F4F6", color: "#6B7280" }
                  }
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Table ── */}
        {leads.length === 0 ? (
          <div
            className="rounded-2xl bg-white px-8 py-16 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)" }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "#FEE2E2" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8" r="4" stroke="#C8102E" strokeWidth="1.5" />
                <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" stroke="#C8102E" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">No leads with this status</p>
            <p className="mt-1 text-xs text-gray-400">Try a different filter or add a new lead</p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)" }}
          >
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F0EF" }}>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Lead</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Property</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Source</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">AI Score</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Move-in</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Added</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const av = avatarColor(lead.id);
                  const st = STATUS_CONFIG[lead.status];
                  const isLast = i === leads.length - 1;
                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: isLast ? "none" : "1px solid #F9F8F7",
                      }}
                      className="group"
                    >
                      {/* Lead cell */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: av.bg, color: av.text }}
                          >
                            {getInitials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="block truncate text-sm font-semibold text-gray-900 hover:text-[#C8102E]"
                              style={{ transition: "color 0.15s" }}
                            >
                              {lead.name}
                            </Link>
                            <p className="truncate text-xs text-gray-400">
                              {lead.email ?? lead.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Property */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">
                          {MOCK_PROPERTIES[lead.property_id] ?? "—"}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium capitalize"
                          style={{ background: "#F3F4F6", color: "#374151" }}
                        >
                          <span
                            className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-black text-white"
                            style={{ background: "#9CA3AF" }}
                          >
                            {SOURCE_ICONS[lead.source] ?? lead.source[0].toUpperCase()}
                          </span>
                          {lead.source}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: st.bg, color: st.text }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: st.dot }}
                          />
                          {st.label}
                        </span>
                      </td>

                      {/* AI Score */}
                      <td className="px-5 py-4">
                        {lead.ai_score != null ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 w-16 overflow-hidden rounded-full"
                              style={{ background: "#F3F4F6" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${lead.ai_score * 10}%`,
                                  background:
                                    lead.ai_score >= 7
                                      ? "#10B981"
                                      : lead.ai_score >= 4
                                      ? "#F59E0B"
                                      : "#EF4444",
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  lead.ai_score >= 7
                                    ? "#065F46"
                                    : lead.ai_score >= 4
                                    ? "#92400E"
                                    : "#991B1B",
                              }}
                            >
                              {lead.ai_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Move-in */}
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {formatDate(lead.move_in_date)}
                      </td>

                      {/* Added */}
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {formatDate(lead.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100"
                          style={{
                            background: "#F9F8F7",
                            color: "#374151",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                            transition: "opacity 0.15s",
                          }}
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
