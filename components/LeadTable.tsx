import Link from "next/link";
import type { Lead } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
        No leads yet. Add your first lead to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">AI Score</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-left">Last Contact</th>
            <th className="px-4 py-3 text-left">Follow-up</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  href={`/leads/${lead.id}`}
                  className="hover:underline text-blue-600"
                >
                  {lead.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3">
                {lead.ai_score != null ? (
                  <span
                    className={`font-semibold ${
                      lead.ai_score >= 7
                        ? "text-green-600"
                        : lead.ai_score >= 4
                        ? "text-yellow-600"
                        : "text-red-500"
                    }`}
                  >
                    {lead.ai_score}/10
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 capitalize">
                {lead.source ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatDate(lead.last_contacted_at)}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatDate(lead.follow_up_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
