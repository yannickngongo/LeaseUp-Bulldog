// Operator dashboard — KPI cards + recent activity feed.
// This is a Server Component. All data is fetched server-side, no client JS needed.
//
// Stubs are clearly marked with TODO: WIRE so you know exactly what to connect next.

import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS } from "@/lib/lead-status";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Replace each block with the Supabase query shown in its TODO comment.

const MOCK_LEADS: Lead[] = [
  {
    id: "1", created_at: "2025-06-01T09:00:00Z", updated_at: "2025-06-01T09:01:12Z",
    property_id: "prop-1", name: "Jordan Ellis", phone: "+17025550101",
    email: "jordan.ellis@email.com", source: "zillow", status: "engaged",
    preferred_contact: "sms", move_in_date: "2025-08-01", bedrooms: 2,
    budget_min: 1800, budget_max: 2200, last_contacted_at: "2025-06-01T09:01:12Z",
  },
  {
    id: "2", created_at: "2025-06-03T14:22:00Z", updated_at: "2025-06-03T14:22:45Z",
    property_id: "prop-1", name: "Maya Thompson", phone: "+17025550102",
    email: "maya.t@gmail.com", source: "website", status: "new",
    preferred_contact: "email", move_in_date: "2025-07-15",
  },
  {
    id: "3", created_at: "2025-06-05T09:10:00Z", updated_at: "2025-06-05T09:10:58Z",
    property_id: "prop-2", name: "Carlos Reyes", phone: "+17025550103",
    source: "apartments.com", status: "tour_scheduled",
    preferred_contact: "sms", move_in_date: "2025-09-01", bedrooms: 1,
    last_contacted_at: "2025-06-05T09:10:58Z",
  },
  {
    id: "4", created_at: "2025-06-07T16:45:00Z", updated_at: "2025-06-07T16:46:03Z",
    property_id: "prop-2", name: "Aisha Patel", phone: "+17025550104",
    email: "aisha.patel@work.com", source: "facebook", status: "applied",
    preferred_contact: "call", last_contacted_at: "2025-06-07T16:46:03Z",
  },
  {
    id: "5", created_at: "2025-06-10T11:30:00Z", updated_at: "2025-06-10T11:30:00Z",
    property_id: "prop-1", name: "Derek Nguyen", phone: "+17025550105",
    email: "derek.n@gmail.com", source: "manual", status: "lost",
    preferred_contact: "sms", move_in_date: "2025-07-01",
  },
];

// TODO: WIRE — query activity_logs joined to leads, last 10 rows, newest first
// const { data: recentActivity } = await db
//   .from("activity_logs")
//   .select("id, created_at, action, actor, lead_id, metadata, leads(name)")
//   .order("created_at", { ascending: false })
//   .limit(10);

interface MockActivityItem {
  id: string;
  created_at: string;
  action: string;
  actor: "system" | "ai" | "agent";
  lead_name: string;
  metadata?: Record<string, string>;
}

const MOCK_ACTIVITY: MockActivityItem[] = [
  { id: "a1", created_at: "2025-06-10T11:31:00Z", action: "sms_sent",        actor: "ai",     lead_name: "Derek Nguyen",  metadata: { preview: "Hi Derek! Thanks for reaching out..." } },
  { id: "a2", created_at: "2025-06-10T11:30:00Z", action: "lead_created",    actor: "system", lead_name: "Derek Nguyen" },
  { id: "a3", created_at: "2025-06-07T16:46:00Z", action: "sms_sent",        actor: "ai",     lead_name: "Aisha Patel",   metadata: { preview: "Hey Aisha, great to hear from you..." } },
  { id: "a4", created_at: "2025-06-07T16:45:00Z", action: "lead_created",    actor: "system", lead_name: "Aisha Patel" },
  { id: "a5", created_at: "2025-06-05T09:12:00Z", action: "sms_received",    actor: "system", lead_name: "Carlos Reyes",  metadata: { preview: "Yes I'd love to see the 1BR" } },
  { id: "a6", created_at: "2025-06-05T09:11:00Z", action: "sms_sent",        actor: "ai",     lead_name: "Carlos Reyes",  metadata: { preview: "Hi Carlos! Are you looking for a 1BR or 2BR?" } },
  { id: "a7", created_at: "2025-06-05T09:10:00Z", action: "lead_created",    actor: "system", lead_name: "Carlos Reyes" },
  { id: "a8", created_at: "2025-06-03T14:22:00Z", action: "lead_created",    actor: "system", lead_name: "Maya Thompson" },
  { id: "a9", created_at: "2025-06-01T09:01:00Z", action: "sms_received",    actor: "system", lead_name: "Jordan Ellis",  metadata: { preview: "Hi! I saw your listing on Zillow" } },
  { id: "a10",created_at: "2025-06-01T09:00:00Z", action: "lead_created",    actor: "system", lead_name: "Jordan Ellis" },
];

