"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/Badge";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="9" cy="6" r="3.5" />
      <path d="M2 17c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

function IconProperties() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M1.5 16.5V7.5L9 2.5l7.5 5v9" />
      <path d="M6.5 16.5v-5h5v5" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="1.5" y="3" width="15" height="13.5" rx="2" />
      <path d="M1.5 8h15M6 1.5V5M12 1.5V5" />
    </svg>
  );
}

function IconAutomations() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M10 1.5 3.5 10H9l-1 6.5L16 7.5H10L11 1.5z" />
    </svg>
  );
}

function IconInsights() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M1.5 13.5 6 8.5l4 3.5 6-8" />
      <path d="M12.5 4H17v4.5" />
    </svg>
  );
}

function IconMarketing() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M2 13V5l6-3 6 3v8l-6 3-6-3z" />
      <path d="M8 2v14M2 9h12" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M4.1 4.1l1.4 1.4M12.5 12.5l1.4 1.4M4.1 13.9l1.4-1.4M12.5 5.5l1.4-1.4" />
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_PRIMARY: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",    icon: <IconDashboard /> },
  { href: "/leads",        label: "Leads",        icon: <IconLeads /> },
  { href: "/properties",   label: "Properties",   icon: <IconProperties /> },
];

const NAV_SECONDARY: NavItem[] = [
  { href: "/calendar",     label: "Calendar",     icon: <IconCalendar /> },
  { href: "/automations",  label: "Automations",  icon: <IconAutomations /> },
  { href: "/marketing",    label: "Marketing",    icon: <IconMarketing /> },
  { href: "/insights",     label: "Insights",     icon: <IconInsights /> },
];

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({ item, active, onClose }: { item: NavItem; active: boolean; onClose?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-zinc-100 font-medium text-gray-900 dark:bg-white/10 dark:text-gray-100"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
      )}
    >
      <span className={cn("transition-colors", active ? "text-[#C8102E]" : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300")}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <CountBadge count={item.badge} variant={active ? "danger" : "default"} />
      )}
    </Link>
  );
}

// ─── NavGroup label ───────────────────────────────────────────────────────────

function NavGroupLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
      {label}
    </p>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("?");

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(j => {
          const name = j.operator?.name ?? email.split("@")[0];
          setUserName(name);
          setUserInitials(name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
        })
        .catch(() => { setUserName(email.split("@")[0]); setUserInitials(email[0]?.toUpperCase() ?? "?"); });
    });
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-gray-100 bg-white dark:border-white/5 dark:bg-[#12141E]">

      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-100 px-4 dark:border-white/5">
        <Link href="/" className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
          LeaseUp<span className="text-[#C8102E]">Bulldog</span>
        </Link>
      </div>

      {/* Property selector */}
      <div className="px-3 pt-4">
        <button className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#C8102E]/10 text-[10px] font-bold text-[#C8102E]">
              A
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">All Properties</span>
          </div>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3 text-gray-400 dark:text-gray-500">
            <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        <div className="space-y-0.5">
          {NAV_PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
          ))}
        </div>

        <NavGroupLabel label="Operations" />
        <div className="space-y-0.5">
          {NAV_SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-0.5 dark:border-white/5">
        <NavLink item={{ href: "/settings", label: "Settings", icon: <IconSettings /> }} active={isActive("/settings")} onClose={onClose} />

        {/* User */}
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white dark:bg-white/10 dark:text-gray-200">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{userName || "Loading…"}</p>
            <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">LeaseUp Bulldog</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
