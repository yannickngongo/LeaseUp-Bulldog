// Leads dashboard — full table view with status filter tabs.
// TODO: replace MOCK_LEADS / MOCK_PROPERTIES with Supabase queries once DB is connected.

import Link from "next/link";
import type { Lead, LeadStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

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
  },
];

// ─── Status filter tabs ───────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus = statusParam ?? "all";

  // TODO: replace with real Supabase query
  // const db = getSupabaseAdmin();
  // let query = db
  //   .from("leads")
  //   .select("*, properties(name)")
  //   .order("created_at", { ascending: false });
  // if (activeStatus !== "all") query = query.eq("status", activeStatus);
  // const { data: leads } = await query;

  const leads =
    activeStatus === "all"
      ? MOCK_LEADS
      : MOCK_LEADS.filter((l) => l.status === activeStatus);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/leads/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Lead
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/leads" : `/leads?status=${tab.value}`}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                activeStatus === tab.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">
            No leads with this status.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Property</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Move Date</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {MOCK_PROPERTIES[lead.property_id] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {lead.email ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-500">
                      {lead.source}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(lead.move_in_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  );
}
