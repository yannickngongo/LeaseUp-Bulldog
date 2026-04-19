import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  new:            { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-400" },
  contacted:      { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-400" },
  engaged:        { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-400" },
  tour_scheduled: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  applied:        { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400" },
  won:            { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500" },
  lost:           { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-400" },
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:            "New",
  contacted:      "Contacted",
  engaged:        "Engaged",
  tour_scheduled: "Tour Scheduled",
  applied:        "Applied",
  won:            "Won",
  lost:           "Lost",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Count badge ──────────────────────────────────────────────────────────────

export function CountBadge({ count, variant = "default" }: { count: number; variant?: "default" | "danger" | "warning" }) {
  const VARIANTS = {
    default: "bg-gray-100 text-gray-600",
    danger:  "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={cn("ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums", VARIANTS[variant])}>
      {count}
    </span>
  );
}
