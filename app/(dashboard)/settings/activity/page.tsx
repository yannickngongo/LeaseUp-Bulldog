"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/demo-auth";
import { EmptyState, EmptyIcons } from "@/components/ui/EmptyState";
import { SkeletonTableRow } from "@/components/ui/Skeleton";

interface LogRow {
  id:          string;
  action:      string;
  actor:       "agent" | "system" | "ai" | string;
  lead_id:     string;
  property_id: string;
  metadata:    Record<string, unknown> | null;
  created_at:  string;
}

const ACTOR_COLORS: Record<string, string> = {
  agent:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  system: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
  ai:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function humanAction(action: string): string {
  return action.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
}

export default function ActivityLogPage() {
  const [logs,    setLogs]     = useState<LogRow[]>([]);
  const [page,    setPage]     = useState(0);
  const [hasMore, setHasMore]  = useState(false);
  const [loading, setLoading]  = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter,  setActorFilter]  = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (actorFilter)  params.set("actor",  actorFilter);
    params.set("page", String(page));

    authFetch(`/api/activity-log?${params.toString()}`)
      .then(r => r.json())
      .then(j => {
        setLogs(j.logs ?? []);
        setHasMore(j.hasMore ?? false);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, actionFilter, actorFilter]);

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every action taken on your account — by you, your team, the AI, and the system. Useful for audits and compliance.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(0); }}
            placeholder="Filter by action (e.g. 'sms_sent')"
            className="flex-1 min-w-[220px] rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm placeholder-gray-400 focus:border-[#C8102E] focus:outline-none"
          />
          <select
            value={actorFilter}
            onChange={e => { setActorFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm focus:border-[#C8102E] focus:outline-none"
          >
            <option value="">All actors</option>
            <option value="agent">Agent (you / team)</option>
            <option value="ai">AI</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] overflow-hidden">
          <div className="grid grid-cols-[140px_120px_1fr] sm:grid-cols-[180px_120px_1fr_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <span>When</span>
            <span>Actor</span>
            <span>Action</span>
            <span className="hidden sm:block">Details</span>
          </div>

          {loading ? (
            <>
              <SkeletonTableRow cols={4} />
              <SkeletonTableRow cols={4} />
              <SkeletonTableRow cols={4} />
              <SkeletonTableRow cols={4} />
            </>
          ) : logs.length === 0 ? (
            <div className="p-2">
              <EmptyState
                icon={EmptyIcons.search}
                title="No activity yet"
                description={
                  actionFilter || actorFilter
                    ? "No log entries match your filter. Try clearing it."
                    : "Once you start receiving leads or making changes, every action will be logged here."
                }
                action={
                  (actionFilter || actorFilter) && (
                    <button
                      onClick={() => { setActionFilter(""); setActorFilter(""); }}
                      className="text-xs font-semibold text-[#C8102E] hover:underline"
                    >
                      Clear filters
                    </button>
                  )
                }
              />
            </div>
          ) : (
            logs.map(row => (
              <div
                key={row.id}
                className="grid grid-cols-[140px_120px_1fr] sm:grid-cols-[180px_120px_1fr_auto] gap-4 px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">{fmt(row.created_at)}</span>
                <span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ACTOR_COLORS[row.actor] ?? ACTOR_COLORS.system}`}>
                    {row.actor}
                  </span>
                </span>
                <span className="text-gray-800 dark:text-gray-200 truncate">{humanAction(row.action)}</span>
                <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 truncate max-w-[260px]">
                  {row.metadata && Object.keys(row.metadata).length > 0
                    ? Object.entries(row.metadata)
                        .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                        .join(" · ")
                    : "—"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Page {page + 1}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5"
              >← Prev</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
