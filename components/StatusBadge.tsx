import type { LeadStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/lead-status";

const COLORS: Record<LeadStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  contacted: "bg-blue-100 text-blue-700",
  engaged: "bg-violet-100 text-violet-700",
  tour_scheduled: "bg-amber-100 text-amber-700",
  applied: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
