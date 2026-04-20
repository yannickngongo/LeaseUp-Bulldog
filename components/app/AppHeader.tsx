"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "@/components/ThemeProvider";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

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
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const key = Object.keys(PAGE_META).find(
    (k) => k !== "/dashboard" && pathname.startsWith(k)
  );
  return key ? PAGE_META[key] : { title: "Dashboard" };
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

export function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const meta = getBreadcrumb(pathname);
  const { theme, toggle } = useTheme();
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(j => {
          const name = j.operator?.name ?? email.split("@")[0];
          setInitials(name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
        })
        .catch(() => setInitials(email[0]?.toUpperCase() ?? "?"));
    });
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 dark:border-white/5 dark:bg-[#12141E] lg:px-6">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
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
        {/* Contextual CTA */}
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
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M9 1.5a5 5 0 015 5v3l1.5 2.5H2.5L4 9.5v-3a5 5 0 015-5z" />
            <path d="M7 14.5a2 2 0 004 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
        </button>

        {/* User avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white dark:bg-white/10 dark:text-gray-100">
          {initials}
        </button>
      </div>
    </header>
  );
}