// ─── KPI calculations ─────────────────────────────────────────────────────────

// TODO: WIRE — db.from("leads").select("count").single()
const totalLeads = MOCK_LEADS.length;

// TODO: WIRE — median of (first outbound sms timestamp − lead created_at) per lead.
// Query: activity_logs where action IN ('lead_created','sms_sent'), grouped by lead_id.
// Compute per-lead delta in JS, then take the median across all leads.
const medianResponseTime = "1m 12s"; // stub — real value needs activity_logs query

// TODO: WIRE — db.from("tours").select("count").neq("status","cancelled").single()
const toursBooked = 1; // stub — real value needs tours table

// TODO: WIRE — db.from("applications").select("count").single()
const applicationStarts = 1; // stub — real value needs applications table

// TODO: WIRE — db.from("applications").select("count").eq("status","submitted").single()
const applicationCompletions = 0; // stub — real value needs applications table

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

const ACTION_LABELS: Record<string, string> = {
  lead_created:           "New lead created",
  sms_sent:               "SMS sent",
  sms_received:           "SMS received",
  tour_scheduled:         "Tour scheduled",
  application_started:    "Application started",
  application_completed:  "Application completed",
  inbound_sms_unmatched:  "Unmatched inbound SMS",
  status_changed:         "Status updated",
};

const ACTOR_COLOR: Record<string, string> = {
  system: "bg-gray-100 text-gray-500",
  ai:     "bg-violet-100 text-violet-600",
  agent:  "bg-blue-100 text-blue-600",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  stub,
}: {
  label: string;
  value: string | number;
  sub?: string;
  stub?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${stub ? "text-gray-300" : "text-gray-900"}`}>
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {stub && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
            needs wiring
          </span>
        )}
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">LeaseUp Bulldog — pipeline overview</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/leads"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              All Leads
            </Link>
            <Link
              href="/properties"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Properties
            </Link>
            <Link
              href="/leads/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Lead
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Total Leads"
            value={totalLeads}
            sub="all time"
          />
          <KpiCard
            label="Median Response"
            value={medianResponseTime}
            sub="lead → first SMS"
            stub
          />
          <KpiCard
            label="Tours Booked"
            value={toursBooked}
            sub="not cancelled"
            stub
          />
          <KpiCard
            label="App Starts"
            value={applicationStarts}
            sub="applications opened"
            stub
          />
          <KpiCard
            label="App Completions"
            value={applicationCompletions}
            sub="applications submitted"
            stub
          />
        </div>

        {/* Two-column layout: recent leads + activity feed */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Recent Leads */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recent Leads
              </h2>
              <Link href="/leads" className="text-xs text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              {MOCK_LEADS.slice(0, 5).map((lead, i) => (
                <div
                  key={lead.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < MOCK_LEADS.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {lead.name}
                    </Link>
                    <p className="truncate text-xs text-gray-400">
                      {lead.source} · {formatDate(lead.created_at)}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0">
                    <StatusBadge status={lead.status as LeadStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {/* TODO: WIRE — replace MOCK_ACTIVITY with live Supabase query (see stub above) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recent Activity
              </h2>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                needs wiring
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              {MOCK_ACTIVITY.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    i < MOCK_ACTIVITY.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  {/* Actor pill */}
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${ACTOR_COLOR[item.actor]}`}
                  >
                    {item.actor}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{item.lead_name}</span>
                      {" — "}
                      {ACTION_LABELS[item.action] ?? item.action}
                    </p>
                    {item.metadata?.preview && (
                      <p className="mt-0.5 truncate text-xs text-gray-400 italic">
                        &ldquo;{item.metadata.preview}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <p className="shrink-0 text-xs text-gray-400">
                    {formatTime(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
