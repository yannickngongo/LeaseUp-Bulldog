"use client";

// TakeoverBanner — sticky red banner that appears at the top of the dashboard
// whenever one or more leads need human attention. Polls every 20s. Each
// pending lead gets a one-click "Open" link to their profile.

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/demo-auth";

interface PendingLead {
  id: string;
  name: string;
  property_id: string;
  last_contacted_at?: string;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TakeoverBanner() {
  const [pending, setPending] = useState<PendingLead[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchBadge = async () => {
      try {
        const r = await authFetch("/api/notifications/badge");
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setPending((j.pendingLeads ?? []) as PendingLead[]);
      } catch { /* ignore — banner just won't update */ }
    };
    fetchBadge();
    const id = setInterval(fetchBadge, 20_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (pending.length === 0) return null;

  const headline = pending.length === 1
    ? `1 lead needs your help`
    : `${pending.length} leads need your help`;

  return (
    <div className="sticky top-0 z-30 mb-4 overflow-hidden rounded-2xl border border-[#C8102E]/30 bg-gradient-to-r from-[#FFF1F4] to-[#FFE8ED] shadow-[0_4px_20px_rgba(200,16,46,0.15)] dark:border-[#C8102E]/40 dark:from-[#2A0F15] dark:to-[#1F0810]">
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Pulsing alert icon */}
        <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-white shadow-[0_0_0_4px_rgba(200,16,46,0.15)]">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M8 1.5L1.5 13.5h13z" />
            <line x1="8" y1="6" x2="8" y2="9.5" />
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
          </svg>
          <span className="absolute -inset-0.5 animate-ping rounded-full bg-[#C8102E]/30" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#C8102E] dark:text-[#FCA5A5]">
              ⚠ {headline} — AI handed off and is waiting on you
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C8102E] transition-colors hover:bg-[#C8102E]/10 dark:text-[#FCA5A5]"
            >
              {collapsed ? "Show" : "Hide"}
            </button>
          </div>

          {!collapsed && (
            <ul className="mt-2 space-y-1.5">
              {pending.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 backdrop-blur-sm dark:bg-black/20">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                    {lead.last_contacted_at && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Last reply {relativeTime(lead.last_contacted_at)}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/leads/${lead.id}#conversation`}
                    className="shrink-0 rounded-lg bg-[#C8102E] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.3)] transition-colors hover:bg-[#A50D25]"
                  >
                    Help now →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
