"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const PAGE_META: Record<string, { title: string; action?: { label: string; href: string } }> = {
  "/dashboard":   { title: "Dashboard" },
  "/leads":       { title: "Leads",       action: { label: "+ Add Lead",      href: "/leads/new" } },
  "/properties":  { title: "Properties",  action: { label: "+ Add Property",  href: "/properties/new" } },
  "/calendar":    { title: "Calendar" },
  "/automations": { title: "Automations" },
  "/insights":    { title: "Insights" },
  "/settings":    { title: "Settings" },
};

function getBreadcrumb(pathname: string) {
  // Exact match first
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Match by prefix (e.g. /leads/123 → Leads)
  const key = Object.keys(PAGE_META).find(
    (k) => k !== "/dashboard" && pathname.startsWith(k)
  );
  return key ? PAGE_META[key] : { title: "Dashboard" };
}

export function AppHeader() {
  const pathname = usePathname();
  const meta = getBreadcrumb(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
      {/* Left: page title */}
      <h2 className="text-sm font-semibold text-gray-900">{meta.title}</h2>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Contextual CTA */}
        {meta.action && (
          <Link
            href={meta.action.href}
            className="rounded-lg bg-[#C8102E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]"
          >
            {meta.action.label}
          </Link>
        )}

        {/* Notification bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M9 1.5a5 5 0 015 5v3l1.5 2.5H2.5L4 9.5v-3a5 5 0 015-5z" />
            <path d="M7 14.5a2 2 0 004 0" />
          </svg>
          {/* Unread dot */}
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
        </button>

        {/* User avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
          MT
        </button>
      </div>
    </header>
  );
}
