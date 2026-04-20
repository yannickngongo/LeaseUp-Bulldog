"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { getOperatorEmail } from "@/lib/demo-auth";

const PAGE_META: Record<string, { title: string; action?: { label: string; href: string } }> = {
  "/dashboard":   { title: "Dashboard" },
  "/leads":       { title: "Leads",       action: { label: "+ Add Lead",      href: "/leads/new" } },
  "/properties":  { title: "Properties",  action: { label: "+ Add Property",  href: "/properties/new" } },
  "/calendar":    { title: "Calendar" },
  "/automations": { title: "Automations" },
  "/marketing":   { title: "Marketing" },
  "/insights":    { title: "Insights" },
  "/settings":    { title: "Settings" },
};

function getBreadcrumb(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const key = Object.keys(PAGE_META).find(
    (k) => k !== "/dashboard" && pathname.startsWith(k)
  );
  return key ? PAGE_META[key] : { title: "Dashboard" };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface ActivityItem {
  id: string;
  created_at: string;
  action: string;
  actor: string;
  metadata?: Record<string, unknown>;
  lead_id?: string;
  property_id?: string;
}

function activityIcon(action: string): { icon: string; bg: string; text: string } {
  if (action.includes("lead") || action.includes("new_lead"))
    return { icon: "👤", bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600" };
  if (action.includes("sms") || action.includes("message") || action.includes("reply"))
    return { icon: "💬", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600" };
  if (action.includes("tour"))
    return { icon: "🗓", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600" };
  if (action.includes("won") || action.includes("lease") || action.includes("signed"))
    return { icon: "🎉", bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600" };
  if (action.includes("follow") || action.includes("nudge"))
    return { icon: "🔔", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600" };
  return { icon: "✦", bg: "bg-gray-50 dark:bg-white/5", text: "text-gray-500" };
}

function formatAction(action: string, metadata?: Record<string, unknown>): string {
  const lead = (metadata?.lead_name as string) ?? "";
  const map: Record<string, string> = {
    new_lead:            lead ? `New lead: ${lead}` : "New lead received",
    sms_sent:            lead ? `SMS sent to ${lead}` : "SMS sent",
    sms_received:        lead ? `SMS from ${lead}` : "Inbound SMS",
    ai_reply_sent:       lead ? `AI replied to ${lead}` : "AI sent reply",
    tour_scheduled:      lead ? `Tour booked: ${lead}` : "Tour scheduled",
    tour_completed:      lead ? `Tour completed: ${lead}` : "Tour completed",
    lead_won:            lead ? `Lease signed: ${lead}` : "Lease signed",
    follow_up_sent:      lead ? `Follow-up sent to ${lead}` : "Follow-up sent",
    status_changed:      lead ? `Status updated: ${lead}` : "Lead status changed",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

function IconSun() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <circle cx="9" cy="9" r="3" />
      <path d="M9 1.5V3M9 15v1.5M1.5 9H3M15 9h1.5M3.7 3.7l1 1M13.3 13.3l1 1M3.7 14.3l1-1M13.3 4.7l1-1" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M15 10.5A7 7 0 017.5 3a7 7 0 100 12A7 7 0 0115 10.5z" />
    </svg>
  );
}

// ─── Notification Panel ───────────────────────────────────────────────────────

function NotificationPanel({
  open,
  onClose,
  operatorId,
}: {
  open: boolean;
  onClose: () => void;
  operatorId: string;
}) {
  const [items, setItems]     = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded || !operatorId) return;
    setLoading(true);
    fetch(`/api/activity?operator_id=${operatorId}&limit=15`)
      .then(r => r.json())
      .then(j => { setItems(j.activity ?? []); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [open, loaded, operatorId]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1C1F2E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          <p className="text-[11px] text-gray-400">Recent activity across all properties</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
            <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[380px] overflow-y-auto">
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 shrink-0 rounded-xl bg-gray-100 dark:bg-white/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-white/5" />
                  <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-300">
                <path d="M9 1.5a5 5 0 015 5v3l1.5 2.5H2.5L4 9.5v-3a5 5 0 015-5z" />
                <path d="M7 14.5a2 2 0 004 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No activity yet</p>
            <p className="mt-0.5 text-xs text-gray-400">Activity will appear here as leads come in.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {items.map(item => {
              const { icon, bg } = activityIcon(item.action);
              const label = formatAction(item.action, item.metadata);
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm ${bg}`}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-snug">{label}</p>
                    {typeof item.metadata?.property_name === "string" && (
                      <p className="mt-0.5 text-[11px] text-gray-400 truncate">
                        {item.metadata.property_name}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-gray-400">{relativeTime(item.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-gray-50 px-4 py-3 dark:border-white/5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="block text-center text-xs font-semibold text-[#C8102E] hover:underline"
          >
            View all activity →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── AppHeader ────────────────────────────────────────────────────────────────

export function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const meta = getBreadcrumb(pathname);
  const { theme, toggle } = useTheme();
  const [initials, setInitials]         = useState("?");
  const [operatorId, setOperatorId]     = useState("");
  const [notifOpen, setNotifOpen]       = useState(false);
  const [hasActivity, setHasActivity]   = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOperatorEmail().then((email) => {
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(j => {
          const name = j.operator?.name ?? email.split("@")[0];
          setInitials(name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
          if (j.operator?.id) {
            setOperatorId(j.operator.id);
            fetch(`/api/activity?operator_id=${j.operator.id}&limit=1`)
              .then(r => r.json())
              .then(j2 => setHasActivity((j2.activity ?? []).length > 0))
              .catch(() => {});
          }
        })
        .catch(() => setInitials(email[0]?.toUpperCase() ?? "?"));
    });
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 dark:border-white/5 dark:bg-[#12141E] lg:px-6">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-[18px] w-[18px]">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.title}</h2>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {meta.action && (
          <Link
            href={meta.action.href}
            className="rounded-lg bg-[#C8102E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]"
          >
            {meta.action.label}
          </Link>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M9 1.5a5 5 0 015 5v3l1.5 2.5H2.5L4 9.5v-3a5 5 0 015-5z" />
              <path d="M7 14.5a2 2 0 004 0" />
            </svg>
            {hasActivity && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            )}
          </button>
          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            operatorId={operatorId}
          />
        </div>

        {/* User avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white dark:bg-white/10 dark:text-gray-100">
          {initials}
        </button>
      </div>
    </header>
  );
}
