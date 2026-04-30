import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { MarkLeaseSignedButton } from "@/components/leads/MarkLeaseSignedButton";
import type { Conversation } from "@/types/lead";

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const db = getSupabaseAdmin();

  const [{ data: lead }, { data: conversations }] = await Promise.all([
    db.from("leads").select("*").eq("id", params.id).single(),
    db
      .from("conversations")
      .select("*")
      .eq("lead_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!lead) notFound();

  // Look up operator + per-lease performance fee for the lease-record button
  const { data: property } = await db
    .from("properties")
    .select("operator_id")
    .eq("id", lead.property_id)
    .single();

  const operatorId = property?.operator_id ?? "";
  const { data: sub } = operatorId
    ? await db.from("billing_subscriptions").select("performance_fee_per_lease").eq("operator_id", operatorId).maybeSingle()
    : { data: null };
  const performanceFeePerLease = sub?.performance_fee_per_lease ?? 20000;  // default $200

  const convos: Conversation[] = conversations ?? [];

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back */}
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </a>

        {/* Lead header */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
              <p className="text-sm text-gray-500">{lead.phone}</p>
              {lead.email && (
                <p className="text-sm text-gray-500">{lead.email}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={lead.status} />
              {operatorId && (
                <MarkLeaseSignedButton
                  leadId={lead.id}
                  propertyId={lead.property_id}
                  operatorId={operatorId}
                  leadStatus={lead.status}
                  firstContactDate={lead.first_contact_date ?? null}
                  attributionWindowEnd={lead.attribution_window_end ?? null}
                  performanceFeePerLease={performanceFeePerLease}
                />
              )}
            </div>
          </div>

          {/* AI summary */}
          {lead.ai_summary && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">
                AI Summary — Score: {lead.ai_score}/10
              </p>
              <p>{lead.ai_summary}</p>
            </div>
          )}

          {/* Details grid */}
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 overflow-x-auto">
            <div>
              <dt className="text-gray-400">Move-in</dt>
              <dd className="font-medium text-gray-700">
                {lead.move_in_date ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Budget</dt>
              <dd className="font-medium text-gray-700">
                {lead.budget_min && lead.budget_max
                  ? `$${lead.budget_min}–$${lead.budget_max}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Bedrooms</dt>
              <dd className="font-medium text-gray-700">
                {lead.bedrooms ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Pets</dt>
              <dd className="font-medium text-gray-700">
                {lead.pets == null ? "—" : lead.pets ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Conversation history */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Conversation History
          </h2>

          {convos.length === 0 ? (
            <p className="text-sm text-gray-400">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {convos.map((c) => (
                <div
                  key={c.id}
                  className={`flex ${c.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-sm rounded-xl px-4 py-2 text-sm ${
                      c.direction === "outbound"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p>{c.body}</p>
                    <p
                      className={`mt-1 text-xs ${
                        c.direction === "outbound"
                          ? "text-blue-200"
                          : "text-gray-400"
                      }`}
                    >
                      {formatDateTime(c.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
